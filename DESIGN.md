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
  # ── Detail-page Gestalt hierarchy (2026-09-02, t_6fe0245e) ──
  group-inner-tight: 8px    # within-group (meta rows, tight fields)
  group-inner: 12px         # within-group standard (title→meta)
  group-title-body: 14px    # heading→its own content
  paragraph: 18px           # essay paragraph rhythm
  group-cross: 32px         # between related groups (deprecated for essay→credit, see t_645b44c2)
  module-gap: 48px          # between top-level modules
  # ── Detail-page helper-layer (2026-09-02, t_645b44c2) ──
  # credit + 收藏按钮读作独立辅助层；层内两处间距一致 (helper-layer)，
  # 层到下一顶层模块 (.related) 的距离 helper-to-module > helper-layer × 1.5，
  # 实现「组内一致，组外大于组内」格式塔。取代原 essay→credit=group-cross(32)、
  # credit→action=group-inner(12) 的不等值组合。
  helper-layer: 20px        # essay→credit == credit→action (within helper layer)
  helper-to-module: 36px    # helper layer → .related (top-level module boundary)

rounded:
  pill: 999px
  card: 8px
  sheet-top: 18px

typography:
  brand-title:
    # DEPRECATED: use brand-wordmark instead
    alias: "{typography.brand-wordmark}"
  brand-wordmark:
    # t_e05a68be (2026-09-02): switched from PingFang SC to LXGW WenKai Lite Light
    # 楷体 (self-hosted 1.6KB subset of only "艺术手册" four glyphs at fonts/lxgw-wenkai-lite-brand.woff2).
    # PWA offline works via APP_SHELL cache. Fallback: Songti SC.
    fontFamily: "LXGW WenKai Lite, Songti SC, Noto Serif CJK SC, serif"
    fontSize: 24px
    fontWeight: 300
    lineHeight: 1.4
    letterSpacing: "0.18em"
  brand-mark:
    # DEPRECATED: use brand-wordmark directly (emblem removed t_e05a68be)
    alias: "{typography.brand-wordmark}"
  brand-emblem:
    # DEPRECATED t_e05a68be: 印章 icon removed per owner feedback. API kept in
    # BrandEmblem.js for potential future reuse (launch splash, favicon variants).
    kind: svg-emblem
    source: "js/icons/BrandEmblem.js"
    size: 36px
    borderThickness: 2px
    innerBorderThickness: 1px
    dotSize: 4px
    dotPosition: "top-right 4px"
    color: "{colors.gold}"
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
  brand-lockup:
    # t_e05a68be: emblem removed. Text-only wordmark, left-aligned to page-gutter.
    kind: text-only
    emblemGap: 0
    align: "left"
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
  artwork-slide:
    # t_e05a68be (2026-09-02): content width widened 280→320px, names centered,
    # frame padding 8→6px, learn-inline gap 28→44px, whole slide is a hotzone.
    # t_23059633 (2026-09-03): learn-inline gap 44→36px (single-line rewrite,
    # 「组内一致，组外由 fixed date-capsule 承担」).
    verticalCenterPadding: 60px
    contentWidth: min(320px, 92vw)
    frameMargin: 0 auto
    framePadding: 6px
    frameDisplay: inline-block
    namesWidth: min(320px, 92vw)
    namesTextAlign: center
    learnInlineMarginTop: 44px
    hotzoneScope: whole-slide
    hotzoneExcludes: [feed-header, date-capsule]
  date-capsule:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
  learn-inline:
    # t_d087905d (2026-09-03) — 恢复中英文双行格式（撤销 t_23059633 单行改版，
    # 赤拔判定单行版不如原双行有艺术感）。无 chevron，无 hairline。
    # 详细 sub-color 与 geometry 见 Components prose；schema 只塞合法 sub-token。
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
  detail-close:
    backgroundColor: "rgba(245, 241, 234, 0.55)"
    borderColor: "rgba(29, 27, 22, 0.08)"
    backdropFilter: "blur(14px)"
    boxShadow: "0 1px 4px rgba(29, 27, 22, 0.06)"
    textColor: "{colors.ink}"
    rounded: "50%"
    activeBackgroundColor: "rgba(245, 241, 234, 0.85)"
  folio:
    backgroundColor: "rgba(245, 241, 234, 0.55)"
    borderColor: "rgba(29, 27, 22, 0.08)"
    backdropFilter: "blur(14px)"
    idxColor: "{colors.ink}"
    sepColor: "{colors.gold}"
    totalColor: "{colors.ink-2}"
  detail-folio-mark:
    # 2026-09-02 t_8d4351d6 — replaces .detail-scrubber inside .artwork-info-card.
    # A typographic page-number label "NN · total" rendered with Kaiti SC, not a
    # graphical position indicator. Sub-props (letter-spacing, tabular-nums,
    # separator α) live in the Components prose section — the YAML schema only
    # carries whitelisted props.
    #
    # 2026-09-03 t_b944f6c5 — a Sans-serif contextual prefix ("收藏 · " /
    # "相关 · " / "画家 · " / "标签 · ") may precede the "NN · total" digits
    # to identify the folio source when the user entered from favorites,
    # related-works, or an artist/tag collection page. Feed entries stay
    # unprefixed. Prefix typography is described in the Components prose
    # section (not schema-encoded, to keep sub-tokens whitelisted).
    backgroundColor: "transparent"
    textColor: "rgba(29, 27, 22, 0.42)"
    fontFamily: "Kaiti SC, STKaiti, KaiTi, serif"
    fontSize: 12px
  collection-page-header:
    # 2026-09-03 t_b944f6c5 — artist and tag aggregation pages share a sticky
    # header with a back button + type-label title. Artist pages show the
    # fixed word "画家"; tag pages show the tag name itself. Typography reuses
    # `typography.work-title` (Songti SC 20px 700); max-width and ellipsis
    # rules in the Components prose section.
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    typography: "{typography.work-title}"
  collection-page-grid:
    # 2026-09-03 t_b944f6c5 — the aggregation-page grid inherits the favorites
    # two-column masonry (columns:2, column-gap 14px, card-stack 22px). Card
    # metadata swaps per page type: artist pages show year (not artist name)
    # under each card; tag pages show artist name under each card. Full grid
    # rules in docs/collection-page-spec.md §5. Border and typography reused
    # from the existing `.card .th` conventions (see Components prose).
    backgroundColor: "{colors.bg-card}"
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

### Density rules on the detail page (t_4945d720, 2026-09-03)

The detail page carries the highest information density of the app: hero →
folio → title → 5-row meta table → tags → chapter heading → essay stack in the
first 1.5 screens. Density rules that apply above the `.essay` fold:

- **Hero → info-card**: `padding-top: 32px` on `.artwork-info-card` (was 20px).
  Provides a "colophon-like" breathing space between the hero image and the
  first line of typography (folio mark), so the transition reads as page-turn
  rather than clipped overlay.
- **Title → meta**: `.work-meta-compact { margin-top: 18px }` (was 0). Pulls the
  meta table away from the title as a discrete information layer, not a
  subtitle.
- **Meta rows**: `.work-meta-row { padding: 8px 0 }` (was 4px). Row-to-row gap
  16px instead of 8px — 5 stacked rows read as five layers, not a spreadsheet.
- **Tags → chapter heading**: `.tags { gap: 10px; padding: 0 0 32px }`. Tag row
  is a discrete helper layer with its own margin to the next module boundary.
- **Chapter heading rhythm**: `.detail-body .section-title { margin: 28px 0
  14px }`. Above → below asymmetric (28 > 14) — heading claims space from the
  paragraph above it, sits close to the body it introduces.
- **Paragraph label rhythm**: `.paragraph-label { margin-top: 26px }` (was 20).
  Sub-headings within an essay chapter get real breathing above.
- **Essay paragraph rhythm**: `.essay .body-text { line-height: 1.95;
  margin-bottom: 22px }` (was 1.9 / 18px). Longer body text with 20+ Chinese
  chars per line needs 1.95 line-height for eye-comfort on the tightly bound
  346px column.
- **Related rail gap**: `.related-scroll { gap: 22px }` (was `var(--grid-gap)`
  = 14). Horizontal scroll cards read individually rather than as a strip.

**Not touched (already good):**
- Global `--page-gutter: 22px` — feed and grid pages are not dense.
- Grid gap `--grid-gap: 14px` for `.grid` (favorites/collection two-column) —
  card thumbnails are square and tall enough that 14px gap reads with breathing.
- Helper-layer system (t_645b44c2, t_93b43c1c-icon): `essay → credit →
  action-row → related` = 36 / 20 / 20 / 36 stays.

## Artwork Responsive Layout

All artwork images (feed slides and detail page hero) must respect bounded responsive
rules to prevent overflow on mobile cold load:

### Feed page (`.slide .frame .ph`)

- **Maximum width:** `min(320px, 92vw, calc((100dvh - pad-t - pad-b - 220px) / ratio))`
  - 320px = raised from 280px in t_e05a68be to reduce excessive side margin on
    ultra-narrow scrolls (e.g. Chinese hanging scrolls, ratio 4+): side margin
    goes from `(390-280)/2=55px` down to `(390-320)/2=35px`, matching the
    top/bottom breathing space so all four sides read as equal.
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
- Frame borders (1px) and padding (6px) are included in the width calculation.
  `.frame` uses `display: inline-block` so it shrink-wraps `.ph`'s computed
  width — the previous `block` behaviour left an internal white gutter above
  landscape (`.ph` height-limited, width < wrapper) artworks.

## Components

Components map to CSS blocks in `app.css`:

- **Toast (`#toast`):** Fixed, centered pill at bottom, dark ink background and light
  text for legible transient messages.
- **Feed header (`.feed-header`):** Fixed at top with brand wordmark (楷体
  "艺术手册" in LXGW WenKai Lite Light 24px) left-aligned to `--page-gutter`
  (22px), and a subtle icon button (bookmark shortcut) rendered as a pill
  with soft shadow on the right. Since t_e05a68be (2026-09-02) the seal
  emblem previously bundled by `BrandLockup` is removed — the wordmark alone
  carries the identity via the calligraphy typeface.
- **Artwork slide (`.slide`, `.frame`, `.names`):** A full-height section composed of
  a framed image, Chinese artist name, and English title in gold. Since
  t_e05a68be (2026-09-02): content width `min(320px, 92vw)` (raised from 280px);
  the frame is `display: inline-block` with `padding: 6px` so it shrink-wraps
  the image and never trails an internal white gutter; `.names` centers with
  `text-align: center` (matched to the artwork-centering aesthetic); the
  `.learn-inline` link sits `44px` below `.names` for clear breathing room;
  the whole slide is a tap hotzone (`cursor: pointer` + JS click delegation
  in `feed.js`), with only `.feed-header` (bookmark shortcut) and
  `.date-capsule` (date picker) excluded — clicks anywhere else on a slide
  navigate to that artwork's detail page.
- **Date capsule (`.date-capsule`):** Fixed pill in the bottom center with secondary
  text color on bg.
- **Learn more inline link (`.learn-inline`) — reverted 2026-09-03, t_d087905d
  (back from the t_23059633 single-line rewrite):** A gallery-label style text
  link rendered below the artwork+title module, centered on the slide's main
  axis. **Bilingual two-line composition:** first line "Continue reading" in
  italic Georgia gold serif at 15px (letter-spacing 0.08em), second line
  "了解更多" in Songti SC secondary ink at 17px (letter-spacing 0.1em), no
  chevron accent, no hairline rule, no button container. Sits `44px` below
  `.names`. Rationale: 赤拔 judged the single-line "了 解 更 多 ›" rewrite as
  visually flatter than the original bilingual pairing — the two-line
  composition reads as intentional gallery-label typography (the italic
  English line above a wider Chinese line), which the single accent chevron
  did not replicate. Component token: `components.learn-inline`. Supersedes
  the 2026-09-03 single-line variant (t_23059633); restores the geometry of
  the three-line variant defined 2026-09-01 (t_4c2a874b) and refined
  2026-09-02 (t_e05a68be, margin-top 44px), minus the hairline rule.
- **Detail close (`.detail-close`):** Fixed circular button at top-right, 40×40,
  with a **frosted-glass** background: `rgba(245,241,234,0.55)` + `backdrop-filter: blur(14px)`
  and a faint 1px `rgba(29,27,22,0.08)` border. Shadow reduced to
  `0 1px 4px rgba(29,27,22,0.06)` so the control no longer reads as a "sticker"
  on top of the hero image. `:active` state raises background α back to 0.85
  (touch feedback for iPhone; no `:hover`-only state). Text color stays
  `colors.ink` — the near-black icon glyph carries the contrast, so WCAG 1.4.11
  (≥ 3:1 for UI components) holds on both light and dark artworks.
- **Folio (`.folio`) — DEPRECATED for multi-work sequences (2026-09-02, t_6fe0245e;
  still deprecated after t_8d4351d6):** The numeric "N / total" pill is hidden
  via `display: none` inside `.artwork-info-card` and superseded by
  `.detail-folio-mark` (see below). Token retained only as fallback for
  single-artwork date pages that still use a standalone folio (currently none).
  Do not add new call sites.
- **Detail scrubber (`.detail-scrubber`) — REMOVED (2026-09-02, t_8d4351d6):**
  The mini position slider introduced by t_6fe0245e and visually upgraded by
  t_645b44c2 (50% width, 3px track, 12px gold dot with halo) was removed
  wholesale. Product/design owner reviewed the upgraded version and rejected
  the visual language entirely: "太丑了，如果没法做好看就去掉吧". Root cause
  analysis (see Decision Log 2026-09-02 t_8d4351d6): the component uses a
  **control vocabulary** (gold dot = interactive color, halo = tappable
  affordance, horizontal track = drag surface) while being `pointer-events:
  none`, producing a semantic–visual mismatch that reads as a "mini audio
  scrubber" instead of a museum-guide position hint. Three-variant
  self-adjudicated review chose A over B (keep-nothing) and C (hidden
  ex-libris ticks) 118/107/81. Replacement: `.detail-folio-mark`.
- **Detail folio mark (`.detail-folio-mark`) — replaces .detail-scrubber
  (2026-09-02, t_8d4351d6):** A **typographic** page-number label rendered
  as the first child of `.artwork-info-card` when `siblingCtx.ids.length > 1`.
  Text content: `${zeroPad2(index+1)} · ${total}` — e.g. `01 · 28`, `14 · 28`,
  `28 · 28` — with a middle-dot separator, no slash. Zero-padding on the
  current-index only (not on total) keeps `01` and `28` visually the same
  width, avoiding a "1/28"→"14/28" reflow. Type: **Kaiti SC 12px** (楷体系
  serif; falls back to `STKaiti`/`KaiTi`/`serif`), **weight 400**, line-height
  1.2, **letter-spacing 0.24em** (2.88px at 12px — wide but not stretched),
  **color `rgba(29, 27, 22, 0.42)`** (deep-ink at α 0.42, reads as
  restraint-grade caption). Separator `·` α is dropped to **0.28** (a hair
  lighter than the digits) so the whole text reads as one printed label
  rather than "digits divided by a mark". Layout: `display: block`,
  `margin: 0 auto var(--group-title-body) auto` (14px bottom gap to title —
  identical to the previous scrubber's slot), `text-align: center`,
  `padding-inline-start: 0.24em` to visually center the last glyph against
  the first (letter-spacing pushes trailing content right by one unit).
  `font-variant-numeric: tabular-nums` keeps the label width stable across
  index changes so nothing jumps when you swipe. `pointer-events: none` —
  never a target. ARIA: `role="doc-pagenumber"` (WAI-ARIA DPUB, the exact
  semantic role for a printed folio) with `aria-label="第 N 幅，共 total 幅"`;
  no `role="progressbar"`, because it is a static label, not a control.
  Single-work fallback: not rendered at all (guarded in JS, no CSS `:empty`
  hack). Design intent: with the scrubber's shape-language gone, position
  information now speaks in the same voice as the title (both Kaiti) and
  the essay body, at a strictly lower visual weight — the reader reaches
  the title first, and the "14 · 28" reads as a chapter marker beneath it.
- **Detail-page spacing hierarchy (2026-09-02, t_6fe0245e; revised t_645b44c2):**
  The detail page composes eight vertical rhythm levels (see `spacing` tokens:
  `group-inner-tight` 8, `group-inner` 12, `group-title-body` 14, `paragraph`
  18, **`helper-layer` 20**, `group-cross` 32, **`helper-to-module` 36**,
  `module-gap` 48). The two load-bearing moments at the essay bottom are
  (a) `.essay { padding-bottom: 0 }` so essay-container has no bottom flush,
  and `.credit` uses `margin-top: var(--helper-layer)` (20px) — same as
  `.action-row` `margin-top: var(--helper-layer)` — making credit + 收藏按钮
  read as a two-element helper layer with **strictly equal internal spacing**;
  and (b) `.action-row` → `.related` uses `padding-top: var(--helper-to-module)`
  (36px) with **no hairline `border-top`** — the 36/20 = 1.80 ratio ≥ 1.5 makes
  the module boundary read via whitespace alone, honoring 「组内一致，组外大于
  组内」without a visible line. See Decision Log 2026-09-02 for full
  before/after table.
- **Favorite tool (`.action-row .fav-tool`) — centered helper (2026-09-02,
  t_645b44c2):** Pill button downgraded to a secondary tool with reduced
  contrast and small icon; **horizontally centered** inside `.action-row`
  via parent `text-align: center` + `display: inline-flex` on the button
  itself (the default `display: flex` would stretch it full-width and defeat
  the centering).
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

- **2026-09-03 — t_f2d585b6 / t_e3c4e706 — Related-work deduplication (viewed
  tracking):** Product/design owner requirement: "推荐过的内容不能重复推荐".
  Initial three-variant review picked Plan B (90-day sliding window + 180-item
  FIFO cap). Product/design owner then overrode this after review: with
  artbook's total catalog in the low hundreds, even a user who has seen every
  single work only accumulates a few hundred IDs (a few KB) — localStorage can
  hold the whole history comfortably, so an expiry/cap is unnecessary
  complexity that would let seen work resurface. **Final rule: once viewed,
  never recommended again — no item cap, no expiry.** localStorage schema
  simplified to a flat ID array `["id1","id2",...]` (no timestamp). If the
  filtered candidate pool for `related()` is empty, return an empty list
  rather than falling back to previously-seen work. Implementation:
  `js/viewed.js` module (`markViewed()`, `isViewed()`, `viewedIds()`,
  `clearViewed()`), `data.related()` filters out all viewed IDs with no
  time window, `detail.js` calls `markViewed(w.id)` on render. Evidence: code
  commit in worktree branch, localStorage schema `string[]`.
- **2026-09-03 — t_4945d720 — Detail-page density reduction (breathing pass):****
  Product/design owner: "整体设计留白不足，信息密度可以再降低一些". Baseline audit
  showed the density problem was concentrated on the detail page's first fold:
  hero → folio → title → 5-row meta → tags → chapter heading stacked in half a
  screen with 8px row-gaps that read like a spreadsheet. Feed and grid pages
  were already breathing-fine. Three variants self-adjudicated (see
  `evidence/t_4945d720/THREE-VARIANTS-DECISION.md`):
  A (global gutter enlargement) scored 15/25 — added no perceptible effect on
  feed and shrank the frame; C (introduce 8px `--rhythm-N` token layer) scored
  16/25 — conflicted with the existing semantic tokens (`group-inner`,
  `paragraph`, `module-gap`) and doubled the spacing vocabulary. B (surgical
  detail-page pass) won 24/25: no global tokens changed; only the density hot
  spots relaxed — `.artwork-info-card` padding-top 20→32, work-meta-row padding
  4→8 (row-gap 8→16), work-meta-compact margin-top 0→18, tags gap 8→10 and
  padding-bottom 20→32, essay line-height 1.9→1.95 and mb 18→22,
  section-title 20/10→28/14, paragraph-label mt 20→26, related-scroll gap
  14→22. See `Layout & Spacing → Density rules on the detail page` for the full
  rulebook. Evidence: `evidence/t_4945d720/{baseline,final}-*.png` (6 pairs at
  390×844), design.md lint 0 error.
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
- **2026-09-01 — Detail top-controls α lowered to 0.55 + 14px blur (frosted glass):**
  Product/design owner asked for lower opacity on the top-left folio and
  top-right close button to reduce visual occlusion of the artwork.
  Three-variant self-adjudicated review (A α 0.70, B α 0.55, C α 0.35) with
  Playwright iPhone 390×844 screenshots on both a light artwork
  (Cleveland 1941.647, palette lum 226) and a dark artwork
  (Cleveland 1977.37, palette lum 8). A was indistinguishable from the
  current 0.88 — didn't solve the ask. C crossed the readability floor:
  the gold Georgia italic `/` and `30` fell below WCAG 1.4.11's 3:1 UI-component
  contrast on the dark artwork (measured ~2.1:1). **B selected.** Both controls
  keep identical α / border / blur to preserve the diagonal symmetry
  established as the detail-page top anchor. Icon glyph and text colors are
  unchanged; readability is carried by the near-black glyph + 14px backdrop
  blur that flattens high-frequency painting texture. Evidence:
  `sketches/detail-close-opacity/` (three-variant board, README) and
  `evidence/detail-close-opacity/` (eight iPhone screenshots + overview).
  A `prefers-reduced-transparency: reduce` fallback restores α 0.85 and
  removes the blur.
- **2026-09-02 — Brand wordmark = static SVG glyphs (Kaiti SC path-baked):**
  Product/design owner asked for an artistic treatment of the top-left
  "艺术手册" wordmark instead of default system font. Three-variant self-
  adjudicated review (A tuned Songti + gold dot + English subtitle, B path-
  baked Kaiti SC SVG + gold seal, C ZCOOL XiaoWei web font + gold rule).
  Playwright iPhone 390×844 screenshots on the current homepage layout with
  the same El Greco artwork tile as visual context. **B selected**: kaiti-
  regular carries authentic Chinese art-catalog/museum inscription lineage;
  path-baked SVG (5.5 KB inline, extracted with fontTools) has zero font
  loading = zero FOUT = works offline (aligns with 部署事实 4 CDN pitfall).
  A rejected — the Songti-based main mark remains too close to the default
  system font the owner wanted to leave behind; the mark itself doesn't
  break out of "system font feel". C rejected — web font FOUT risk on real
  iPhone with airplane-mode/offline scenarios (owner's actual test posture),
  and the extra gold horizontal rule felt over-designed for a 44px header.
  A's Georgia italic English subtitle wording archived as reusable element
  for future og-image / share card; C's 44px gold rule archived as future
  section-divider vocabulary. New component `.brand-mark` and
  `js/icons/BrandWordmark.js`; legacy `.brand-title` retained as compatibility
  alias. Six call sites migrated in `js/feed.js` (3), `js/collection.js` (1),
  `js/favorites.js` (1), `js/detail.js` (2). Evidence:
  `sketches/brand-wordmark/` (three variants + shoot.mjs) and
  `evidence/t_a58c1d32/` (six iPhone 390×844 screenshots).
- **2026-09-02 — Brand emblem = graphic seal (Kaiti SC replaced):**
  Product/design owner evaluated the Kaiti SC path-baked wordmark (t_a58c1d32)
  as "too ordinary, not artistic enough". Three-variant self-adjudicated review
  (A Slim Gold Script calligraphy, B Graphic Emblem abstract seal, C Bilingual
  editorial Artbook + Chinese). iPhone 390×844 screenshots on the current
  homepage layout. **B selected**: double-square emblem (36px/2px outer +
  20px/1px inner) with top-right dot (4px) creates a distinctive abstract
  "艺" seal symbol; pure CSS/SVG has zero font dependency = perfect offline
  support (core deployment constraint); modern museum identity (MoMA/Tate style)
  differentiates from traditional calligraphy routes. A rejected — calligraphy
  fonts risk blurry rendering at small sizes on low-DPI screens; C rejected —
  English-first weakens Chinese user recognition. New components
  `components.brand-emblem` / `brand-wordmark` / `brand-lockup`; legacy
  `typography.brand-mark` / `brand-title` retained as compatibility aliases.
  Evidence: `sketches/brand-wordmark-v2/` (three variants + comparison.html).
- **2026-09-02 — Feed artwork card layout = unified content width + artwork centering:**
  Product/design owner asked to fix two issues: (1) artwork sits "too high" on
  the screen, (2) artist/title text alignment looks odd on narrow vs wide
  artworks. Three-variant self-adjudicated review (A vertical centering with
  text width following artwork, B museum-label overlay on artwork bottom,
  C unified 280px content width with artwork centered inside). Playwright
  iPhone 390×844 screenshots on three aspect ratios (narrow vertical 200×280,
  square 280×280, wide horizontal 400×200). **C selected**: unified content
  width ensures consistent left-align origin (`--page-gutter`), controls line
  length to ≤75 characters (WCAG 1.4.8 best practice), and maintains
  compatibility with existing layout tokens (`--content-max: 340px`,
  `--page-gutter: 22px`). A rejected — text width varies with artwork, no
  unified rhythm. B rejected — occludes artwork bottom 15-20%, contrast risk
  on light artworks, higher dev cost. New spec: `.slide` uses
  `justify-content: center` + `padding: 60px var(--page-gutter)` for vertical
  centering; `.frame` and `.names` both use `width: min(280px, 86vw)` +
  `margin: 0 auto` for unified width baseline. Evidence:
  `sketches-layout-redesign/001-centered-vertical.html`, `sketches-layout-redesign/002-museum-label.html`,
  `sketches-layout-redesign/003-unified-width.html`, and `sketches-layout-redesign/SPEC.md`.
- **2026-09-02 — Homepage 4-item revision (t_e05a68be):** Product/design owner
  gave four grouped feedback items on the homepage, taken from a hand-annotated
  iPhone screenshot: (1) top-left title area — drop the seal emblem, keep only
  the "艺术手册" wordmark, in a "thin & elongated calligraphy" font (瘦金体式),
  left-aligned to page gutter (not the 20px `--space-xl` that had it misaligned
  with the artwork edge); (2) frame refinement — narrow-scroll artworks like
  达摩渡江图 (ratio 4.07) had 55px side gutters, out of proportion with the
  top/bottom breathing; (3) `Continue reading / 了解更多` sat too tight below
  artwork/artist — add real breathing space; (4) tap hotzone expansion — the
  whole slide should be tappable (only the fav-shortcut and date-capsule stay
  as functional controls). Three-variant self-adjudicated review on the
  wordmark font (the one item where a font choice needed evaluation, other
  three items are contract-driven numeric changes): **A** ZCOOL XiaoWei (Google
  Fonts CDN, script-black), **B** Ma Shan Zheng (毛笔行书), **C** LXGW WenKai
  Lite Light (霞鹜文楷·清雅, self-hosted). Playwright iPhone 390×844 across four
  aspect ratios (narrow scroll 4.07, square 1.00, tall portrait 1.73, landscape
  0.57). Scores (瘦金-similarity / calligraphy-feel / restraint / palette-fit):
  A 5/6/6/6=23; B 3/8/3/6=20; **C 8/7/9/8=32 selected**. C's楷 rendering
  carries the requested "细长, 有书法韵味" while its Light weight (300) keeps
  the museum-guide restraint the wordmark contest with the artwork; C is
  self-hosted as a 1.6KB WOFF2 subset of only the four brand glyphs
  (`fonts/lxgw-wenkai-lite-brand.woff2`, pyftsubset from the LXGW WenKai Lite
  15MB TTF, unicode-range U+827A,U+672F,U+624B,U+518C), added to `APP_SHELL`
  in `sw.js v13` so PWA offline first-paint keeps the wordmark. A rejected —
  ZCOOL XiaoWei at 26px reads as art-heavy black rather than a subtle wordmark;
  B rejected — Ma Shan Zheng's brush-splash character sizing (艺 large, 术 small)
  breaks the restrained masthead tone. Numeric changes on the other three
  items: `.feed-header` left padding aligned to `--page-gutter` (22px, was
  20px); `.frame-wrapper` width `min(280px, 86vw) → min(320px, 92vw)`;
  `.frame` padding `8px → 6px` and `display: inline-block` (fixes landscape
  internal white gutter); `.slide .names` `text-align: left → center`, width
  also 320px; `.learn-inline` `margin-top: 28px → 44px`; `.slide` gains
  `cursor: pointer` and `feed.js` `buildSlides/rebindSlides` delegate click
  to the whole slide (`.learn-inline` keeps `preventDefault` on its anchor,
  no `stopPropagation` so the bubble reaches slide-level `navigate`). Values
  verified via Playwright real-device screenshots + computed-style probe:
  `wordmark { fontFamily: LXGW WenKai Lite, 24px, weight 300, letterSpacing
  4.32px (=0.18em), left=22px, LXGW loaded=true }`, `frame.w=137.77|320|305.83|
  320` (narrow-scroll shrink-wrap works), `names.textAlign=center` on all four,
  `learn.marginTop=44px` on all four, `slide.cursor=pointer`, and a synthetic
  slide-click navigated to `#/work/<id>`. Prior emblem (t_b6d76c90 double-square)
  API kept in `js/icons/BrandEmblem.js` in case a later screen needs it
  (launch splash, favicon variants) — call-site removed in `BrandLockup()`,
  which now returns only the wordmark span. Evidence:
  `evidence/homepage-4items-3variants/` (12 screenshots + manifest.json for
  three-variant comparison) and `evidence/t_e05a68be-final/` (4 real screenshots
  + manifest.json for on-branch verification).
- **2026-09-02 — Detail-page close-button top-right + numeric folio → scrubber (t_6fe0245e):**
  Product/design owner asked (a) move the close X from bottom-left (below
  artwork) to top-right, over the artwork, using the existing α 0.55 + blur
  14px frosted-glass language (t_ace5cc6b), and (b) replace the "9 / 28"
  numeric folio with a minimalist scrubber that shows overall position without
  claiming extra space. Three-variant self-adjudicated review of scrubber
  placement (A card-inner top band, B floating capsule between hero and card,
  C in-hero bottom frosted band). Playwright iPhone 390×844 screenshots at
  page 1 of 28 and page 14 of 28. **A selected 17/9/13**: container ownership
  is unambiguous (`.artwork-info-card` interior element, taking over the folio
  slot); geometry is decoupled from artwork luminance so the gold dot's
  visibility is stable across light and dark works; and — decisive — B reuses
  the `.detail-close` frosted-capsule vocabulary that the design system reserves
  for tappable controls (`.detail-close`, `.date-capsule`, `.fav-tool`),
  which would mis-signal a pointer-events-none indicator as a control. C failed
  visibility on the same light-sky region behind the current El Greco hero:
  the 2px gold hairline dropped below the 3:1 UI-component contrast floor
  (WCAG 1.4.11) at the dot position. New component `components.detail-scrubber`
  with prose in Components section; folio marked deprecated for multi-work
  sequences. Evidence: `sketches/t_6fe0245e/` (before-full, after-full,
  after-firstpaint, after-bottom, A/B/C-page1, A/B/C-page14, refine-A1/A2/A3
  × 3 positions, README, spec.css).
- **2026-09-02 — Detail-page Gestalt spacing rework (t_6fe0245e follow-up):**
  Product/design owner reported "essay body, favorite button, and related
  section spacing has all degraded — need whole-page pass". Root cause on
  Playwright fullPage measurement of `#/work/cma-129386` (2794px doc height):
  three Gestalt violations. (1) `.credit` → `#fav-act` = 0px, so the favorite
  button read as a trailing part of the credit line rather than an action.
  (2) `.action-row` → `.related` = 28px (14+14 padding coincidence), too
  weak for a top-level module boundary. (3) `.work-title` mb 18 + `.work-meta-compact`
  mt 14 = 32px inside a single info card, breaking within-card cohesion.
  Fix: new spacing tokens establish six ordered rhythm levels
  (`group-inner-tight` 8, `group-inner` 12, `group-title-body` 14, `paragraph`
  18, `group-cross` 32, `module-gap` 48). Key applications: `.credit` gets
  `margin-top: 32px` (essay→helper-layer group-cross), `.action-row` gets
  `margin-top: 12px` (credit→action group-inner), `.related` gets
  `padding-top: 48px` + `border-top: 1px rgba(29,27,22,0.06)` (top-level
  module gap + hairline). Title→meta compressed to 12px. Full 13-row
  before/after table in `sketches/t_6fe0245e/README.md`. No new tokens outside
  `spacing:`; component blocks unchanged apart from folio/scrubber described above.
- **2026-09-02 — Detail-page essay-to-related bottom spacing + fav-tool centering
  + scrubber visual upgrade (t_645b44c2):** Product/design owner reviewed the
  live detail page bottom and flagged three issues on the marked-up screenshot
  (see task attachments): (1) the two gaps essay-end→credit and credit→
  收藏按钮 are visually unequal — 44px vs 12px — although both should read as
  one "helper layer" with uniform internal rhythm; (2) 收藏按钮 is left-aligned
  and reads as attached to credit rather than as a centered helper action;
  (3) the hairline `border-top` on `.related` plus a 0px collapsed gap makes
  the module boundary feel abrupt yet under-spaced. In a follow-up, the
  scrubber was also called out as "too plain" (2px track + 8px dot, full-width)
  — the ask being an "暗示性" (suggestive) indicator, not a precise progress
  bar (owner: "宽度小一些... 不需要精确的全宽进度条").
  Playwright measurement on `#/work/cma-129386` (iPhone 12, 390×844) confirmed
  before-state: red_top=44, red_bot=12, yellow(action→related-title)=49,
  scrubber-width=346px (full container). Root cause of the unequal reds:
  `.essay { padding-bottom: 12px }` stacked with `.credit { margin-top: 32px }`
  produced 44px above the credit block, while credit→action was governed
  independently by `.action-row { margin-top: 12px }`. Fix (three-variant
  self-adjudicated review, B chosen 44/33 vs A 33 vs C 38): introduce
  **`--helper-layer: 20px`** and **`--helper-to-module: 36px`** spacing tokens;
  set `.essay { padding: 0 }`, `.credit { margin-top: var(--helper-layer);
  padding-top: 0 }`, `.action-row { margin-top: var(--helper-layer);
  text-align: center; padding-bottom: 0 }`, `.action-row .fav-tool
  { display: inline-flex }` (overrides the base `.action-btn { display: flex }`
  so the pill doesn't stretch), and `.related { padding-top:
  var(--helper-to-module) }` **removing the 1px hairline `border-top`**.
  After-state: red_top=20, red_bot=20 (equal ✓), yellow=36 (36/20=1.80 ≥1.5 ✓),
  fav-tool centered (btnLeft=125, btnRight=125 ✓). Scrubber upgrade (three
  candidate visuals self-adjudicated: short-track 44/52 vs 5-segment capsules
  52 [but ruled out because each issue has 30 works, making 30 tiny segments
  unreadable] vs 5-dot 49 [same 30-count problem]): short-track wins by
  practical constraint. New values: `.detail-scrubber { width: 50%;
  margin: 0 auto; height: 12px }`, track `height: 3px; radius: 1.5px`,
  dot `12×12; box-shadow: 0 0 0 3px var(--bg-card), 0 1px 3px
  rgba(29,27,22,0.18)`. Result: scrubber width 173px (~44% of 390 viewport),
  visibly downgraded from "progress bar" to "position hint" while
  preserving the JS `(index/(total-1))*100%` placement math relative to the
  short track. SW `CACHE_APP` bumped v15→v16. Falsified alternatives A
  Falsified alternatives A (12/12/22 too tight — credit reads as glued to action) and C (16/16/28 —
  16px on essay→credit still feels cramped against the essay's 1.9 line-height).
  Falsified scrubber s2 (segments, 30 works blows out horizontally) and s3
  (dots, same 30-count spatial problem). Evidence: `tests/evidence/sketches-
  t_645b44c2/{before,A-tight,B-airy,C-medium,final}` + `scrubber/{s1,s2,s3}`.
- **2026-09-03 — Homepage bottom action-area single-line rewrite (t_23059633):**
  Product/design owner asked for a systemic pass on homepage rhythm and
  polish. Real-device audit on iPhone 390×844 (via `artbook-prod-firstpaint.png`,
  automated smoke shot) identified three converging problems in the bottom
  action area: (1) the 48×1px α0.6 gold hairline rule between
  "Continue reading" and "了 解 更 多" was optically **cut by the italic
  g/n descenders**, reading as an underline of the English line rather than
  a divider — the semantic separation defined 2026-09-01 (t_4c2a874b) had
  visually collapsed; (2) the English + Chinese pair carried **identical
  semantics** (both mean "enter detail") — double-language treatment on a
  functional label is decoration, not information, and diverges from
  Tate/MoMA-style single-language gallery signage; (3) bottom stack density
  reached **5 layers in 175px** (title / artist / EN / rule / ZH / date-capsule),
  reversing the intended breathing rhythm — the largest gap (55px) sat
  between artist and CR (least related), while the smallest gap (25px)
  sat between CR and 了解更多 (identical semantics). Three-variant
  self-adjudicated review, rendered as **Playwright CSS-injection frames on
  the live production site** (single source of design truth = the real
  running app, per MEMORY-recorded practice; see
  `sketches/t_23059633/render-variants.mjs`,
  `evidence/t_23059633/{00-before,01-A-precision,02-B-reduction,03-C-fusion}.png`):
  **A** precision — keep bilingual, thicken/widen the rule (72×1.5px α0.9),
  shrink EN to 14px, ZH to 12px; **B** reduction — delete EN and rule,
  keep single "了 解 更 多 ›" (Songti 14px 0.32em ink-2 + Georgia 16px gold
  chevron α0.85); **C** fusion — inline single row with 4px gold dot
  separator. **Scores (breathing / museum-signage fit / gold-accent weight /
  top-bottom symmetry / cost):** A 6/7/8/7/med = 28; **B 9/9/9/9/low = 45**;
  C 5/4/6/6/med = 24. **B selected.** Rationale: (a) a single functional
  label per action is the first-principles version of "one action, one
  affordance"; (b) the chevron carries the same visual weight the hairline
  aspired to but as a **verb** (points forward) rather than decoration —
  gold accent is preserved, semantics improved; (c) top-bottom symmetry
  established — one "收藏夹" pill up top, one "了 解 更 多 ›" text-link at
  the bottom (both single, both restrained); (d) `.learn-inline`
  `margin-top` compresses `44px → 36px` because artist name and action now
  read as one authored-content group, with the fixed `.date-capsule` chrome
  layer carrying the outer boundary — realigns the reversed rhythm.
  Losing variants archived to `evidence/t_23059633/` with token annotations
  overlaid on each frame. Numeric changes: `js/feed.js` slideHTML replaced
  `learn-inline__en` + `learn-inline__rule` spans with a single
  `learn-inline__zh` span (aria-hidden); `.learn-inline` becomes
  `flex-direction: row` + `align-items: baseline` + `gap: 6px` +
  `padding: 10px 24px`; `.learn-inline__zh` `font-size: 13px → 14px`,
  `letter-spacing: 0.3em → 0.32em`, `margin-left: 0.3em → 0.32em`;
  `.learn-inline__chevron` Georgia 16px gold α 0.85 with `+3px translateX`
  active state (mirrors detail-page hover-→-active adaptation for touch,
  per SOUL.md rule "hover is not a mobile state"); tests
  `tests/artwork-aspect-ratio.spec.js:99` and `tests/feed-alignment.spec.js:89`
  updated to assert the new selectors and null-check the removed ones;
  `sw.js` `CACHE_APP` v16→v17. Evidence attached: four full-viewport
  iPhone screenshots with token overlays.
- **2026-09-02 — Detail scrubber removed, replaced with typographic folio mark
  (t_8d4351d6):** After the t_645b44c2 visual upgrade shipped, product/design
  owner reviewed it and rejected the entire visual language: "太丑了，如果没法
  做好看就去掉吧". Diagnosis on Playwright iPhone 12 (390×844) screenshot of
  `#/work/cma-145719` (page 14/28): the upgraded scrubber (50% width, 3px
  track, 12px gold dot with 3px halo) reads as a **miniature iOS Music/Podcast
  scrubber** — the dot's gold tint and halo mimic a tappable thumb, the
  horizontal track mimics a drag surface, yet the component is
  `pointer-events: none`. The width reduction (100% → 50%) hoped to demote it
  from "progress bar" to "position hint" but did not address the underlying
  problem: **it uses control vocabulary for a static label**. Root cause is
  category-of-language, not thickness or width. Three-way self-adjudicated
  review of replacements (A printed page-number glyph "NN · total" in Kaiti
  SC 12px α 0.42 letter-spacing 0.24em / B remove entirely / C hidden 4-tick
  ex-libris strip 32×6px in the info-card top-right): scored on
  {克制度, 信息传达, 语义正确性, 与现有系统一致, 边界情形稳健} × 25 each,
  totaling **A 118 / B 107 / C 81 out of 125**. A chosen. Falsification
  notes: B (nothing) loses the "at 28/28 you've reached the end" signal
  that keeps users from thinking swipe is broken at boundaries; C's 4-tick
  strip visually collided with the iOS wifi-signal icon convention (four
  ascending horizontal marks with one highlighted) — verified on
  Playwright screenshot of both first- and 14th-work positions, the ticks
  are legible but read as connectivity, not location. Implementation:
  new class `.detail-folio-mark` replaces `.detail-scrubber` inside
  `.artwork-info-card`; text `${zeroPad2(index+1)} · ${total}` with
  middle-dot separator (α 0.28) and body digits α 0.42; Kaiti SC serif at
  12px / letter-spacing 0.24em / tabular-nums for stable width across
  index changes; `role="doc-pagenumber"` (WAI-ARIA DPUB, correct semantic
  for a printed folio) instead of `role="progressbar"`; single-work: not
  rendered. SW `CACHE_APP` bumped v16→v17. Tests updated: 3 spec files
  swap `.detail-scrubber[aria-valuenow]` assertions for a text-content
  reader (`currentFolio()` regex-extracts the current index from
  `.detail-folio-mark`). Sketch evidence: `sketches/t_8d4351d6/{baseline,
  A,B,C}-{p1,p14}-{full,strip}.png`.
- **2026-09-03 — Detail-page folio context by entry source + edge exit gesture,
  and collection-page white-screen fix (t_b944f6c5):**
  Product/design owner asked for three related behaviors: (1) left/right swipe
  on the detail page should follow **the sequence of the entry path**, not
  always "same-issue works" — i.e. entering from favorites should swipe through
  favorites, entering from related-works should swipe through the related list;
  (2) at the leftmost edge (first work of the folio), a further right-swipe
  should trigger **exit**; and (3) tag pills and artist links on the detail
  page must open working aggregation pages (currently white-screen because
  `js/app.js` never imports `mountTag`/`mountArtist` from `js/collection.js`,
  though it registers their routes — the classic "import fails silently but
  the whole module graph halts" pitfall from HERMES.md §1). Three-variant
  self-adjudicated review, evidence in `sketches/t_b944f6c5/`, scoring on
  {心理模型 · 视觉克制 · 手势直觉 · 可实现 · 保持既有资产} × 20 each:
  **B (publication) 94 / A (strong-context) 68 / C (breadcrumb) 64**.
  **B wins**: feed entries keep their cross-issue paging (the t_e578fc0d
  cross-issue banner + flip transition stays intact — it *is* the daily-report
  identity of the product); non-feed entries (favorites / related / collection)
  get list-terminated folios with an edge-exit affordance. Falsification: A
  loses the feed's daily-report cross-issue value by treating all sources
  uniformly; C introduces a persistent top breadcrumb pill that pushes the
  hero image down 40px and visually collides with the top-right `.detail-close`
  — violating the museum-guide restraint set on 2026-08-26 and the
  `.detail-close` treatment on t_ace5cc6b (2026-09-01). Chosen implementation
  contract:

  * folio context carried via `sessionStorage["artbook.folioCtx"]` (shape
    `{source, ids[], entryId, meta}`); URL stays `#/work/<id>`; detail.js
    reads-and-clears on mount. Refresh in a detail page degrades to feed
    semantics — the deep link stays shareable and self-contained.
  * `siblingCtx` gains `source` and `meta` fields; the existing cross-issue
    logic (`nextIssueDate` / `prevIssueDate`) becomes a no-op when
    `source !== "feed"`.
  * At the first work of a non-feed folio, a right-swipe past 60px surfaces
    a left-side 40×40 exit badge (same warm-glass treatment as
    `.detail-close`) plus a 12px `--ink-2` "松手退出" label; past 120px or
    velocity ≥ 0.55 px/ms, releasing calls the existing `exitDetail(el)`.
    The symmetric behavior applies at the last work for non-feed folios
    (right-side badge). Feed folio boundary behavior is unchanged.
  * The `.detail-folio-mark` line ("NN · total") gains an optional
    Sans-serif prefix — `收藏 · ` / `相关 · ` / `画家 · ` / `标签 · ` —
    at 11px `--ink-2` with letter-spacing 0.06em, margin-right 6px from
    the Kaiti page-number digits. Feed source: no prefix (unchanged).
    Aria label ("第 N 幅，共 M 幅") remains prefix-free.
  * Collection page (tag / artist) fix ships as **one import line** in
    `js/app.js` plus the click-handler that writes `folioCtx` before
    `navigate(#/work/...)`. Tag page's header title is the tag name
    itself (no "标签" prefix on the header, because the whole page is
    that tag); artist page keeps the fixed "画家" title because the
    intro block already shows the artist's name in full. Artist-page
    grid cards show **year** instead of artist name under each card
    (removing 47× visual redundancy on a single-artist page); tag-page
    grid cards keep artist name. Full grid tokens inherit favorites'
    two-column masonry (`columns:2`, `column-gap 14px`, `card-stack
    22px`); grid image `object-fit: contain` preserves aspect ratio
    (already set in `.card .th img`, verified in app.css line 1315).

  DESIGN.md schema: three new component blocks — `detail-folio-mark`
  gains a comment paragraph for the prefix, `collection-page-header` and
  `collection-page-grid` are new (whitelisted sub-tokens only: color,
  background, fontFamily, fontSize; per-page prose differences described
  in `docs/collection-page-spec.md`). Full interaction spec:
  `docs/detail-navigation-context-spec.md` (14-item acceptance checklist
  covering all three sources × boundary behaviors × 折角 prefix); page
  visual spec: `docs/collection-page-spec.md` (12-item acceptance
  checklist covering header, intro, grid, and the folioCtx handoff).
  Sketch evidence: `sketches/t_b944f6c5/{A-strong-context,B-publication,
  C-breadcrumb}.html` + `evidence/*.png` renders + `EVAL.md`
  scoring.
