// 入口（SPE §7.1）：注册路由 + SW
// iOS PWA 修复：立即注册 SW，不要等 load 事件
import { registerSW } from "./sw-reg.js";
import { initRouter, register } from "./router.js";
import { mount as feed } from "./feed.js";
import { mount as detail } from "./detail.js";
import { mount as favs } from "./favorites.js";
import { preloadIcons } from "./ui.js";

// 预加载关键图标，确保首屏渲染不闪烁
preloadIcons().catch(() => { /* 图标加载失败不影响主流程 */ });

register(/^\/$/, { mount: feed });
register(/^\/work\/(?<id>[^/]+)$/, { mount: detail });
register(/^\/artist\/(?<aid>[^/]+)$/, { mount: (el, p) => mountArtist(el, p.aid) });
register(/^\/tag\/(?<tag>.+)$/, { mount: (el, p) => mountTag(el, decodeURIComponent(p.tag)) });
register(/^\/favs$/, { mount: favs });

initRouter();
registerSW();

// iOS PWA 错误处理：捕获未处理的 Promise rejection
window.addEventListener("unhandledrejection", (e) => {
  console.log("[App] Unhandled rejection:", e.reason);
  // 不阻止默认行为，让错误在控制台显示
});

// iOS PWA 错误处理：捕获全局错误
window.addEventListener("error", (e) => {
  console.log("[App] Global error:", e.message, "at", e.filename, ":", e.lineno);
});
