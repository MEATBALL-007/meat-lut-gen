# LUT GEN — MEAT LUT creation studio

A single-file web tool for crafting color looks and exporting professional,
sellable LUT files. Vanilla HTML/CSS/JS, WebGL2 for all live grading, no backend
— drop `index.html` on GitHub Pages and go.

## Status: full build (Phases 1–10) ✅

**Grading engine (live WebGL2 fragment shader)**
- White balance (Temperature, Tint)
- Tone (Exposure, Contrast, Highlights, Shadows, Whites, Blacks)
- 3-way color — Lift / Gamma / Gain (color wheel + level each)
- HSL color mixer (Hue / Sat / Luminance per band)
- Saturation & Vibrance
- Split toning (shadow/highlight hue + amount + balance)
- Faded-black matte floor
- **Curve editor** — RGB + per-channel R/G/B, draggable points, monotone-cubic
  interpolation, baked to a 1D LUT (click add · drag · shift-click delete · dbl-click reset)

**Reference look-match** — upload a target + your source still; computes a
per-channel mean/std transfer as **editable R/G/B curves** to refine.

**Presets & variations** — parametric film-stock starters (Clean Neutral, Warm
Portrait Film, Cool Cinematic, Faded Retro, Punchy Teal-Orange) and one-click
auto variations (warmer/cooler/faded/punchier/more-or-less saturated) → saved looks.

**Previews** — before/after split slider, multi-image switching, live video
(motion) preview.

**Scopes & safety** — RGB histogram, vectorscope with a skin-tone reference line,
and highlight/shadow clipping zebras.

**Color space / Log** — input transfer Rec.709 / Sony S-Log3 / Panasonic V-Log /
Canon C-Log. Log is decoded to Rec.709 for grading and the conversion is **baked
into the exported LUT**; output is Rec.709, labelled with its intended input.

**Export** — exact `.cube` (17/33/65) baked by re-running the exact shader on an
identity grid; PNG LUT; approximate Lightroom `.xmp`; intensity bake (any % plus a
subtle/medium/strong trio). Plus an **auto cover image**, **batch pack export**,
**QC contact sheet**, and save/load grade JSON.

> **Exactness:** `.cube` is exact (preview == export by construction). A neutral
> grade is verified to round-trip to an identity LUT — there's an in-app
> "Verify identity" button. `.xmp` is an approximation of the supported sliders.

## Usage

Open `index.html` in any WebGL2 browser. Load an image (or drag one in), grade,
and export. For log footage, set the **Input** transfer first.

> **Note:** use your own images for look-match; don't clone copyrighted frames for resale.
