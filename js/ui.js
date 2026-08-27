// 共享 UI 小件：toast、内联图标（Set A - Outline Museum, ICON-SPEC.md）、DOM 工具
// 向后兼容：保留原有 icons 对象，同时提供新 Icon 组件
import { Icon, preloadIcons, loadIconSVG } from './icons/Icon.js';

export function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.remove("show");
    t.hidden = true;
  }, 2200);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// 向后兼容的 icons 对象 — 使用新 Icon 组件生成
// 注意：这些是同步生成的，需要确保 preloadIcons() 已调用
export const icons = {
  // 收藏夹使用书签图标：空心（未收藏）/实心（已收藏）
  get bookmark() { return Icon('action-bookmark-outline', { size: 16, hidden: true }) || '<svg class="icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'; },
  get bookmarkFilled() { return Icon('action-bookmark-filled', { size: 16, hidden: true }) || '<svg class="icon icon-filled" viewBox="0 0 24 24"><path fill="currentColor" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'; },
  get star() { return Icon('action-favorite-outline', { size: 16, hidden: true }) || '<svg class="icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'; },
  get chevronDown() { return Icon('nav-chevron-down', { size: 16, hidden: true }) || '<svg class="icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>'; },
  get chevronLeft() { return Icon('nav-back', { size: 16, hidden: true }) || '<svg class="icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>'; },
  get x() { return Icon('nav-close', { size: 16, hidden: true }) || '<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'; },
  get external() { return Icon('action-external', { size: 12, hidden: true }) || '<svg class="icon" viewBox="0 0 24 24" style="width:12px;height:12px;display:inline;vertical-align:-1px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'; },
};

// 新 Icon 组件导出
export { Icon, preloadIcons, loadIconSVG };

export function learnBtnSVG(id) {
  const pid = `lp-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  const circumference = (2 * Math.PI * 40).toFixed(1);
  return `<svg viewBox="0 0 96 96" aria-hidden="true">
    <g class="ring-rotor">
      <defs><path id="${pid}" d="M 48,48 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0"/></defs>
      <text class="ring-text"><textPath href="#${pid}" textLength="${circumference}" lengthAdjust="spacingAndGlyphs">了解更多 · 了解更多 · 了解更多</textPath></text>
    </g>
    <circle class="ring-path" cx="48" cy="48" r="33"/>
    <path class="arrow" d="M 42 38 l 12 10 -12 10"/>
  </svg>`;
}
