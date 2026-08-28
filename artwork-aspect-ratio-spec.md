# Artwork Layout & Aspect Ratio — Design Options

This document defines three candidate systems for handling artwork aspect ratios
across the Artbook Museum Guide app: homepage hero slide, detail hero image, and
related/recommendation thumbnails. All options are grounded in the existing
DESIGN.md and `app.css` layout tokens:

- `--page-gutter: 22px`
- `--content-max: 340px`
- slide paddings `--pad-t`, `--pad-b`
- frame and info card grid alignment via `--align-origin`

Each option is described in terms of container constraints, `object-fit`
behavior, and cropping/letterboxing rules. At the end, one option is selected as
our recommended universal system.

## Shared Constraints

Across all options we keep these constraints:

- Mobile-first layout with `max-width: var(--content-max)` and
  `padding: 0 var(--page-gutter)` for major blocks.
- Slide height is `100dvh` with scroll snap.
- Artwork frames use the existing `.frame` styling: 1px border, 8px inner
  padding, background `colors.bg-card`.
- Artwork images inside frames and detail hero areas follow one of the
  strategies below, but always respect safe-area paddings and avoid overlaying
  critical controls.

## Option 1 — Uniform Aspect Ratio + Center Cropping

### Idea

Pick a single target aspect ratio (e.g. 3:4, height / width ≈ 1.33) for all
artwork containers and always crop images to this ratio via CSS `object-fit:
cover`. This produces visually consistent card heights in feeds and
recommendation grids.

### Container Spec

- Homepage slide frame:
  - `.frame .ph` gets a fixed aspect-ratio of 4:3 or 3:4 and a width tuned to
    `min(86vw, var(--content-max))`.
  - Height is controlled by the aspect ratio and `object-fit: cover`.
- Detail hero image:
  - `.detail-hero .ph` uses the same aspect ratio.
  - Image fills the container fully, cropping excess.
- Related thumbnails:
  - Recommendation cards use a consistent aspect ratio for all thumbnails.
  - Heights are aligned in rows for neat grids.

### Image Fit

- `object-fit: cover` for all artwork images.
- `object-position: center center` ensures cropping happens equally from all
  sides, keeping the central subject.

### Cropping Rules

- Vertical (tall) artworks: top and bottom are cropped more aggressively to fit
  the target ratio.
- Horizontal (wide) artworks: left and right are cropped.
- Square artworks: minimal cropping.

### Pros

- Strong visual consistency in grids and slides.
- Easy for engineering: one ratio to implement everywhere.

### Cons

- Risk of cropping away important content for extreme aspect ratios.
- Less faithful representation for works where the frame is integral.

## Option 2 — Preserve Original Ratio + Letterbox Background

### Idea

Always preserve the original artwork aspect ratio and fit the image inside a
variable-height container using `object-fit: contain`. Extra space is filled
with the warm paper background (`colors.bg-card`), producing letterbox bars.

### Container Spec

- Homepage slide frame:
  - `.frame .ph` width is computed to fit the available height and margin
    constraints, with height determined by the original aspect ratio.
  - The current implementation (`width: min(86vw, calc((100dvh - var(--pad-t)
    - var(--pad-b) - 200px) / var(--r)))` and `aspect-ratio: calc(1 / var(--r))`)
    is aligned with this option.
- Detail hero image:
  - `.detail-hero .ph` uses `width: 100%` and height determined by the image
    ratio.
  - `object-fit: contain` ensures full artwork visibility.
- Related thumbnails:
  - Thumbnail containers share a common max-width but height varies with the
    artwork.

### Image Fit

- `object-fit: contain` for all artwork images.
- Background uses `colors.bg-card` to maintain frame consistency.

### Letterboxing Rules

- Vertical artworks: letterbox bars on left/right.
- Horizontal artworks: letterbox bars on top/bottom.
- Square artworks: minimal bars if any.

### Pros

- Faithful representation of original artworks.
- Aligns with the museum guide ethos of preserving frames and composition.

### Cons

- In grids and recommendation sections, card heights vary, which can reduce
  alignment.

## Option 3 — Ratio Bands + Mixed Cover/Contain Strategy

### Idea

Classify artworks by aspect ratio into three bands and handle each band with a
specific strategy:

- Normal (0.7 ≤ r ≤ 1.3): preserve ratio with `object-fit: contain`.
- Tall (r > 1.3): cover with cropping of top/bottom; prefer full width.
- Wide (r < 0.7): cover with cropping of left/right; prefer full height.

### Container Spec

- Homepage slide frame:
  - `.frame .ph` uses the current ratio-based width computation.
  - For normal artworks, keep `object-fit: contain`.
  - For tall/wide, switch to `object-fit: cover` with band-specific cropping.
- Detail hero image:
  - `.detail-hero .ph` uses `width: 100%`.
  - Fit strategy follows the band rules.
- Related thumbnails:
  - Use slightly more aggressive cropping (`object-fit: cover`) to reduce card
    height variance, but still preserve central subject.

### Image Fit

- Normal band: `object-fit: contain`.
- Tall band: `object-fit: cover`, `object-position: center top` to favor
  important top content (e.g. faces).
- Wide band: `object-fit: cover`, `object-position: center center`.

### Pros

- Balances fidelity and visual consistency.
- Extreme ratios handled gracefully with clear rules.

### Cons

- Slightly more complex for engineering: band detection and per-band rules.

## Recommended Option — Preserve Original Ratio + Letterbox Background (Option 2)

Given the Artbook Museum Guide’s museum-like tone and emphasis on respecting
artworks as framed objects, Option 2 (preserve original ratio with
letterboxing) is recommended as the universal system.

### Rationale

- Aligns with the app’s identity: warm paper, subtle frames, and editorial
  hierarchy over app chrome.
- Prevents accidental cropping of critical content, especially for very tall
  or wide works.
- Matches the current implementation for homepage slides, minimizing the
  engineering change set.

### Applicability

- Homepage hero slides: use Option 2 for `.frame .ph` and image inside.
- Detail hero images: use Option 2 for `.detail-hero .ph` and image.
- Related/recommendation thumbnails: apply Option 2 within fixed-width cards,
  accepting some height variation in exchange for fidelity.

Engineering can implement this by:

- Using `object-fit: contain` for all artwork images.
- Ensuring `background-color: colors.bg-card` for artwork containers.
- Keeping the existing ratio-based width/height computation for slides.

A separate DESIGN.md extension will formalize these rules as component
properties and layout tokens.