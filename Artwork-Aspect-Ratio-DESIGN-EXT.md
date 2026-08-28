---
version: alpha
name: Artbook Museum Guide
# Aspect ratio handling and artwork layout rules on top of the base visual system.
artwork-layout:
  homepage-hero:
    container:
      maxWidth: "{spacing.content-max}"
      paddingTop: "calc(56px + var(--safe-t))"
      paddingBottom: "calc(120px + var(--safe-b))"
      framePadding: 8px
      frameBorder: "1px solid {colors.line}"
      backgroundColor: "{colors.bg-card}"
    image:
      fit: contain
      backgroundColor: "{colors.bg-card}"
      maxWidth: "min(86vw, calc((100dvh - var(--pad-t) - var(--pad-b) - 200px) / var(--r, 1.2)))"
      aspectRatio: "calc(1 / var(--r, 1.2))" # r = height / width
  detail-hero:
    container:
      maxWidth: "100%"
      backgroundColor: "{colors.bg-card}"
    image:
      fit: contain
      backgroundColor: "{colors.bg-card}"
  related-thumbnail:
    container:
      maxWidth: "160px"
      backgroundColor: "{colors.bg-card}"
      border: "1px solid {colors.line}"
      rounded: "{rounded.card}"
    image:
      fit: contain
      backgroundColor: "{colors.bg-card}"

---

## Artwork Layout & Aspect Ratio

This section extends the base layout tokens to define how artwork images are
framed and scaled across three key contexts: homepage hero slide, detail hero,
and related/recommendation thumbnails.

### Shared Principles

- Respect the original artwork aspect ratio (no forced cropping to a uniform
  ratio).
- Use the warm paper card background (`colors.bg-card`) as letterbox fill
  where necessary.
- Keep container widths within `spacing.content-max` and horizontal padding
  within `spacing.page-gutter`.
- Align artwork frames and titles on a shared left alignment origin so that
  frames, Chinese titles, and English titles appear on the same vertical axis.

### Aspect Ratio Bands

We classify artworks by their height/width ratio `r`:

- **Normal** — `0.7 ≤ r ≤ 1.3`
- **Tall** — `r > 1.3`
- **Wide** — `r < 0.7`

All bands use `object-fit: contain` to preserve the full artwork, but letterbox
bars appear differently:

- Normal: minimal bars, image nearly fills the frame.
- Tall: bars on left/right.
- Wide: bars on top/bottom.

### Homepage Hero Slide (`artwork-layout.homepage-hero`)

- Container height is `100dvh` with top padding `calc(56px + var(--safe-t))`
  and bottom padding `calc(120px + var(--safe-b))`.
- The frame (`.frame`) uses 1px border and 8px inner padding on
  `colors.bg-card`.
- The image container `.frame .ph` width is computed as:

  - `min(86vw, calc((100dvh - var(--pad-t) - var(--pad-b) - 200px) / r))`
  - `aspect-ratio: 1 / r` (height / width).

- Image fit:

  - `object-fit: contain`.
  - `background-color: colors.bg-card`.

### Detail Hero (`artwork-layout.detail-hero`)

- Container width is 100% of the content width.
- Background uses `colors.bg-card` for consistency with frames.
- Image fit:

  - `object-fit: contain`.
  - `background-color: colors.bg-card`.

### Related / Recommendation Thumbnails (`artwork-layout.related-thumbnail`)

- Thumbnail containers share a common max width (around 160px) and align within
  the content grid.
- Background and border follow frame conventions.
- Image fit:

  - `object-fit: contain`.
  - Height varies with the original aspect ratio.

This recommended system matches Option 2 (preserve original ratio with
letterboxing) described in `artwork-aspect-ratio-spec.md` and should be used as
the default for all new artwork contexts.