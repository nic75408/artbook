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
