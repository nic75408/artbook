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
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    secondaryTextColor: "{colors.ink-2}"
    ruleColor: "{colors.gold}"
    ruleOpacity: 0.6
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
  detail-scrubber:
    # 2026-09-02 t_6fe0245e — replaces numeric folio "N / total" inside .artwork-info-card.
    # Sub-colors (track/dot/halo) and geometry (thickness, dot size) live in the Components
    # prose section — the YAML schema only carries whitelist props.
    backgroundColor: "transparent"
    height: 8px
    width: "100%"
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
- **Learn more inline link (`.learn-inline`):** A gallery-label style text link
  rendered below the artwork+title module, centered on the slide's main axis.
  Composed of a Georgia italic gold "Continue reading" line, a 48px gold hairline
  rule (opacity 0.6), and a wide-tracked (0.3em) Songti SC "了 解 更 多" line in
  secondary ink. No button container, no shadow, no rotation. Active state
  stretches the rule to 64px and darkens the Chinese line to primary ink.
  Replaces the previous circular black-fill learn button (decommissioned
  2026-09-01).
- **Detail close (`.detail-close`):** Fixed circular button at top-right, 40×40,
  with a **frosted-glass** background: `rgba(245,241,234,0.55)` + `backdrop-filter: blur(14px)`
  and a faint 1px `rgba(29,27,22,0.08)` border. Shadow reduced to
  `0 1px 4px rgba(29,27,22,0.06)` so the control no longer reads as a "sticker"
  on top of the hero image. `:active` state raises background α back to 0.85
  (touch feedback for iPhone; no `:hover`-only state). Text color stays
  `colors.ink` — the near-black icon glyph carries the contrast, so WCAG 1.4.11
  (≥ 3:1 for UI components) holds on both light and dark artworks.
- **Folio (`.folio`) — DEPRECATED for multi-work sequences (2026-09-02, t_6fe0245e):**
  The numeric "N / total" pill is hidden via `display: none` inside
  `.artwork-info-card` and superseded by `.detail-scrubber`. The token entry is
  retained only as fallback for single-artwork date pages that still use a
  standalone folio (currently none). Do not add new call sites.
- **Detail scrubber (`.detail-scrubber`) — replaces numeric folio (2026-09-02,
  t_6fe0245e; visual upgrade 2026-09-02, t_645b44c2):** A pointer-events-none
  position indicator rendered as the first child of `.artwork-info-card` when
  `siblingCtx.ids.length > 1`. **50% container width centered** (via
  `margin: 0 auto`), 12px tall, `margin-bottom: 14px` (--group-title-body).
  Interior: a **3px** `rgba(29,27,22,0.10)` horizontal track (radius 1.5px) and
  a **12×12** `colors.gold` dot with a **3px `bg-card` halo plus
  `0 1px 3px rgba(29,27,22,0.18)` drop shadow**. Dot position is
  `left: (index / (total - 1)) * 100%` with `translate(-50%, -50%)` so the
  first work snaps to 0% and the last snaps to 100% **of the short track**.
  Intent: **暗示性位置指示器**, not a precise progress bar — the reduced width
  and elevated dot presence tell the user "you can slide" without implying a
  100%-completion goal, aligned with the restrained museum-guide tone. ARIA:
  `role="progressbar"`, `aria-valuemin=1`, `aria-valuemax=total`,
  `aria-valuenow=index+1`, `aria-label="当前作品位置"`.
  `prefers-reduced-transparency: reduce` swaps to solid `#FDFBF7` halo.
  Single-work fallback: the scrubber is not rendered — no empty box residue
  (guarded by `.detail-scrubber:empty { display: none }`).
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
  (12/12/22 too tight — credit reads as glued to action) and C (16/16/28 —
  16px on essay→credit still feels cramped against the essay's 1.9 line-height).
  Falsified scrubber s2 (segments, 30 works blows out horizontally) and s3
  (dots, same 30-count spatial problem). Evidence: `tests/evidence/sketches-
  t_645b44c2/{before,A-tight,B-airy,C-medium,final}` + `scrubber/{s1,s2,s3}`.
