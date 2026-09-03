// 极简 hash 路由（SPE §7.1）：栈式历史，返回一律 history.back()。
// iOS standalone 依赖真实 history 栈（边缘右滑返回）。
const routes = new Map(); // pattern(RegExp) -> view {mount, unmount?}
const stack = [];
let current = null;

export function register(pattern, view) {
  routes.set(pattern, view);
}

export function navigate(hash) {
  if (location.hash === hash) return;
  location.hash = hash; // 触发 hashchange，统一走 handler
}

// t_b944f6c5 §3.1：folio 上下文桥（收藏夹/相关推荐/聚合页 → 详情页），
// navigate 到 #/work/<id> 前的最后一行写入，detail.js mount() 读取后即清。
const FOLIO_CTX_KEY = "artbook.folioCtx";
export function writeFolioCtx(ctx) {
  try {
    sessionStorage.setItem(FOLIO_CTX_KEY, JSON.stringify(ctx));
  } catch {
    /* 隐私模式，忽略——回退到详情页默认 feed 语义 */
  }
}
export function readFolioCtx() {
  try {
    const raw = sessionStorage.getItem(FOLIO_CTX_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FOLIO_CTX_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function back() {
  history.back();
}

function parse(hash) {
  const h = (hash || "#/").replace(/^#/, "");
  for (const [pat, view] of routes) {
    const m = h.match(pat);
    if (m) {
      return { view, params: m.groups || {} };
    }
  }
  return null;
}

function render(entry) {
  const main = document.getElementById("view");
  main.innerHTML = "";
  main.classList.remove("enter");
  void main.offsetWidth; // reflow 以重启动画
  entry.view.mount(main, entry.params);
  main.classList.add("enter");
}

function handle() {
  const h = location.hash || "#/";
  const top = stack[stack.length - 1];
  if (h === top) return;           // 重复设置，忽略
  const prev = stack[stack.length - 2];
  if (prev !== undefined && h === prev) {
    stack.pop();                   // 后退
  } else {
    stack.push(h);
  }
  const entry = parse(h);
  if (!entry) {
    location.replace("#/");
    return;
  }
  current = entry;
  render(entry);
}

export function currentView() {
  return current;
}

export function initRouter() {
  window.addEventListener("hashchange", handle);
  if (!location.hash) {
    location.replace("#/");
  } else {
    handle();
  }
}
