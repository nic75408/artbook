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
  return `<img src="${BrandEmblemDataUri}" alt="艺术手册" width="36" height="36" style="display:block"/>`;
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

// Brand Lockup（t_e05a68be：赤拔反馈"去掉印章 icon，只留文字"，定稿方案 C - LXGW WenKai）
// 曾在 t_29588b3e/t_b6d76c90 定稿过双层方框印章 emblem；用户 iPhone 实测
// 后认为方形印章视觉上跟画作画框争夺焦点，且"艺术手册"四个字自身书法韵味
// 已经足够承担识别度。现在 lockup 只输出 wordmark，字体走本地打包 LXGW
// WenKai Lite Light（fonts/lxgw-wenkai-lite-brand.woff2，只子集品牌四字 1.6KB）。
// 保留 emblem 相关导出 API 以便未来场景复用（如启动动画、favicon 变体）。
// DESIGN.md components.brand-lockup: kind=text-only, align=left, gap=0
// DESIGN.md typography.brand-wordmark: LXGW WenKai Lite 24px/300 letterSpacing 0.18em
// Usage: import { BrandLockup } from './icons/BrandEmblem.js';
//        BrandLockup()                       // 默认「艺术手册」
//        BrandLockup({ label: '艺术手册' })   // 显式指定文案
export function BrandLockup({ label = "艺术手册" } = {}) {
  const safeLabel = String(label).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  return `<span class="brand-lockup__wordmark">${safeLabel}</span>`;
}
