---
version: alpha
name: Artbook Museum Guide
description: Mobile art handbook with restrained museum-like typography, warm paper background, and large breathing space.
colors:
  primary: "#1D1B16"   # primary text ink (used as main foreground color)
  bg: "#F5F1EA"        # warm paper background (body)
  bg-card: "#FDFBF7"   # lighter card/paper for frames and cards
  ink: "#1D1B16"       # alias for primary text ink
  ink-2: "#6B6558"     # secondary text ink
  gold: "#8C6D3F"      # accent gold for English titles and icons
  line: "#E4DDD0"      # subtle frame border, separators
  toast-bg: "#1D1B16"  # toast background (matches ink)
  toast-fg: "#F5F1EA"  # toast text (matches bg)

spacing:
  page-gutter: 22px     # horizontal page padding
  content-max: 340px    # max content width on mobile
  grid-gap: 14px        # gap between masonry grid cards
  card-stack: 22px      # vertical gap between stacked cards
  section-v: 24px       # default vertical spacing between sections

rounded:
  pill: 999px
  card: 8px
  sheet-top: 18px

typography:
  brand-title:
    fontFamily: "Songti SC, Noto Serif CJK SC, serif"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
  work-title:
    fontFamily: "Songti SC, Noto Serif CJK SC, serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.02em"
  body-text:
    fontFamily: "PingFang SC, Helvetica Neue, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "0.02em"
  meta-text:
    fontFamily: "PingFang SC, Helvetica Neue, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  artwork-title-zh:
    fontFamily: "Songti SC, Noto Serif CJK SC, serif"
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.02em"
  artwork-title-en:
    fontFamily: "Georgia, Times New Roman, serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0em"
  section-title:
    fontFamily: "Songti SC, Noto Serif CJK SC, serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0em"

components:
  app-root:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.body-text}"
  toast:
    backgroundColor: "{colors.toast-bg}"
    textColor: "{colors.toast-fg}"
    rounded: "{rounded.pill}"
  feed-header:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.brand-title}"
  feed-header-button:
    backgroundColor: "rgba(248, 250, 252, 0.85)"
    textColor: "rgba(15, 23, 42, 0.55)"
    rounded: "{rounded.pill}"
  slide-frame:
    backgroundColor: "{colors.bg-card}"
  date-capsule:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
  learn-inline:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    secondaryTextColor: "{colors.ink-2}"
    ruleColor: "{colors.gold}"
    ruleOpacity: 0.6
  detail-close:
    backgroundColor: "rgba(245, 241, 234, 0.88)"
    textColor: "{colors.ink}"
    rounded: "50%"
  fav-tool-button:
    backgroundColor: "{colors.bg-card}"
    textColor: "rgba(29, 27, 22, 1)"
    rounded: "{rounded.pill}"
  fav-tool-button-on:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.pill}"
  action-button:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.gold}"
    rounded: "{rounded.pill}"
  action-button-on:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.pill}"
  related-card:
    backgroundColor: "{colors.bg-card}"
  sheet:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.sheet-top}"
  offline:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-2}"

---

## Overview

Artbook Museum Guide is a mobile-first art handbook designed with a restrained museum
visual tone: warm paper background, serif Chinese headings, generous breathing space,
and slow, unobtrusive motion. The app presents each artwork as if mounted in a clean
frame on a gallery wall, with titles and explanatory copy following editorial
hierarchy rather than app chrome.

This DESIGN.md captures the current implementation decisions from `app.css` without
introducing new visual directions. All tokens are measured from the live styles:
colors from `:root`, typography from utility classes and specific components,
layout constraints from `.content-container`, `.slide`, and grid sections.

## Colors

- **Background (`colors.bg` #F5F1EA):** Warm paper-like page background for the entire app.
- **Card background (`colors.bg-card` #FDFBF7):** Slightly lighter paper used for frames,
  detail crop, and card surfaces.
- **Primary ink (`colors.ink` #1D1B16):** Main text color for headings and body copy.
- **Secondary ink (`colors.ink-2` #6B6558):** Used for metadata, subtitles, and
  explanatory text.
- **Gold accent (`colors.gold` #8C6D3F):** Highlight color for English titles, accent
  links, and ring/arrow in the learn-more button.
- **Line (`colors.line` #E4DDD0):** 1px frame borders, card outlines, and separators.
- **Toast background / foreground:** Toast uses ink on bg reversed to maintain contrast
  while matching the ink/paper palette.

## Typography

The system uses two font families:

- **Serif Chinese (`--serif-zh`):** Songti SC / Noto Serif CJK SC for brand wordmark,
  page titles, and artwork names.
- **Sans Chinese (`--sans-zh`):** PingFang SC / Helvetica Neue for body copy and
  metadata.

Hierarchy is defined by four core utility classes and specialized titles:

- `.brand-title` / `.wordmark` — 22px, bold serif, wide tracking for brand.
- `.work-title` — 20px, medium-weight serif for work titles.
- `.body-text` — 16px sans with long line height (1.8) for essays.
- `.meta-text` — 14px sans for supporting information.

Artwork and section-specific titles follow the same families with tuned sizes
(26px Chinese title, 17px English subtitle).

## Layout & Spacing

The layout is mobile-first:

- **Viewport:** `#view` and pages are constrained to at least `100dvh`.
- **Content width:** `.content-container` and key blocks use `max-width: 340px` and
  `margin: 0 auto` with `padding: 0 22px`.
- **Feed slides:** `.slide` is full-height (`100dvh`) with scroll snap, safe-area
  padding, and centered frame.
- **Masonry grid:** `.grid` uses `columns: 2` and `column-gap: 14px` on the same
  `content-max` width.

Safe-area env variables are used in paddings to keep controls away from device
notches and home indicators.

## Artwork Responsive Layout

All artwork images (feed slides and detail page hero) must respect bounded responsive
rules to prevent overflow on mobile cold load:

### Feed page (`.slide .frame .ph`)

- **Maximum width:** `min(280px, 86vw, calc((100dvh - pad-t - pad-b - 200px) / ratio))`
  - 280px = content-max (340px) - page-gutter (22px × 2) - frame border/padding
  - Ensures artwork never exceeds the content column regardless of viewport
- **Aspect ratio:** Respected via `aspect-ratio: calc(1 / var(--r))` where `--r` is
  height/width from the artwork data
- **Height constraint:** Calculated from available viewport height minus:
  - `--pad-t`: top safe area + header space (56px + safe-t)
  - `--pad-b`: bottom safe area + caption/button space (120px + safe-b)
  - 200px: reserved for frame borders, titles, and breathing room

### Detail page (`.detail-hero .ph`)

- **Width:** `100%` of the viewport — **full bleed, no content-max constraint**.
  The detail page uses "page-level bleed + per-module padding": the page itself has
  no horizontal padding, the hero bleeds edge to edge, and every other module
  (`.artwork-info-card`, `.detail-body`, `.related`) applies its own
  `var(--page-gutter)` padding.
- **Aspect ratio:** Respected via inline `aspect-ratio: calc(1 / var(--r))`
- **Object-fit:** `contain` to ensure full artwork visibility without cropping

### Detail page related-works rail (`.related-scroll`)

- **Padding:** `0 0 var(--space-sm) var(--page-gutter)` — left edge aligns to the
  22px gutter, right side is flush (0) so the rail can scroll out past the screen
  edge, signalling more content.

### Universal rules

- Feed-page artwork containers use `max-width: var(--content-max)` and `margin: 0 auto`.
  The detail-page hero is the deliberate exception: it is full-bleed.
- Left alignment基准 is `--align-origin: var(--page-gutter)` for visual consistency
- Frame borders (1px) and padding (8px) are included in the width calculation

## Components

Components map to CSS blocks in `app.css`:

- **Toast (`#toast`):** Fixed, centered pill at bottom, dark ink background and light
  text for legible transient messages.
- **Feed header (`.feed-header`):** Fixed at top with brand wordmark and a subtle
  icon button rendered as a pill with soft shadow.
- **Artwork slide (`.slide`, `.frame`, `.names`):** A full-height section composed of
  a framed image, Chinese artist name, and English title in gold.
- **Date capsule (`.date-capsule`):** Fixed pill in the bottom center with secondary
  text color on bg.
- **Learn more inline link (`.learn-inline`):** A gallery-label style text link
  rendered below the artwork+title module, centered on the slide's main axis.
  Composed of a Georgia italic gold "Continue reading" line, a 48px gold hairline
  rule (opacity 0.6), and a wide-tracked (0.3em) Songti SC "了 解 更 多" line in
  secondary ink. No button container, no shadow, no rotation. Active state
  stretches the rule to 64px and darkens the Chinese line to primary ink.
  Replaces the previous circular black-fill learn button (decommissioned
  2026-09-01).
- **Detail close (`.detail-close`):** Fixed circular button at top-right with light
  bg and subtle shadow.
- **Favorite tool (`.action-row .fav-tool`):** Pill button downgraded to a secondary
  tool with reduced contrast and small icon.
- **Primary action (`.action-btn`):** Gold-outlined pill that fills with gold on
  active state.
- **Related cards (`.related`, `.rel-card`):** Horizontal scroll of small framed
  cards with artist/title text.
- **Bottom sheet (`.sheet`):** Safe-area aware bottom panel with rounded top corners
  and issue list.
- **Offline page (`.offline`):** Centered messaging with brand wordmark and neutral
  explanatory text.

## Elevation & Motion

- **Frame depth:** Frames and cards rely on 1px border using `colors.line` and
  subtle bg difference between `bg` and `bg-card` instead of heavy shadows.
- **Feed header button & detail close:** Use soft box shadows (`0 2px 8px` and
  `0 2px 10px rgba(29, 27, 22, 0.1)`) for tactile tap targets without breaking
  the paper aesthetic.
- **Page transition:** `#view.enter` uses a 200ms fade-in.
- **Motion reduction:** `@media (prefers-reduced-motion: reduce)` collapses
  animations and transitions to near-zero, and disables the learn button spin.

## Do's and Don'ts

- **Do** keep new components within the warm paper + ink + gold palette defined in
  `colors`.
- **Do** reuse `typography.body-text` and `typography.meta-text` for new copy blocks
  to maintain consistent reading rhythm.
- **Do** respect the `content-max` and `page-gutter` for all new pages and sections.

- **Don't** introduce saturated brand colors beyond `colors.gold` without a new
  design decision approved by the product/design owner.
- **Don't** add heavy shadows or glossy effects — depth should remain subtle and
  frame-like.
- **Don't** override safe-area paddings for fixed controls; instead, align with
  existing use of `env(safe-area-inset-*)`.

## Decision Log

- **2026-08-26 — Direction B chosen (Museum guide):** Product/design owner selected
  the museum guide visual direction over a Notion-like minimal page. This locked
  in the warm paper background (`#F5F1EA`), serif Chinese headings, and generous
  breathing space as the core identity, with Mintlify/Notion only used as
  documentation-oriented comparison points.
- **Typography utility classes used as canonical:** `.brand-title`, `.work-title`,
  `.body-text`, and `.meta-text` are treated as the primary hierarchy references
  for future content and components.
- **Content width and spacing constraints:** `--content-max: 340px` and
  `--page-gutter: 22px` form the base layout grid for all screens, including
  feed, detail, and grid views.
- **2026-09-01 — Feed layout module centering:** `.slide` uses
  `align-items: center` and both `.frame` and `.slide .names` drop their
  `margin-left: var(--page-gutter)` so the artwork+title module centers
  relative to the viewport (previously offset ~28px to the left on iPhone 390).
  Text still left-aligns to the artwork's inner left edge, matching Chinese
  editorial convention.
- **2026-09-01 — Learn-more = gallery-label text link:** Product/design owner
  called out the black-fill circular learn button as visually clashing with the
  museum tone. After a three-variant self-adjudicated review (see
  `sketches/README.md`), the decision is the inline serif text-link variant:
  no button container, Georgia italic "Continue reading" + hairline rule +
  spaced Songti SC "了 解 更 多", using only `--gold` and `--ink-2`. Component
  token: `components.learn-inline`.
- **2026-09-01 — Two-tier interaction language:** Primary actions use pill
  controls (`.fav-btn`, `.date-capsule`, `.action-btn`); secondary content
  navigation uses text links (currently only `.learn-inline`). Different
  visual families are intentional: the tier is the language.
