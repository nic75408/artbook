// SW 注册 + 版本探针（t_3342ced5）
// 加载后以 no-cache 拉取 version.json，与上次记录比对：
// 变化 → 清空内存数据缓存 + 通知 SW 后台刷新 Cache Storage，全程不打断当前浏览。
import { invalidateAll } from "./data.js";

const VERSION_KEY = "artbook.version";
const VERSION_PENDING_KEY = "artbook.version.pending";
const VERSION_URL = "version.json";

export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  
  // iOS PWA 修复：立即注册 SW，不要等 load 事件
  // iOS 从主屏幕启动时，load 事件可能延迟或不触发
  const swUrl = "sw.js";
  
  navigator.serviceWorker.register(swUrl, { scope: "./" })
    .then((registration) => {
      console.log("[SW] Registered:", registration.scope);
      // 页面加载完成后探针版本
      if (document.readyState === "complete") {
        probeVersion();
      } else {
        window.addEventListener("load", () => probeVersion());
      }
    })
    .catch((err) => {
      console.log("[SW] Registration failed:", err);
    });
  
  // 监听 SW 激活，确保新 SW 接管
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("[SW] Controller changed - page will reload");
  });
}

async function probeVersion() {
  let current = null;
  try {
    const res = await fetch(VERSION_URL, { cache: "no-cache" });
    if (!res.ok) return;
    current = (await res.json()).version;
  } catch {
    return; // 离线/网络失败：探针静默，不打扰用户
  }
  if (!current) return;

  let prev = null;
  try {
    prev = localStorage.getItem(VERSION_KEY);
  } catch {
    /* 隐私模式：无法记录版本，跳过 */
  }

  if (prev === current) {
    // 版本未变；若上次刷新未确认（SW 刚接管），补发一次
    if (isPending()) notifySW(current);
    return;
  }

  try {
    localStorage.setItem(VERSION_KEY, current);
    localStorage.setItem(VERSION_PENDING_KEY, "1");
  } catch {
    /* 隐私模式 */
  }

  invalidateAll(); // 清内存缓存：下次交互即拉取最新数据
  notifySW(current);
}

function isPending() {
  try {
    return localStorage.getItem(VERSION_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

function notifySW(version) {
  const send = () => {
    const c = navigator.serviceWorker.controller;
    if (!c) return false;
    c.postMessage({ type: "VERSION_CHANGED", version });
    return true;
  };
  send();
  // 若消息发给了旧 SW（无该处理器）或 SW 尚未接管：
  // 等 controllerchange（新 SW 接管）且刷新仍未确认时补发一次
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => {
      if (isPending()) send(); // 确认由 SW 的 VERSION_REFRESHED 回执负责
    },
    { once: true }
  );
}

// SW 后台刷新完成回执 → 清 pending 标记
navigator.serviceWorker?.addEventListener("message", (e) => {
  if (e.data && e.data.type === "VERSION_REFRESHED") clearPending();
});

function clearPending() {
  try {
    localStorage.removeItem(VERSION_PENDING_KEY);
  } catch {
    /* 隐私模式 */
  }
}
