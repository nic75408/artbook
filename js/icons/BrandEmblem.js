// Brand Emblem — Graphic Seal (方案 B 定稿)
// Double-square emblem with top-right dot, abstract "艺" seal imagery
// Pure SVG, zero font dependency, perfect offline support

export const BrandEmblemSVG = `
<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Outer frame: 36x36, 2px stroke, 4px radius -->
  <rect x="1" y="1" width="34" height="34" rx="4" stroke="#8C6D3F" stroke-width="2"/>
  <!-- Inner frame: 20x20, 1px stroke, 2px radius, centered -->
  <rect x="7" y="7" width="20" height="20" rx="2" stroke="#8C6D3F" stroke-width="1"/>
  <!-- Top-right dot: 4px radius, positioned at (30, 6) -->
  <circle cx="30" cy="6" r="2" fill="#8C6D3F"/>
</svg>
`.trim();

export const BrandEmblemDataUri = `data:image/svg+xml,${encodeURIComponent(BrandEmblemSVG)}`;

// Inline <img> src
export function BrandEmblemImg() {
  return `<img src="${BrandEmblemDataUri}" alt="Art Daily" width="36" height="36" style="display:block"/>`;
}

// Inline SVG element (no data URI overhead)
export function BrandEmblemInline() {
  return `
<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
  <rect x="1" y="1" width="34" height="34" rx="4" stroke="#8C6D3F" stroke-width="2"/>
  <rect x="7" y="7" width="20" height="20" rx="2" stroke="#8C6D3F" stroke-width="1"/>
  <circle cx="30" cy="6" r="2" fill="#8C6D3F"/>
</svg>
`.trim();
}

// Brand Lockup
// 历史：t_29588b3e/t_b6d76c90 定稿双层方框印章 emblem；t_e05a68be 移除印章
// （赤拔认为方形印章跟画作画框争夺焦点，改为纯 LXGW WenKai Lite 文字）；
// t_5206fd7f (2026-09-03) 视觉质感升级为书法印刷雕版风，新增副标题「每日艺术」，
// 定稿方案 B · Ink Rubbing —— Cormorant SC 石刻碑帖 SC 600 22px letterSpacing 0.14em
// + SVG feTurbulence displacement filter 施加飞白 / 墨迹磨损 / 边缘不齐三种雕版特征。
// 副标题金色 Songti SC 10px 700 letterSpacing 0.5em「每 日 艺 术」。
// 保留 BrandEmblemInline / BrandEmblemImg 导出 API 以备未来 splash / favicon 复用。
//
// DESIGN.md components.brand-lockup: kind=text+sub, align=left, gap=6px
// DESIGN.md typography.brand-wordmark: Cormorant SC 22px/600 letterSpacing 0.14em, filter=ink-rubbing
// DESIGN.md typography.brand-subwordmark: Songti SC 10px/700 letterSpacing 0.5em color=gold
//
// Usage:
//   import { BrandLockup } from './icons/BrandEmblem.js';
//   BrandLockup()                                          // 默认「Art Daily / 每 日 艺 术」
//   BrandLockup({ label: 'Art Daily', sub: '每 日 艺 术' })  // 显式指定文案
//   BrandLockup({ label: 'Art Daily', sub: null })         // 仅字标（空态里可能用）
export function BrandLockup({ label = "Art Daily", sub = "每 日 艺 术" } = {}) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const safeLabel = esc(label);
  const subHtml = sub ? `<span class="brand-lockup__sub">${esc(sub)}</span>` : "";
  return `<span class="brand-lockup__wordmark">${safeLabel}</span>${subHtml}`;
}
