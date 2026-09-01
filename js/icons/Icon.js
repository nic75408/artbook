// Icon Component — Set A: Outline Museum
// Usage: import { Icon } from './icons/Icon.js';
//        Icon('nav-home', { size: 24, class: 'my-icon' })
//        Returns inline SVG string for template injection

import { INLINE_ICON_SVG } from "./inline.js";

// 首屏零请求（t_a450af65）：UI 同步渲染路径用到的图标在模块求值时就已在缓存里，
// Icon() 首次调用即命中真身，不会返回占位圆圈，也不需要任何网络往返。
// 其余图标仍按需 fetch（走下面的 loadIconSVG）。
const ICON_CACHE = new Map(Object.entries(INLINE_ICON_SVG));

// Load SVG content from file (cached)
async function loadIconSVG(name) {
  // Map alias to actual filename (e.g., 'nav-home' → 'nav-home-outline')
  const fileName = ICON_MAP[name] || name;
  
  // Check cache using fileName (real filename) for consistency
  if (ICON_CACHE.has(fileName)) {
    return ICON_CACHE.get(fileName);
  }
  
  try {
    // Use relative path to work on all deployment paths (e.g. /artbook/, /work/123)
    const response = await fetch(`icons/svg/${fileName}.svg`);
    if (!response.ok) throw new Error(`Icon "${name}" (${fileName}.svg) not found`);
    const svg = await response.text();
    // Cache using fileName (real filename) so getIconSVG can find it
    ICON_CACHE.set(fileName, svg);
    return svg;
  } catch (e) {
    console.warn(`Icon load error: ${name} — ${e.message}`);
    // Return placeholder for missing icons
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`;
  }
}

// 首屏之后可能用到的图标预热清单。
// 注意：这里只该放「UI 真的会用到、但没内联」的图标。
// 原先这份清单有 11 个，其中 7 个全站没有任何 Icon() 调用引用——
// 纯粹白白发 7 个请求、占满 HTTP/1.1 连接数（t_a450af65）。
// 目前 UI 用到的图标已全部内联（见 js/icons/inline.js），
// 故本清单为空，preloadIcons() 自然成为零请求的空操作。
// 将来新增 Icon() 调用时，tests/icons-inline-sync.test.mjs 会要求把它加进内联清单。
const CRITICAL_ICONS = [];

// 后台预热剩余关键图标（t_a450af65）。
// 已内联的图标直接跳过；调用方不应 await 本函数——它只是为「稍后可能用到」的
// 图标暖缓存，首屏渲染绝不能挂在它上面（那正是原先白屏 400ms 的成因）。
export async function preloadIcons() {
  const pending = CRITICAL_ICONS.filter((name) => !ICON_CACHE.has(ICON_MAP[name] || name));
  await Promise.all(pending.map((name) => loadIconSVG(name).catch(() => null)));
}

// Synchronous icon lookup (for use after preload)
function getIconSVG(name) {
  return ICON_CACHE.get(name) || null;
}

// Icon configuration mapping (name → file base)
const ICON_MAP = {
  // Navigation
  'nav-home': 'nav-home-outline',
  'nav-back': 'nav-back-outline',
  'nav-close': 'nav-close-outline',
  'nav-more': 'nav-more-outline',
  'nav-search': 'nav-search-outline',
  // 'nav-filter': 'nav-filter-outline',  // Reserved for future use
  'nav-chevron-down': 'nav-chevron-down-outline',
  
  // Actions
  'action-favorite-outline': 'action-favorite-outline',
  'action-favorite-filled': 'action-favorite-filled',
  'action-bookmark-outline': 'action-bookmark-outline',
  'action-bookmark-filled': 'action-bookmark-filled',
  'action-download': 'action-download-outline',
  'action-share': 'action-share-outline',
  'action-external': 'action-external-outline',
  
  // States
  'state-loading': 'state-loading-outline',
  'state-error': 'state-error-outline',
  'state-empty': 'state-empty-outline',
  'state-offline': 'state-offline-outline',
  
  // Views
  'view-list': 'view-list-outline',
  'view-grid': 'view-grid-outline',
  'view-timeline': 'view-timeline-outline',
  'view-map': 'view-map-outline',
  
  // Info labels
  'info-artist': 'info-artist-outline',
  'info-date': 'info-date-outline',
  'info-medium': 'info-medium-outline',
  'info-size': 'info-size-outline',
  'info-museum': 'info-museum-outline',
};

/**
 * Generate icon HTML string
 * @param {string} name - Icon name (e.g., 'nav-home', 'action-bookmark-filled')
 * @param {Object} options
 * @param {number} [options.size=24] - Icon size in px (16/24/32)
 * @param {string} [options.class=''] - Additional CSS classes
 * @param {string} [options.label=''] - aria-label for accessibility
 * @param {boolean} [options.hidden=true] - Hide from screen readers (decorative)
 * @returns {string} SVG HTML string
 */
export function Icon(name, options = {}) {
  const {
    size = 24,
    class: extraClass = '',
    label = '',
    hidden = true
  } = options;
  
  const baseName = ICON_MAP[name] || name;
  let svg = getIconSVG(baseName);
  
  // On-demand fallback: if not in cache, trigger async load and schedule DOM update
  if (!svg) {
    // Trigger async load (will cache the result)
    loadIconSVG(name).then(loadedSvg => {
      // Find and update any placeholders for this icon
      const placeholders = document.querySelectorAll(`.icon.icon-${name}`);
      placeholders.forEach(el => {
        // Only update if still showing placeholder (has the circle)
        if (el.querySelector('circle[fill="none"]')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(loadedSvg, 'image/svg+xml');
          const svgEl = doc.documentElement;
          svgEl.setAttribute('width', String(size));
          svgEl.setAttribute('height', String(size));
          svgEl.setAttribute('class', `icon icon-${name} ${extraClass}`.trim());
          svgEl.setAttribute('aria-hidden', hidden ? 'true' : 'false');
          if (!hidden && label) {
            svgEl.setAttribute('aria-label', label);
          }
          svgEl.setAttribute('stroke-width', String(getStrokeWidth(size)));
          el.replaceWith(svgEl);
        }
      });
    }).catch(() => { /* ignore load errors */ });
    
    // Return placeholder for initial render
    return `<svg class="icon icon-${name} ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="${hidden}"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
  }
  
  // Inject size and classes into SVG using DOMParser for safe manipulation
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgEl = doc.documentElement;
  
  // Set attributes
  svgEl.setAttribute('width', String(size));
  svgEl.setAttribute('height', String(size));
  svgEl.setAttribute('class', `icon icon-${name} ${extraClass}`.trim());
  svgEl.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  if (!hidden && label) {
    svgEl.setAttribute('aria-label', label);
  }
  // Set stroke-width per ICON-SPEC.md §1.2
  svgEl.setAttribute('stroke-width', String(getStrokeWidth(size)));
  
  return svgEl.outerHTML;
}

// Get stroke width based on size (per ICON-SPEC.md §1.2)
function getStrokeWidth(size) {
  if (size <= 16) return 1.25;
  if (size >= 32) return 2;
  return 1.5;
}

// Export raw SVG loader for dynamic use
export { loadIconSVG, ICON_MAP };
