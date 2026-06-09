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

Split toning · faded black · curve editor · reference look-match · film-stock
presets · auto variations · multi-image + motion preview · scopes · log/color
space · multi-format LUT export · auto cover image · pack workflow.
