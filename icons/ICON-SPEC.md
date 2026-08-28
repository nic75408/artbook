---
version: alpha
name: Artbook Icon System
relatedDesign: Artbook Museum Guide

# Artbook Icon System

This document specifies the icon design language for the Artbook Museum Guide
app under the existing DESIGN.md baseline (warm paper background, serif
Chinese headings, 340px content max, 22px page gutter).

It defines three complete icon sets (A/B/C) and recommends one as the primary
system for implementation.

## 1. Global Icon Parameters

### 1.1 Base grid and sizes

- Base grid: 24×24 px
- Alternative grid for high-emphasis actions: 28×28 px (used only where touch
  targets need slightly larger icons while preserving visual balance).
- Line alignment: all strokes and shapes snap to a 1px grid inside the icon
  canvas.

Standard exported sizes:

- Small: 16×16 px — used in metadata, small labels, and dense lists.
- Medium: 24×24 px — primary size for navigation and toolbar actions.
- Large: 32×32 px — used sparingly for empty states and key affordances.

Scaling rules:

- Icons are authored on 24×24 px grid and scaled proportionally.
- Stroke width and corner radius are defined at the 24×24 px reference and
  scaled visually for 16 px and 32 px use (see each set below).

### 1.2 Stroke width and corner radius

Base parameters (24×24 reference):

- Stroke width:
  - Set A (Outline): 1.5 px
  - Set B (Semi-filled): 1.5 px
  - Set C (Label-first): 1.25 px
- Corner radius on geometric shapes:
  - Outer rectangles and rounded squares: 3 px
  - Inner glyph details (stars, arrows): 2 px

At 16 px:

- Stroke: 1.25 px (A/B), 1 px (C)
- Corner radius: 2 px outer, 1.5 px inner.

At 32 px:

- Stroke: 2 px (A/B), 1.75 px (C)
- Corner radius: 4 px outer, 3 px inner.

### 1.3 Color tokens and contrast

All colors reference the existing DESIGN.md tokens:

- Ink: `{colors.ink}` #1D1B16
- Ink secondary: `{colors.ink-2}` #6B6558
- Gold accent: `{colors.gold}` #8C6D3F
- Paper background: `{colors.bg}` #F5F1EA
- Card background: `{colors.bg-card}` #FDFBF7
- Line/frame color: `{colors.line}` #E4DDD0

Usage rules:

- Default icon stroke/fill uses `{colors.ink}` for maximum legibility on
  `{colors.bg}` and `{colors.bg-card}`.
- Secondary actions use `{colors.ink-2}` on the same backgrounds.
- Highlighted or active actions use `{colors.gold}` either as stroke or fill.
- Icons must maintain at least AA contrast (4.5:1) against their background.
  In practice, `{colors.ink}` and `{colors.gold}` on `{colors.bg}` and
  `{colors.bg-card}` meet or exceed AA for non-text icons.

### 1.4 Naming convention

Icon names follow a structured pattern for implementation:

- File/variable format: `icon-<domain>-<name>-<style>`
- Domains:
  - `nav` — navigation and global app-level actions
  - `action` — per-artwork actions
  - `state` — state/feedback icons
  - `view` — view-mode switches (list/grid/timeline/map)
  - `info` — information structure labels (artist, date, medium, etc.)
- Styles:
  - `outline` — stroke-only glyph
  - `filled` — primary fill used for active/selected state
  - `duotone` — two-color icons, typically ink + gold

Examples:

- `icon-nav-home-outline`
- `icon-action-favorite-outline`
- `icon-action-favorite-filled`
- `icon-action-download-outline`
- `icon-state-empty-collection`
- `icon-view-grid-outline`
- `icon-info-artist-label`

## 2. Icon Coverage Checklist

Each set (A/B/C) must include at least the following icons:

### 2.1 Navigation / functional

- nav.home — go to home/feed
- nav.back — go back
- nav.more — open more menu / overflow
- nav.close — close sheet or detail
- nav.search — search artworks (reserved)
- nav.filter — open filter/sort (reserved)

### 2.2 Artwork actions

- action.favorite-outline — not yet favorited
- action.favorite-filled — favorited
- action.download-outline — download original image
- action.share-outline — share artwork
- action.link-external-outline — open external link / jump

### 2.3 Information structure

Small label icons (for possible future "icon+label" usage):

- info.artist-label — artist/creator
- info.date-label — date/year
- info.medium-label — medium/material
- info.size-label — size/dimensions
- info.museum-label — museum/collection

These are simple, highly abstracted marks intended to be paired with text.

### 2.4 State icons

- state.loading — loading indicator (spinner/loop)
- state.error — error / failure
- state.empty-collection — empty favorites
- state.offline — offline / no network

### 2.5 Future view / module icons

Reserved base forms for future modules:

- view.list-outline — list view
- view.grid-outline — grid/masonry view
- view.timeline-outline — timeline view
- view.map-outline — map/geographical view

## 3. Icon Set A — Outline Museum

A line-first, restrained outline set tuned to feel like printed pictograms on
warm paper. This set is designed for maximum clarity on small sizes.

### 3.1 Style summary

- Grid: 24×24 px
- Stroke: 1.5 px (scaled as per global rules)
- Corners: 3 px outer, 2 px inner.
- Fill: none by default; only state/active icons use minimal fill.
- Colors:
  - Default: `{colors.ink}` stroke on `{colors.bg}` / `{colors.bg-card}`
  - Secondary: `{colors.ink-2}` stroke
  - Active: `{colors.gold}` stroke

### 3.2 Visual language

Shapes:

- nav.home — minimal house: roof triangle and base rectangle with rounded
  corners, no door fill.
- nav.back — chevron arrow with 45° angle, centered vertically.
- nav.more — three vertically aligned dots (or horizontally in toolbar) with
  equal spacing.
- nav.close — 45° cross with rounded end caps, sized to keep visual weight
  equal to home/back.
- nav.search — circular lens with handle at 45°, stroke-only.
- nav.filter — funnel shape, top width matching search lens diameter.

Favorite and actions:

- action.favorite-outline — five-point star, slightly rounded, centered.
- action.favorite-filled (state) — star filled with `{colors.gold}` inside a
  thin `{colors.ink}` outline.
- action.download-outline — downward arrow with base line.
- action.share-outline — three-node share glyph with connecting lines.
- action.link-external-outline — box with north-east arrow leaving the frame.

Information labels:

- info.artist-label — small silhouette bust (head + shoulders) and base line.
- info.date-label — calendar outline with two top tabs.
- info.medium-label — abstract brush stroke or droplet.
- info.size-label — corner marks (L-shaped) forming a frame.
- info.museum-label — low column with pediment.

State icons:

- state.loading — circular ring divided in 3 segments, using stroke only.
- state.error — triangle with exclamation mark.
- state.empty-collection — thin outline of a folder/box with open top.
- state.offline — cloud outline with slash.

View modes:

- view.list-outline — three stacked horizontal lines with bullet squares.
- view.grid-outline — 2×2 grid of rounded rectangles.
- view.timeline-outline — horizontal line with 3 nodes.
- view.map-outline — pin with rounded tip and hollow center.

### 3.3 Usage rules

- Primary toolbars (detail bottom, feed top) use outline icons at 24×24 px.
- Favorite and primary actions use outline icons by default, switching to
  filled variant only when active.
- Information labels use 16×16 px versions next to text, never standalone.

## 4. Icon Set B — Semi-filled Museum

A slightly more tactile set that introduces constrained fill areas while
keeping the overall museum-guide restraint. Designed to better differentiate
states at a glance.

### 4.1 Style summary

- Grid: 24×24 px
- Stroke: 1.5 px
- Base shapes: same geometry as Set A
- Fill usage:
  - Inactive: outline with small filled accents (dots, inner shapes)
  - Active: filled core shapes with contrasting outline.
- Colors:
  - Default: `{colors.ink}` stroke, `{colors.bg}` interior.
  - Accent: `{colors.gold}` small fills.
  - Active: `{colors.gold}` main fill with `{colors.ink}` outline.

### 4.2 Visual language

Favorite & actions:

- action.favorite-outline — star outline with a small gold dot in the center.
- action.favorite-filled — gold-filled star with ink outline.
- action.download-outline — arrow head filled with ink, shaft outline only.
- action.share-outline — nodes filled with gold, lines in ink.

State icons:

- state.error — triangle outline with filled interior (ink) and reversed
  exclamation color.
- state.empty-collection — box outline with small gold bookmark tucked in.
- state.offline — cloud outline with filled slash.

View modes and labels use similar accent fills to help differentiate them from
pure outline icons.

### 4.3 Usage rules

- Use semi-filled icons in contexts where state distinctions matter (favorite
  on/off, error vs normal).
- Do not mix Set B and Set A inside the same micro-toolbar: pick one style per
  cluster to avoid texture noise.

## 5. Icon Set C — Label-first Minimal

A minimal, label-oriented set optimized for tight information structures and
small sizes. Icons act as subtle markers next to text rather than strong
pictograms.

### 5.1 Style summary

- Grid: 20×20 px (authored), scaled to 16/24 px in use.
- Stroke: 1.25 px at reference.
- Corner radius: 2 px.
- Colors:
  - Default: `{colors.ink-2}` stroke.
  - Active: `{colors.gold}` stroke.

### 5.2 Visual language

- nav icons use very compact chevrons and crosses.
- action icons (favorite, download, share) use reduced shapes with fewer
  points, tuned for 16 px legibility.
- info icons are extremely simplified glyphs (e.g., two-letter monograms or
  box markers) designed not to compete with labels.

### 5.3 Usage rules

- Prefer Set C when building dense lists or metadata-heavy views.
- Avoid Set C for primary actions on detail pages — use Set A or B instead.

## 6. Cross-context scaling

Mapping icon sizes to app contexts:

- Feed header (top bar): 20–24 px icons (Set A/B), one primary icon and at
  most one secondary.
- Detail page bottom tools: 24 px icons (Set A/B) inside pill buttons; favorite
  uses filled variant when active.
- Favorites list / collection: 20 px icons (Set A/C) attached to cards.
- Offline/error screens: 32 px icons (Set A/B) centered above text.

## 7. Recommendation

Primary recommended set: **Set A — Outline Museum**.

Reasons:

- Best matches the existing museum-guide tone: feels like printed pictograms
  on warm paper without introducing new heavy visual accents.
- Maintains high recognizability at small sizes without resorting to strong
  fills, which could compete with artwork imagery.
- Aligns cleanly with current typography and frame-based layout — thin ink
  outlines harmonize with `colors.line` frames.

Suggested uses for other sets:

- Set B — Semi-filled Museum: suitable for contexts where state distinctions
  must be very clear (e.g., heavy use of favorites, error/offline states).
- Set C — Label-first Minimal: suitable for dense metadata views, timelines,
  or lists where icons should be almost invisible but still provide structure.

This spec intentionally avoids implementation details like SVG path commands.
Engineering can implement the icon sets as SVG components or font glyphs as
long as they respect the grid, stroke, radius, color, and naming rules above.

## 8. PWA App Icon

The PWA app icon uses the owner-provided "艺" character as the primary brand
mark, rendered in the museum-guide tone.

### 8.1 Source and Design

- **Source:** Owner-provided "艺" character image (from Telegram session, cached
  as `~/.hermes/cache/images/img_cc2d883a571a.jpg`)
- **Design decision:** The "艺" glyph serves as the app-level brand mark for
  PWA installation on device home screens.
- **Colors:**
  - Background: `{colors.bg}` #F5F1EA (warm paper)
  - Glyph: `{colors.ink}` #1D1B16 (ink)

### 8.2 Export Sizes and Naming

File naming convention:
- 192×192 px: `icons/pwa-icon-yi-192.png`
- 512×512 px: `icons/pwa-icon-yi-512.png`

Both files are square PNGs with opaque background (no transparency).

### 8.3 Manifest Configuration

The `manifest.webmanifest` `icons` array references these two sizes:

```json
{
  "icons": [
    { "src": "icons/pwa-icon-yi-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/pwa-icon-yi-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 8.4 Glyph Proportions

At the 1000×1000 unit reference canvas:
- Canvas: 1000×1000 units
- "艺" glyph bounding box: 580×580 units (58% of canvas)
- Glyph position: centered horizontally and vertically
- Safe area inset: 80 units (8%) on all sides
- Effective corner radius (for platform masking): 12% of canvas
  - At 192 px: ~23 px
  - At 512 px: ~61 px

These proportions ensure the glyph remains clear and recognizable when platforms
apply rounded-square masking.
