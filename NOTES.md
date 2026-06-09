# NOTES — LUT GEN (MEAT LUT creation studio)

โน้ตสำหรับการพัฒนาโปรเจกต์นี้ เก็บไว้กันลืม / ใช้ onboard คนใหม่

## ภาพรวม
- **คืออะไร:** เครื่องมือเว็บสำหรับสร้าง color look แล้ว export เป็นไฟล์ LUT (ขายได้)
- **Repo:** `MEATBALL-007/meat-lut-gen` · default branch = `main`
- **โครงสร้าง:** ไฟล์เดียว `index.html` — vanilla HTML/CSS/JS + WebGL2, **ไม่มี backend** → วางบน GitHub Pages ได้เลย
- **Theme:** สี KMUTT/MEAT อยู่ใน CSS `:root` (`--accent:#FA4616`, `--accent-2:#FFC72C` ฯลฯ)
- **ฟอนต์:** Space Grotesk (UI) + JetBrains Mono (ตัวเลข/ค่าทางเทคนิค)

## หลักการสำคัญ (ห้ามลืม)
- **ทุก control ต้องเป็น identity เป๊ะที่ค่า default** — เพราะ shader chain เดียวกัน
  (`applyGrade`) จะถูกนำไป bake บน identity LUT grid เป็น `.cube` ใน Phase 8
  ต้อง round-trip แบบ exact (neutral grade = numerical identity)
- **Color space:** เกรดบนค่า RGB 0..1 ที่เก็บมา (display/encoded space) ไม่ใช่
  scene-linear — log decode / linear working space รอ Phase 7
- การเกรดทั้งหมดอยู่ใน **fragment shader ตัวเดียว** → preview แบบ real-time
- **Single source of truth คือ object `grade`** (จาก `defaultGrade()`); ทุก control
  เขียนลงนี่ แล้ว `render()` push เป็น uniform เข้า shader

## การเพิ่ม control ใหม่ — ต้องแก้ 6 ที่
1. `defaultGrade()` — เพิ่ม state (ตั้ง default = identity)
2. Shader: เพิ่ม `uniform`
3. Shader: เพิ่มขั้นตอนคณิตใน `applyGrade`
4. `buildProgram()` → array `names` — ลงทะเบียนชื่อ uniform (เก็บ cache location)
5. `render()` — push ค่าด้วย `gl.uniform*`
6. `buildUI()` — เพิ่ม section/slider

Helper ที่มีให้ใช้:
- `addSection(title, open)` — section พับได้ (`<details>`)
- `addSlider(parent, {label,min,max,step,get,set,fmt,swatch})` — รองรับ nested
  state ผ่าน get/set; `fmt` = ฟอร์แมตค่าที่โชว์; `swatch` = callback คืนสี CSS
  (ใช้กับ hue slider เพื่อโชว์ chip สี)
- `addWheel(parent, key, name)` — color wheel 3-way

## ลำดับ Pipeline ใน `applyGrade` (จุดสำหรับแทรกขั้นตอนใหม่)
1. White balance
2. Exposure
3. Contrast
4. 3-way color (gain → lift → gamma)
5. Tonal regions (highlights / shadows / whites / blacks)
6. HSL per band
7. Saturation + Vibrance
8. **Split toning** (Phase 2)
9. **Faded black** (Phase 2)

## Roadmap / Phases
- [x] **Phase 1** — Core grading engine
- [x] **Phase 2** — Split toning + Faded black
- [ ] **Phase 3** — Curve editor *(ถัดไป)*
- [ ] **Phase 4** — Reference look-match
- [ ] **Phase 5** — Film-stock presets
- [ ] **Phase 6** — Auto variations
- [ ] Multi-image + motion preview · Scopes
- [ ] **Phase 7** — Log / color space
- [ ] **Phase 8** — Multi-format LUT export (`.cube` bake) ← จุดที่ identity สำคัญ
- [ ] Auto cover image · Pack workflow

## Git / Workflow
- **Dev branch:** `claude/hopeful-pasteur-mbs8qx`
- **Push ได้ต่อเมื่อ** ติดตั้ง **Claude GitHub App** บน repo + ให้สิทธิ์
  **Contents: Read and write**
  - ถ้าไม่มีสิทธิ์: `git push` → 403 · MCP write → "Resource not accessible by integration"
- Commit identity ต้องเป็น `user.email=noreply@anthropic.com`, `user.name=Claude`
  จึงจะขึ้น **Verified** (ลายเซ็นเกิดตอน push ผ่าน path ของระบบ แก้ในเครื่องไม่ได้)
- **Container เป็นแบบ ephemeral** — งานที่ไม่ commit + push จะหายเมื่อ session ปิด

## การทดสอบ
- ไม่มี build step — เปิด `index.html` ในเบราว์เซอร์ที่รองรับ WebGL2
- เช็ค JS syntax ได้ด้วย `node --check` (ดึงเนื้อหาใน `<script>` ออกมาทดสอบ)
- สภาพแวดล้อม dev นี้ **ไม่มี GLSL validator** → ต้องรีวิว shader ด้วยตาให้ละเอียด
