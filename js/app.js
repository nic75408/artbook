// 入口（SPE §7.1）：注册路由 + SW
// iOS PWA 修复：立即注册 SW，不要等 load 事件
//
// 首屏关键路径（t_a450af65）：本文件只静态 import 首屏真正需要的东西。
// detail / favorites 是「用户还没去的页面」的代码，静态 import 会让它们的下载
// 挤进首屏关键路径——实测它们比首屏数据请求还晚完成，把 feed 的 index.json
// 请求硬生生往后推了 240ms。改为按需 dynamic import，并在空闲时后台预取。
import { registerSW } from "./sw-reg.js";
import { initRouter, register } from "./router.js";
import { mount as feed } from "./feed.js";
import { preloadIcons } from "./icons/Icon.js";

// 路由级懒加载：首次进入该路由时才下载对应模块。
// 模块本身会被浏览器缓存，二次导航无额外开销。
const lazy = (loader) => async (el, params) => {
  const mod = await loader();
  return mod.mount(el, params);
};

const loadDetail = () => import("./detail.js");
const loadFavorites = () => import("./favorites.js");

function initApp() {
  register(/^\/$/, { mount: feed });
  register(/^\/work\/(?<id>[^/]+)$/, { mount: lazy(loadDetail) });
  register(/^\/artist\/(?<aid>[^/]+)$/, { mount: (el, p) => mountArtist(el, p.aid) });
  register(/^\/tag\/(?<tag>.+)$/, { mount: (el, p) => mountTag(el, decodeURIComponent(p.tag)) });
  register(/^\/favs$/, { mount: lazy(loadFavorites) });

  initRouter();

  // 首屏渲染完成后的空闲时间里做两件事，都不得阻塞首屏：
  //   1. 后台预取详情页/收藏页模块 —— 用户点进去时代码已在本地
  //   2. 补齐其余关键图标（首屏用到的那几个已内联在 js/icons/inline.js）
  const warm = () => {
    loadDetail().catch(() => {});
    loadFavorites().catch(() => {});
    preloadIcons().catch(() => {});
  };
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 2000 });
  else setTimeout(warm, 0);
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
