// 入口（SPE §7.1）：注册路由 + SW
// iOS PWA 修复：立即注册 SW，不要等 load 事件
import { registerSW } from "./sw-reg.js";
import { initRouter, register } from "./router.js";
import { mount as feed } from "./feed.js";
import { mount as detail } from "./detail.js";
import { mount as favs } from "./favorites.js";
import { preloadIcons } from "./ui.js";

// iOS PWA 关键修复：等待 DOM 就绪后再初始化路由
// iOS PWA 从主屏幕启动时，模块执行时机可能早于 DOM 构建完成
async function initApp() {
  // 预加载关键图标，等待完成后再渲染首屏，避免占位圆圈
  await preloadIcons();

  register(/^\/$/, { mount: feed });
  register(/^\/work\/(?<id>[^/]+)$/, { mount: detail });
  register(/^\/artist\/(?<aid>[^/]+)$/, { mount: (el, p) => mountArtist(el, p.aid) });
  register(/^\/tag\/(?<tag>.+)$/, { mount: (el, p) => mountTag(el, decodeURIComponent(p.tag)) });
  register(/^\/favs$/, { mount: favs });

  initRouter();
}

// 立即注册 SW（不阻塞页面），但路由初始化要等 DOM 就绪
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

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
