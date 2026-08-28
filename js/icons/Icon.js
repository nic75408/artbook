// Icon Component — Set A: Outline Museum
// Usage: import { Icon } from './icons/Icon.js';
//        Icon('nav-home', { size: 24, class: 'my-icon' })
//        Returns inline SVG string for template injection

const ICON_CACHE = new Map();

// Load SVG content from file (cached)
async function loadIconSVG(name) {
  if (ICON_CACHE.has(name)) {
    return ICON_CACHE.get(name);
  }
  try {
    // Apply ICON_MAP to resolve logical name to file base name
    const baseName = ICON_MAP[name] || name;
    // Use relative path to work with /artbook/ subpath deployment
    const response = await fetch(`icons/svg/${baseName}.svg`);
    if (!response.ok) throw new Error(`Icon "${name}" not found`);
    const svg = await response.text();
    ICON_CACHE.set(name, svg);
    return svg;
  } catch (e) {
    console.warn(`Icon load error: ${name} — ${e.message}`);
    // Return placeholder for missing icons
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>`;
  }
}

// Preload critical icons for immediate use
const CRITICAL_ICONS = [
  'nav-home', 'nav-back', 'nav-close', 'nav-more',
  'action-bookmark-outline', 'action-bookmark-filled',
  'action-favorite-outline', 'action-favorite-filled',
  'state-loading-outline', 'state-error-outline', 'state-empty-outline'
];

export async function preloadIcons() {
  await Promise.all(CRITICAL_ICONS.map(loadIconSVG));
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
  const svg = getIconSVG(baseName);
  
  if (!svg) {
    // Return placeholder if icon not preloaded
    return `<svg class="icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="${hidden}"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>`;
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
