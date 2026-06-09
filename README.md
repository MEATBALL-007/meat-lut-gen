# LUT GEN — MEAT LUT creation studio

An internal, single-file web tool for crafting color looks and exporting
professional, sellable LUT files. Vanilla HTML/CSS/JS, WebGL2 for all live
grading, no backend — drop `index.html` on GitHub Pages and go.

## Status

**Phase 1 — Core grading engine ✅**

- MEAT LUT KMUTT theme + layout skeleton, WebGL2 canvas.
- Live grading in a single WebGL2 fragment shader:
  - White balance (Temperature, Tint)
  - Tone (Exposure, Contrast, Highlights, Shadows, Whites, Blacks)
  - 3-way color — Lift / Gamma / Gain (color wheel + level each)
  - HSL color mixer (Hue / Sat / Luminance per band: Red, Orange, Yellow,
    Green, Aqua, Blue, Magenta)
  - Saturation & Vibrance
- Before/after split slider with image upload (+ drag & drop).

**Phase 2 — Split toning & faded black ✅**

- **Split Toning** — independent Shadow / Highlight hue + strength, plus a
  Balance control to slide the shadow↔highlight crossover. The colour push is
  luma-neutral (the hue's own luma is removed) so it only shifts colour, never
  brightness. Live hue swatches on each hue slider.
- **Faded Black** — a matte film look: Fade lifts the black floor (milky
  shadows) and Highlight Rolloff lowers the white ceiling, implemented as a
  single linear `[0,1] → [floor, ceil]` remap.
- Both new sections are an **exact identity at their defaults**, so the planned
  neutral-grade LUT round-trip (Phase 8) stays numerically exact.

**Phase 3 — Tone curve ✅**

- Interactive **SVG curve editor** with **RGB** (master) + per-channel **R / G
  / B** curves. Click to add points, drag to shape, double-click a point to
  remove it; endpoints keep their x but their y (black/white point) can move.
- Curves use a **monotone-cubic (Fritsch–Carlson)** spline — no overshoot — and
  are baked into a **256×1 RGBA 1D-LUT texture** (R/G/B in `.rgb`, master in
  `.a`) that the shader samples. A half-texel sample correction makes the
  default diagonal a **bit-exact identity**.
- Applied right after the 3-way colour stage, following the Photoshop "RGB"
  model (per-channel curve, then the master curve on every channel).

**Phase 4 — Reference look-match ✅**

- Load a **reference still** (button, click the thumbnail, or drop) and the grade
  automatically matches the source image's colour to it — a Reinhard-style
  **statistical transfer**: match the per-channel **mean & standard deviation**
  in a decorrelated **Rec.709 YCbCr** space (mean of Y = exposure, std of Y =
  contrast, Cb/Cr mean = colour cast, Cb/Cr std = saturation spread).
- Image statistics are measured in JS on a 128×128 downsample; the shader does a
  cheap per-pixel affine map `ycc' = (ycc - srcMean)·(refStd/srcStd) + refMean`,
  blended by an **Amount** slider (auto-set to 100% on first load).
- Runs as the **first** grade stage, so curves / split toning / fade refine on
  top. **Amount 0 (or no reference) is an exact identity**; with fixed stats the
  transfer is a plain RGB→RGB function, so it bakes into the LUT exactly.

The grade math is written so the **exact same shader pipeline** can later be
re-run on an identity LUT grid to bake an exact `.cube` export (Phase 8). A
neutral grade is verified to be a numerical identity, so the future round-trip
is exact.

> **Color-science note (Phase 1 default):** grading runs directly on the
> image's stored 0..1 RGB values (display/encoded space), which is the natural
> model for a LUT applied to Rec.709 video. Log decode + linear/working-space
> options arrive in Phase 7.

## Usage

Open `index.html` in any WebGL2 browser. Click **Load Image** (or drag an image
onto the preview) and start grading. Drag the divider to compare before/after.

## Roadmap

~~Split toning~~ · ~~faded black~~ · ~~curve editor~~ · ~~reference look-match~~ ·
film-stock presets · auto variations · multi-image + motion preview · scopes ·
log/color space · multi-format LUT export · auto cover image · pack workflow.
