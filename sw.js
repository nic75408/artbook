/* 艺术手册 Service Worker（SPE §7.7）
 * App Shell：network-first，失败回缓存
 * data/*.json：stale-while-revalidate
 * 跨域博物馆图片：不拦截不缓存（依赖浏览器 HTTP 缓存）
 */
const CACHE_APP = "artbook-app-v1";
const DATA_RE = /\/data\//;

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
  "./js/sw-reg.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_APP)
      .then((c) => c.addAll(APP_SHELL))
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
    // 数据：先出缓存秒开，后台刷新
    e.respondWith(
      caches.open(CACHE_APP).then(async (cache) => {
        const cached = await cache.match(req);
        const refresh = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    // 导航：network-first，离线回 index.html 缓存；再无缓存 → 离线页
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_APP).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(async () => {
          const c = await caches.open(CACHE_APP);
          return (await c.match("./index.html")) || c.match("./offline.html");
        })
    );
    return;
  }

  // 其余同源静态资源：network-first，回缓存
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
