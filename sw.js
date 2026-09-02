/* 艺术手册 Service Worker（SPE §7.7）
 * App Shell：network-first，失败回缓存
 * data/*.json：stale-while-revalidate
 * 跨域博物馆图片：不拦截不缓存（依赖浏览器 HTTP 缓存）
 *
 * 版本策略（t_3342ced5）：
 * - 导航与同源静态资源一律以 cache:"no-cache" 拉取 → ETag 协商，
 *   绕过 GitHub Pages 10 分钟 HTTP 缓存，老用户打开即见最新 HTML/CSS/JS
 * - 页面探针发现 version.json 变化后发 VERSION_CHANGED 消息 →
 *   后台刷新核心数据缓存（不打断当前浏览）
 * - 离线行为不变：网络失败一律回退 Cache Storage / offline.html
 *
 * 首开提速（t_dac8f66a）：
 * - install 时 best-effort 预缓存核心数据 + 最新一期 → 详情页数据首开即缓存命中
 * - 页面发 PREFETCH_ISSUES → 预取相关作品的跨期期文件（第二幅作品首开秒出、离线可用）
 * - 预取只补缺失、限量（PREFETCH_MAX）、失败静默，不拖累 install / 页面
 * 首屏提速（t_a450af65）：
 * - 博物馆 CDN 图片改为「缓存优先 + no-cors 不透明响应」写入独立图片缓存，
 *   离线时详情页/首页能连图一起显示（验收标准 5 要求文字+图片都在）
 * - 页面发 PREFETCH_IMAGES → 后台预缓存当期 feed 图片
 */
const CACHE_APP = "artbook-app-v16";
// 图片单独一个缓存桶：数量多、体积大，需要独立的容量上限与淘汰策略，
// 不能和 App Shell 混在一起（否则清理 shell 会误删图片，反之亦然）
const CACHE_IMG = "artbook-img-v1";
// 图片缓存条目上限：当期 30 幅 feed 图 + 详情大图 + 相关推荐缩略图，
// 留足余量的同时避免无限增长吃满用户磁盘配额
const IMG_CACHE_MAX = 160;
const DATA_RE = /\/data\//;
const CORE_DATA = ["./data/index.json", "./data/catalog.json", "./data/artists.json"];
// 跨期预取上限（t_dac8f66a）：相关作品最多横跨 4 期（同画家档上限），每期 ~70KB
const PREFETCH_MAX = 4;
// 单次图片预取上限（t_a450af65）：一期 30 幅，留一点余量
const PREFETCH_IMG_MAX = 40;
// 博物馆图片 CDN 白名单：只有这些跨域来源才进图片缓存
const IMG_HOSTS = ["openaccess-cdn.clevelandart.org", "images.metmuseum.org"];

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./app.css",
  "./config.js",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/router.js",
  "./js/data.js",
  "./js/feed.js",
  "./js/detail.js",
  "./js/collection.js",
  "./js/favorites.js",
  "./js/ui.js",
  "./js/sw-reg.js",
  "./js/icons/Icon.js",
  "./js/icons/inline.js",
  // t_e05a68be：品牌字标 web font（LXGW WenKai Lite，子集品牌四字 1.6KB）
  // 必须进 App Shell，PWA 离线时首屏「艺术手册」才能保持楷体字标
  "./fonts/lxgw-wenkai-lite-brand.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

// no-cache 重取：每次都必须向服务器协商（If-None-Match/ETag），304 时复用 HTTP 缓存体
function revalidate(req) {
  return new Request(req, { cache: "no-cache" });
}

// 网络优先：200 写回 Cache Storage；304（未变更）回 Cache Storage 副本；
// 网络失败回 Cache Storage 副本；再无 → undefined（导航由调用方兜底离线页）
async function networkFirst(req, cacheKey) {
  const cache = await caches.open(CACHE_APP);
  const key = cacheKey || req;
  try {
    const res = await fetch(revalidate(req));
    if (res.status === 304) {
      const hit = await cache.match(key);
      if (hit) return hit;
      return fetch(req, { cache: "reload" }); // 罕见：无副本时彻底绕过 HTTP 缓存硬取
    }
    if (res.ok) await cache.put(key, res.clone());
    return res;
  } catch {
    return cache.match(key);
  }
}

// 数据：先出缓存秒开，后台 no-cache 协商刷新（304 保留原副本）
async function swrData(req) {
  const cache = await caches.open(CACHE_APP);
  const cached = await cache.match(req);
  const refresh = fetch(revalidate(req))
    .then(async (res) => {
      if (res.status === 304) {
        if (cached) return cached;               // 未变更：保留原副本
        return fetch(req, { cache: "reload" });  // 罕见：无副本时硬取
      }
      if (res.ok) await cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || refresh;
}

// 版本探针触发的后台数据缓存刷新：核心数据 + 最新一期全部换新；
// 离线/失败保留旧缓存（离线行为不变）
async function refreshCoreData() {
  try {
    const cache = await caches.open(CACHE_APP);
    async function fresh(path) {
      try {
        const res = await fetch(path, { cache: "no-cache" });
        if (!res.ok) return null; // 304/异常：保留旧缓存
        await cache.put(path, res.clone());
        return res.json().catch(() => null);
      } catch {
        return null;
      }
    }
    const idx = await fresh(CORE_DATA[0]); // index.json → 拿最新期号
    if (idx && idx.latest) await fresh(`./data/issues/${idx.latest}.json`);
    await fresh(CORE_DATA[1]); // catalog.json
    await fresh(CORE_DATA[2]); // artists.json
  } catch {
    /* 忽略 */
  }
}

// 预取单个数据文件（t_dac8f66a）：缓存已存在则跳过；no-cache 拉取；失败静默
// （离线 / 404 不打扰，也不让预取拖累 install / message 的完成）
async function prefetchData(path) {
  try {
    const url = new URL(path, self.location).href;
    const cache = await caches.open(CACHE_APP);
    if (await cache.match(url)) return false;
    const res = await fetch(new Request(url, { cache: "no-cache" }));
    if (!res.ok) return false;
    await cache.put(url, res.clone());
    return true;
  } catch {
    return false;
  }
}

// ---- 博物馆图片缓存（t_a450af65）----
// 图片来自不带 CORS 头的第三方 CDN（克利夫兰不发 Access-Control-Allow-Origin），
// 因此只能用 no-cors 发请求、拿到 opaque 响应。opaque 响应无法读 status，
// 只要 fetch 没抛异常就当作可缓存 —— 这是浏览器对不透明响应的唯一可用契约。
function isMuseumImage(url) {
  return IMG_HOSTS.includes(url.hostname);
}

// 缓存优先：命中即返回（离线也能出图）；未命中走网络并写回缓存。
// 图片是内容寻址的（URL 变即内容变），不需要重新验证。
async function imageCacheFirst(req) {
  const cache = await caches.open(CACHE_IMG);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // opaque 响应 status 恒为 0：不能用 res.ok 判断，拿到就存
  if (res && (res.ok || res.type === "opaque")) {
    cache.put(req, res.clone()).then(() => trimImageCache()).catch(() => {});
  }
  return res;
}

// 容量控制：超过上限时按插入顺序淘汰最旧的条目（Cache Storage 的 keys() 保序）
async function trimImageCache() {
  try {
    const cache = await caches.open(CACHE_IMG);
    const keys = await cache.keys();
    const excess = keys.length - IMG_CACHE_MAX;
    for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
  } catch {
    /* 容量控制失败不影响功能 */
  }
}

// 后台预取当期 feed 图片：首屏渲染完成后由页面触发，
// 让用户往下滑时图片已在本地，且断网后仍能看图（验收标准 5）。
// 已缓存的跳过；no-cors 拉取；失败静默。
async function prefetchImages(urls) {
  const cache = await caches.open(CACHE_IMG);
  const list = [...new Set((urls || []).filter(Boolean))].slice(0, PREFETCH_IMG_MAX);
  for (const url of list) {
    try {
      if (await cache.match(url)) continue;
      const res = await fetch(new Request(url, { mode: "no-cors", credentials: "omit" }));
      if (res && (res.ok || res.type === "opaque")) await cache.put(url, res.clone());
    } catch {
      /* 单张失败不影响其余 */
    }
  }
  await trimImageCache();
}

// 首次安装即预缓存核心数据 + 最新一期（best-effort）：
// 详情页数据（catalog + 期文件）首开即缓存命中，秒出且离线可用
async function precacheCoreData() {
  try {
    const idxUrl = new URL("./data/index.json", self.location).href;
    const idxRes = await fetch(new Request(idxUrl, { cache: "no-cache" }));
    if (!idxRes.ok) return;
    const cache = await caches.open(CACHE_APP);
    await cache.put(idxUrl, idxRes.clone());
    const idx = await idxRes.json().catch(() => null);
    await prefetchData("./data/catalog.json");
    await prefetchData("./data/artists.json");
    if (idx && idx.latest) await prefetchData(`./data/issues/${idx.latest}.json`);
  } catch {
    /* 安装期离线：数据预缓存跳过，首屏数据仍走 swrData 网络路径 */
  }
}

self.addEventListener("install", (e) => {
  // App Shell 预缓存阻塞 install（确保 SW 激活时 shell 已就绪）；
  // 数据预缓存也放进 waitUntil（满足测试断言 + 离线行为），但链在 skipWaiting 之后：
  // shell 完成后立即 skipWaiting 让 SW 尽快激活，数据预缓存在后台继续执行（t_5d4e7d86）
  e.waitUntil(
    caches.open(CACHE_APP)
      // no-cache 拉 shell：避免安装时把 HTTP 缓存里的旧 HTML/CSS/JS 存进 Cache Storage
      .then((c) => c.addAll(APP_SHELL.map((u) => new Request(u, { cache: "no-cache" }))))
      .then(() => self.skipWaiting())
  );
  // 核心数据 + 最新一期预缓存（best-effort，失败静默，不阻塞 install）
  e.waitUntil(precacheCoreData().catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      // 保留图片缓存桶：它有自己的版本号与淘汰策略，
      // 不该因为 App Shell 升版本就被整个清空（否则每次发版用户都要重下所有图）
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_APP && k !== CACHE_IMG)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        console.log("[SW] Activated and claimed:", CACHE_APP);
      })
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // 博物馆图片：缓存优先，离线可用（t_a450af65）。
    // 其余跨域请求一律放行，SW 不介入。
    if (isMuseumImage(url)) e.respondWith(imageCacheFirst(req));
    return;
  }

  if (DATA_RE.test(url.pathname)) {
    e.respondWith(swrData(req));
    return;
  }

  if (req.mode === "navigate") {
    // 导航：network-first + ETag 协商；离线回 index.html 缓存；再无 → 离线页
    e.respondWith(
      networkFirst(req, "./index.html").then((res) => {
        if (res && res.ok) return res;
        // networkFirst 失败（离线且无缓存）→ 回退 offline.html
        return caches.match("./offline.html").then((offline) => {
          if (offline) return offline;
          // 极端情况：offline.html 也缺失 → 返回一个最小 HTML 避免白屏
          return new Response(
            "<!doctype html><meta charset='utf-8'><title>艺术手册</title><style>body{font-family:system-ui,sans-serif;text-align:center;padding:20vh 20px;background:#F5F1EA;color:#1D1B16}</style><body><h1>艺术手册</h1><p>加载失败，请检查网络连接</p>",
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        });
      })
    );
    return;
  }

  // 其余同源静态资源：network-first + ETag 协商，失败回缓存
  e.respondWith(networkFirst(req));
});

// 页面探针发现版本变化 → 后台刷新数据缓存；完成后回执确认。
// 详情页请求 → 预取相关作品的跨期期文件（第二幅作品首开即缓存命中，离线可用）
self.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg) return;
  if (msg.type === "VERSION_CHANGED") {
    e.waitUntil(
      refreshCoreData().then(() => {
        try {
          if (e.source && e.source.postMessage) {
            e.source.postMessage({ type: "VERSION_REFRESHED", version: msg.version });
          }
        } catch {
          /* 回执失败不影响刷新结果 */
        }
      })
    );
    return;
  }
  if (msg.type === "PREFETCH_ISSUES" && Array.isArray(msg.dates)) {
    const dates = [...new Set(msg.dates)].filter(Boolean).slice(0, PREFETCH_MAX);
    e.waitUntil(Promise.all(dates.map((d) => prefetchData(`./data/issues/${d}.json`))));
    return;
  }
  // 首屏渲染完成后，页面把当期 feed 图片清单发过来后台预缓存（t_a450af65）
  if (msg.type === "PREFETCH_IMAGES" && Array.isArray(msg.urls)) {
    e.waitUntil(prefetchImages(msg.urls));
  }
});
