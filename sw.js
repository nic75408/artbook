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
 */
const CACHE_APP = "artbook-app-v1";
const DATA_RE = /\/data\//;
const CORE_DATA = ["./data/index.json", "./data/catalog.json", "./data/artists.json"];

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

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_APP)
      // no-cache 拉 shell：避免安装时把 HTTP 缓存里的旧 HTML/CSS/JS 存进 Cache Storage
      .then((c) => c.addAll(APP_SHELL.map((u) => new Request(u, { cache: "no-cache" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 跨域图片等一律放行，SW 不缓存

  if (DATA_RE.test(url.pathname)) {
    e.respondWith(swrData(req));
    return;
  }

  if (req.mode === "navigate") {
    // 导航：network-first + ETag 协商；离线回 index.html 缓存；再无 → 离线页
    e.respondWith(
      networkFirst(req, "./index.html").then((res) => {
        if (res && res.ok) return res;
        return caches.match("./offline.html");
      })
    );
    return;
  }

  // 其余同源静态资源：network-first + ETag 协商，失败回缓存
  e.respondWith(networkFirst(req));
});

// 页面探针发现版本变化 → 后台刷新数据缓存；完成后回执确认
self.addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg || msg.type !== "VERSION_CHANGED") return;
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
});
