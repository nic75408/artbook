// 共享 UI 小件：toast、内联图标（Feather 线性风格，stroke 1.5，SPE §7.2）、DOM 工具
// 重新导出 Icon 组件以便 feed.js 等文件使用
export { Icon } from './icons/Icon.js';
export { preloadIcons } from './icons/Icon.js';
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

export const icons = {
  star: '<svg class="icon" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  // 收藏夹统一使用书签图标：空心（未收藏）/实心（已收藏），语义清晰，与星标区分
  bookmark: '<svg class="icon" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  bookmarkFilled: '<svg class="icon icon-filled" viewBox="0 0 24 24"><path fill="currentColor" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
  download: '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  chevronDown: '<svg class="icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>',
  chevronLeft: '<svg class="icon" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  external: '<svg class="icon" viewBox="0 0 24 24" style="width:12px;height:12px;display:inline;vertical-align:-1px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
};

export function learnBtnSVG(id) {
  const pid = `lp-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  const circumference = (2 * Math.PI * 40).toFixed(1);
  return `<svg viewBox="0 0 96 96" aria-hidden="true">
    <g class="ring-rotor">
      <defs><path id="${pid}" d="M 48,48 m -40,0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0"/></defs>
      <text class="ring-text"><textPath href="#${pid}" textLength="${circumference}" lengthAdjust="spacingAndGlyphs">了解更多 · 了解更多 · 了解更多</textPath></text>
    </g>
    <circle class="ring-path" cx="48" cy="48" r="33"/>
    <!-- 箭头：以 (48,48) 为中心，箭头从左侧指向右侧 -->
    <path class="arrow" d="M 40 42 l 12 6 -12 6"/>
  </svg>`;
}
