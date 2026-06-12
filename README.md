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

**Phase 5 — Film-stock presets ✅**

- One-click **film looks** — Portra 400, Velvia 50, Cinestill 800T, Kodachrome
  64, Fuji Superia, Ektar 100, Polaroid 600, Agfa Vista, plus B&W (Ilford HP5,
  Tri-X 400) — each a curated bundle of values for the **existing** controls.
- An **Intensity** slider blends every preset from neutral (0%) to full (100%),
  so each look is dialable. Presets are *not* a new shader stage — they just
  populate bake-safe controls, so there's nothing extra to bake.
- After a preset you can keep refining with any control (curves, split toning,
  reference match…); **Reset Grade** clears the selection back to neutral.

**Phase 6 — Auto variations ✅**

- A **Variations** grid renders live thumbnails of one-click deltas on top of
  your *current* grade — Warmer / Cooler / Brighter / Punchy / Soft / Moody /
  Teal-Orange / Faded / Greener. Click one to commit that move and the grid
  re-rolls from the new base.
- Thumbnails are rendered through the real shader (each variant grade), so what
  you preview is exactly what you get.

**Phase 7 — Log / colour space ✅**

- An **Input → Source / Camera Log** selector decodes the loaded footage into
  display Rec.709 before grading, baked into a 1‑D LUT the shader samples.
  Picking a camera log makes the exported `.cube` a **“[log] → Rec.709”
  conversion** that you apply to that camera's footage in your NLE.
- Profiles (grouped by brand): Rec.709/sRGB · Linear (sRGB / 2.4) · Cineon ·
  **Sony** S‑Log3, S‑Log2 · **Canon** C‑Log3 · **Panasonic** V‑Log, V‑Log L ·
  **Fujifilm** F‑Log, F‑Log2 · **Nikon** N‑Log · **ARRI** LogC3 (EI800) ·
  **RED** Log3G10 · **Blackmagic** Film Gen5 · **DJI** D‑Log · **Apple** Log.
- The log curves are the published 1‑D transfer functions (CI tests check
  identity + S‑Log3 mid‑grey). **Tonal decode only — no per‑camera gamut
  matrix**, so fine‑tune saturation, and verify any “(approx)” profile against
  the maker's official LUT before selling.
- Rec.709 stays an exact identity, so a neutral grade still bakes to an identity
  LUT.

**Phase 8 — Multi-format LUT export ✅**

- **Export .cube** (sizes 17 / 33 / 65) and a true **HALD `.png`** (level 8 =
  64³). The export re-runs the **exact same `applyGrade` shader** over an
  identity S³ grid rendered to an FBO, reads it back, and serialises it — so the
  baked LUT matches the live preview pixel-for-pixel.
- `.cube` loads in Resolve / Premiere / FCP / OBS / Photoshop; the HALD `.png`
  works with ffmpeg / G’MIC / ImageMagick.
- This is the payoff of the whole *identity-at-default* discipline: a neutral
  grade exports a numerically exact identity LUT (verified: correct S³ entry
  count, red-fastest ordering, 0→1 endpoints, error within 8-bit quantisation).
- Title field + a top-bar **Export .cube** button for one-click delivery.

**Phase 9 — Scopes ✅**

- A live **RGB histogram** of the graded preview, sampled from the WebGL canvas
  and drawn additively. Decoupled from the input rate (render flags it dirty, a
  `requestAnimationFrame` loop redraws), so dragging stays smooth.

**Phase 10 — Multi-image + motion preview ✅**

- Load **several stills at once** (multi-select or drop); a **filmstrip** under
  the preview switches between them so you can check a look across shots.
- A **motion preview** ▶ button auto-cycles the loaded images, simulating a
  sequence. Remove images with the × on each thumbnail.

**Phase 11 — Auto cover image ✅**

- One-click **Cover .png** — a branded 1600×900 before/after still (original
  left, graded right, divider + BEFORE/AFTER labels, LUT title + MEAT LUT mark)
  for selling the LUT.

**Phase 12 — Pack workflow ✅**

- Add the current grade as a named **look**, stack several, then **Export Pack
  (.zip)** — every look baked to `LUTs/<name>.cube` plus a `cover.png` and a
  `README.txt` manifest, bundled by a tiny dependency-free (STORE) zip writer.
- With no looks added, the current grade is exported as a single-LUT pack.

The grade math is written so the **exact same shader pipeline** can later be
re-run on an identity LUT grid to bake an exact `.cube` export (Phase 8). A
neutral grade is verified to be a numerical identity, so the future round-trip
is exact.

> **Color-science note (Phase 1 default):** grading runs directly on the
> image's stored 0..1 RGB values (display/encoded space), which is the natural
> model for a LUT applied to Rec.709 video. Log decode + linear/working-space
> options arrive in Phase 7.

## Inputs

- **Stills** — JPG/PNG/WebP/GIF/AVIF/BMP.
- **Camera RAW** — ARW/CR2/CR3/NEF/DNG/RAF/ORF/RW2… via the embedded full-size
  JPEG preview (pure-JS marker scan, no dependencies, offline).
- **Video footage** — any codec the browser decodes natively (MP4/H.264, WebM,
  MOV/H.264, Ogg). The current frame is the live source: play / scrub and grade
  in real time; export bakes the same grade. Exotic codecs (ProRes/RAW/MXF) must
  be transcoded first.
- Load several stills for a filmstrip + motion preview, or drag-and-drop.

## Workspace

Every control group is a **floating panel** (Premiere-style): drag it by its
header anywhere, resize from the bottom-right corner, collapse (▾) or close (✕).
The **Panels** menu in the top bar toggles any panel and has **Reset layout**;
your arrangement is saved to `localStorage` and restored next time.

## Save your work

Edits are tracked: **Undo / Redo** (buttons or `Ctrl/⌘+Z` / `Ctrl/⌘+Shift+Z`).
**Save** downloads the look as a `.meatlut.json` file and **Open** loads one back.
Your latest state also **autosaves** to `localStorage` and is restored next visit
(use **Reset Grade** to start fresh).

## Usage

Open `index.html` in any WebGL2 browser. Click **Load Image** (or drag a file
onto the preview) and start grading. Drag the divider to compare before/after.
Rearrange the workspace panels to taste.

## Roadmap

~~Split toning~~ · ~~faded black~~ · ~~curve editor~~ · ~~reference look-match~~ ·
~~film-stock presets~~ · ~~auto variations~~ · ~~multi-image + motion preview~~ · ~~scopes~~ ·
~~log/color space~~ · ~~multi-format LUT export~~ · ~~auto cover image~~ · ~~pack workflow~~.
