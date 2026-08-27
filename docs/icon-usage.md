# Icon Implementation Checklist

**Task:** t_fbbbde11 — 按 ICON-SPEC.md 落地 artbook 前端 icon 组件库并替换现有 icon

**Design Spec:** `icons/ICON-SPEC.md` (Set A — Outline Museum recommended)
**Visual Board:** `icons/icon-variants.html`

---

## Implementation Summary

This document tracks the implementation of the Artbook Icon System based on the design specification from task t_113c4dd8.

### Icon Set: Set A — Outline Museum

**Style parameters:**
- Grid: 24×24 px base
- Stroke: 1.5 px (scaled: 1.25 px @ 16px, 2 px @ 32px)
- Corners: 3 px outer, 2 px inner
- Fill: none (outline only), except active/filled states
- Colors: `var(--ink)`, `var(--ink-2)`, `var(--gold)` from DESIGN.md

---

## Implemented Icons

### Navigation Icons (nav-*)

| Icon Name | File | Usage | Status |
|-----------|------|-------|--------|
| `nav-home` | `icons/svg/nav-home-outline.svg` | Home/feed navigation | ✅ |
| `nav-back` | `icons/svg/nav-back-outline.svg` | Back navigation | ✅ |
| `nav-close` | `icons/svg/nav-close-outline.svg` | Close button (detail page) | ✅ |
| `nav-more` | `icons/svg/nav-more-outline.svg` | More menu (reserved) | ✅ |
| `nav-search` | `icons/svg/nav-search-outline.svg` | Search (reserved) | ✅ |
| `nav-chevron-down` | `icons/svg/nav-chevron-down-outline.svg` | Date capsule dropdown | ✅ |
| `nav-filter` | — | Filter/sort (reserved) | ⏳ Future |

### Action Icons (action-*)

| Icon Name | File | Usage | Status |
|-----------|------|-------|--------|
| `action-favorite-outline` | `icons/svg/action-favorite-outline.svg` | Unfavorited state | ✅ |
| `action-favorite-filled` | `icons/svg/action-favorite-filled.svg` | Favorited state | ✅ |
| `action-bookmark-outline` | `icons/svg/action-bookmark-outline.svg` | Bookmark (collection) | ✅ |
| `action-bookmark-filled` | `icons/svg/action-bookmark-filled.svg` | Bookmarked state | ✅ |
| `action-download-outline` | `icons/svg/action-download-outline.svg` | Download original | ✅ |
| `action-share-outline` | `icons/svg/action-share-outline.svg` | Share artwork | ✅ |
| `action-external-outline` | `icons/svg/action-external-outline.svg` | External link | ✅ |

### State Icons (state-*)

| Icon Name | File | Usage | Status |
|-----------|------|-------|--------|
| `state-loading` | `icons/svg/state-loading-outline.svg` | Loading indicator | ✅ |
| `state-error` | `icons/svg/state-error-outline.svg` | Error/failure | ✅ |
| `state-empty` | `icons/svg/state-empty-outline.svg` | Empty collection | ✅ |
| `state-offline` | `icons/svg/state-offline-outline.svg` | Offline/no network | ✅ |

### View Mode Icons (view-*)

| Icon Name | File | Usage | Status |
|-----------|------|-------|--------|
| `view-list` | `icons/svg/view-list-outline.svg` | List view toggle | ✅ |
| `view-grid` | `icons/svg/view-grid-outline.svg` | Grid view toggle | ✅ |
| `view-timeline` | `icons/svg/view-timeline-outline.svg` | Timeline view (reserved) | ✅ |
| `view-map` | `icons/svg/view-map-outline.svg` | Map view (reserved) | ✅ |

### Information Label Icons (info-*)

| Icon Name | File | Usage | Status |
|-----------|------|-------|--------|
| `info-artist` | `icons/svg/info-artist-outline.svg` | Artist/creator label | ✅ |
| `info-date` | `icons/svg/info-date-outline.svg` | Date/year label | ✅ |
| `info-medium` | `icons/svg/info-medium-outline.svg` | Medium/material label | ✅ |
| `info-size` | `icons/svg/info-size-outline.svg` | Size/dimensions label | ✅ |
| `info-museum` | `icons/svg/info-museum-outline.svg` | Museum/collection label | ✅ |

---

## Component Architecture

### Icon Component (`js/icons/Icon.js`)

**Features:**
- Async SVG loading with cache
- Size variants (16/24/32 px)
- Automatic stroke-width scaling per ICON-SPEC.md §1.2
- Accessibility support (aria-hidden, aria-label)
- Preload critical icons on app startup

**Usage:**
```javascript
import { Icon, preloadIcons } from './ui.js';

// In template
Icon('nav-home', { size: 24, class: 'my-icon', hidden: true })

// Preload on startup
preloadIcons().catch(() => { /* ignore */ });
```

### CSS Styling (`app.css`)

**Icon base styles:**
```css
svg.icon {
  width: 24px;
  height: 24px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
```

**Size variants:**
- `.icon-sm` — 16×16 px, stroke 1.25 px
- `.icon-md` — 24×24 px, stroke 1.5 px
- `.icon-lg` — 32×32 px, stroke 2 px

**Color tokens:**
- `.icon-ink` — `var(--ink)` (#1D1B16)
- `.icon-ink-2` — `var(--ink-2)` (#6B6558)
- `.icon-gold` — `var(--gold)` (#8C6D3F)

---

## Replacement Mapping

### feed.js
| Old | New | Location |
|-----|-----|----------|
| `icons.bookmark` | `Icon('action-bookmark-outline', { size: 16 })` | Header favorites button |
| `icons.chevronDown` | `Icon('nav-chevron-down', { size: 16 })` | Date capsule |

### detail.js
| Old | New | Location |
|-----|-----|----------|
| `icons.x` | `Icon('nav-close', { size: 20 })` | Close button |
| `icons.bookmark` | `Icon('action-bookmark-outline', { size: 16 })` | Favorite button (off) |
| `icons.bookmarkFilled` | `Icon('action-bookmark-filled', { size: 16 })` | Favorite button (on) |
| `icons.external` | `Icon('action-external', { size: 12 })` | External link |

### favorites.js
| Old | New | Location |
|-----|-----|----------|
| `icons.chevronLeft` | `Icon('nav-back', { size: 20 })` | Back button |

### ui.js (backward compatibility)
The `icons` object is preserved with getters that call the new `Icon()` component, ensuring backward compatibility with existing code.

---

## Verification Checklist

### ✅ Implementation Coverage
- [x] All icons used in current app implemented
- [x] Icon component supports name/size/class props
- [x] Preload mechanism in place
- [x] Backward compatibility maintained

### ✅ Spec Consistency
- [x] 24×24 base grid
- [x] 1.5 px stroke width (scaled for sizes)
- [x] Rounded corners (3 px outer, 2 px inner)
- [x] Color tokens from DESIGN.md
- [x] No hardcoded hex colors in SVG

### ✅ Visual & Layout
- [x] Desktop (1440×900) — icons render clearly
- [x] Mobile (390×844) — icons render clearly
- [x] Icon + text alignment within 2px
- [x] Dark/light mode contrast meets WCAG AA

### ✅ Non-breaking Changes
- [x] No new JS errors in console
- [x] No missing SVG resource warnings (root-relative paths)
- [x] Existing tests pass
- [x] No style regressions

### ✅ Fixes Applied (2026-08-27 Round 2)
- [x] Added `icons/ICON-SPEC.md` from parent task t_113c4dd8
- [x] Fixed fetch path: `icons/svg/` → `/icons/svg/` (root-relative)
- [x] Fixed stroke-width logic: use DOMParser instead of regex replacement
- [x] Removed dangling `nav-filter` mapping (reserved for future)

---

## Files Modified

**New files:**
- `icons/svg/*.svg` (25 icon files)
- `js/icons/Icon.js` (Icon component)

**Modified files:**
- `js/app.js` — preloadIcons() call
- `js/ui.js` — Icon integration + backward compat
- `js/feed.js` — icon replacements
- `js/detail.js` — icon replacements
- `js/favorites.js` — icon replacements
- `app.css` — icon styles + size variants

---

## Next Steps (Future Cards)

- [ ] Add remaining reserved icons (nav-filter, etc.)
- [ ] Implement info-* icons in metadata views
- [ ] Add view-* icons to view toggle UI
- [ ] Create icon visual test page
- [ ] Add state-* icons to error/loading/empty states
- [ ] Animate state-loading (spinner rotation)

---

**Branch:** `artbook/t_fbbbde11-icon-spec.md-artbook-icon-icon`
**Commit:** 95edb6e (round 2 fixes)
**PR:** ready for review
