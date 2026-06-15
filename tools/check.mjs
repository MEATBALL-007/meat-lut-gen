#!/usr/bin/env node
/* Regression checks for the single-file app. Runs in CI and locally:
 *     node tools/check.mjs
 * Covers what can be verified without a browser: JS syntax, shader-uniform
 * consistency, presence of feature hooks, and unit tests of the pure logic
 * (tone-curve spline, reference-match mapping, RAW embedded-JPEG scan, decodes).
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

let failed = 0;
const ok  = m => console.log('  ✓ ' + m);
const bad = m => { console.log('  ✗ ' + m); failed++; };
const assert = (c, m) => c ? ok(m) : bad(m);

// Pull a `function NAME(...) { ... }` out of the source by brace matching.
function fn(name){
  let s = js.indexOf('function ' + name + '(');
  if(s < 0) throw new Error('function not found: ' + name);
  if(js.slice(s - 6, s) === 'async ') s -= 6;            // keep the async keyword
  let i = js.indexOf('{', s), depth = 0, j = i;
  for(; j < js.length; j++){ const c = js[j];
    if(c === '{') depth++; else if(c === '}'){ depth--; if(depth === 0){ j++; break; } } }
  return js.slice(s, j);
}
const line = re => (js.match(re) || [''])[0];

console.log('1) JS syntax');
{
  const tmp = join(root, '.._check_tmp.js');
  writeFileSync(tmp, js);
  try { execFileSync('node', ['--check', tmp]); ok('node --check passes'); }
  catch(e){ bad('node --check: ' + (e.stderr || e.message)); }
  finally { unlinkSync(tmp); }
}

console.log('2) Shader-uniform consistency');
{
  const reg = new Set([...line(/const names = \[([\s\S]*?)\];/).matchAll(/'([^']+)'/g)].map(m=>m[1]));
  const used = new Set([...js.matchAll(/uniforms\['([^']+)'\]/g)].map(m=>m[1]));
  const frag = html.match(/const FRAG = `([\s\S]*?)`;/)[1];
  const decl = new Set();
  for(const d of frag.matchAll(/uniform\s+\w+\s+([^;]+);/g))
    for(const part of d[1].split(',')) decl.add(part.trim().split('[')[0]);
  assert([...used].every(u=>reg.has(u)), 'every used uniform is registered');
  assert([...reg].every(r=>used.has(r)), 'every registered uniform is used');
  assert([...reg].every(r=>decl.has(r.split('[')[0])), 'every registered uniform is shader-declared');
}

console.log('3) Feature hooks present');
for(const [name, pat] of [
  ['RAW import','extractEmbeddedJpeg'], ['video','setVideoSource'],
  ['reference match -> controls','matchControls'], ['curve node delete','contextmenu'],
  ['LUT bake','bakeLUT'], ['.cube export','lutToCube'], ['HALD export','exportHald'],
  ['zip pack','makeZip'], ['cover image','buildCoverCanvas'], ['scopes','scopesDraw'],
  ['waveform','drawWaveform'], ['rgb parade','drawParade'], ['vectorscope','drawVectorscope'],
  ['preview modes','setViewMode'], ['media+looks library','buildLibraryUI'], ['saved looks store','getLooks'],
  ['gamut matrix','uGamutMat'], ['gamut derivation','g2709'], ['float lut bake','RGBA32F'],
  ['share link','shareLink'], ['share restore','restoreFromHash'],
  ['workspace panels','layoutPanels'], ['dock frames','makeFrame'], ['tab drag-dock','enableTabDrag'],
  ['dock resize','enableDockResize'], ['layout save','saveLayout'],
  ['drag-drop overlay','dropOverlay'],
  ['undo/redo history','pushHistory'], ['apply snapshot','applyState'], ['mobile layout','isNarrow'],
  ['history panel','buildHistoryUI'], ['history jump','historyJump'], ['history labels','historyLabel'],
  ['project save','saveProject'], ['project load','loadProject'], ['autosave','scheduleAutosave'],
]) assert(js.includes(pat), `${name} (${pat})`);

console.log('4) Pure-logic unit tests');
{
  // source-decode region: lin2srgbJS .. srcDecodeJS (profiles + log curves)
  const sStart = js.indexOf('function lin2srgbJS');
  const sFn = fn('srcDecodeJS');
  const srcRegion = js.slice(sStart, js.indexOf(sFn) + sFn.length);
  const api = new Function(
    line(/const clamp01 = [^\n]*;/) + '\n' + fn('makeSpline') + '\n' + fn('matchControls') + '\n' +
    srcRegion + '\n' + fn('jpegEnd') + '\n' + fn('extractEmbeddedJpeg') + '\n' +
    'return {makeSpline, matchControls, srcDecodeJS, SRC_PROFILES, GAMUTS, jpegEnd, extractEmbeddedJpeg};'
  )();

  // tone-curve spline: diagonal is identity, monotone has no overshoot
  const idln = api.makeSpline([[0,0],[1,1]]);
  assert([0,0.137,0.5,0.83,1].every(x=>Math.abs(idln(x)-x) < 1e-9), 'spline diagonal == identity');
  const sc = api.makeSpline([[0,0],[0.5,0.9],[1,1]]);
  let mono = true, prev = -1;
  for(let i=0;i<=100;i++){ const y = sc(i/100); if(y < prev-1e-9 || y > 1.0000001) mono = false; prev = y; }
  assert(mono, 'spline stays monotone & within [0,1]');

  // reference-match mapping
  const src = {mean:[0.45,0,0], std:[0.2,0.1,0.1]};
  const neutral = api.matchControls(src, src);
  assert(Object.values(neutral).every(v=>Math.abs(v) < 1e-9), 'match neutral (ref==src) => all 0');
  assert(api.matchControls(src, {mean:[0.45,-0.05,0.06], std:[0.2,0.12,0.12]}).temp > 0, 'warmer ref => temp +');
  assert(api.matchControls(src, {mean:[0.45,0.06,-0.05], std:[0.2,0.1,0.1]}).temp < 0, 'cooler ref => temp -');
  assert(api.matchControls(src, {mean:[0.6,0,0], std:[0.2,0.1,0.1]}).exposure > 0, 'brighter ref => exposure +');

  // source-decode profiles: Rec.709 profile 0 is identity; logs are monotone in-range
  assert([0,0.2,0.5,0.8,1].every(x=>Math.abs(api.srcDecodeJS(x,0)-x) < 1e-12), 'source profile 0 (Rec.709) == identity');
  const slog3i = api.SRC_PROFILES.findIndex(p=>p.n.includes('S-Log3'));
  assert(slog3i > 0, 'S-Log3 profile present');
  { let mono = true, prev = -1, inRange = true;
    for(let i=0;i<=64;i++){ const y = api.srcDecodeJS(i/64, slog3i);
      if(y < prev - 1e-9) mono = false; if(y < -1e-9 || y > 1 + 1e-9) inRange = false; prev = y; }
    assert(mono && inRange, 'S-Log3 decode is monotone & within [0,1]'); }
  // 18% mid-grey for S-Log3 (code 420/1023) -> 0.18 linear -> ~0.461 sRGB display
  assert(Math.abs(api.srcDecodeJS(420/1023, slog3i) - 0.461) < 0.02, 'S-Log3 18% grey lands at Rec.709 mid');
  // every non-identity source profile must decode monotone (no bad log constants)
  for(let i=1;i<api.SRC_PROFILES.length;i++){
    let mono = true, prev = -1, inRange = true;
    for(let k=0;k<=64;k++){ const y = api.srcDecodeJS(k/64, i);
      if(y < prev - 1e-9) mono = false; if(y < -1e-9 || y > 1 + 1e-9) inRange = false; prev = y; }
    assert(mono && inRange, `profile #${i} (${api.SRC_PROFILES[i].n}) decode monotone & in [0,1]`);
  }
  // ARRI LogC4: 18% mid-grey (code ~0.2784) -> 0.18 linear -> ~0.461 sRGB display
  const logc4i = api.SRC_PROFILES.findIndex(p=>p.n.includes('LogC4'));
  assert(logc4i > 0, 'LogC4 profile present');
  assert(Math.abs(api.srcDecodeJS(0.2784, logc4i) - 0.461) < 0.02, 'LogC4 18% grey lands at Rec.709 mid');
  // Canon C-Log / C-Log2 present alongside C-Log3
  assert(api.SRC_PROFILES.some(p=>/C-Log2/.test(p.n)) && api.SRC_PROFILES.some(p=>/C-Log$/.test(p.n)), 'Canon C-Log & C-Log2 present');
  assert(api.SRC_PROFILES.length >= 20, `profile count (${api.SRC_PROFILES.length}) covers the camera logs`);

  // gamut matrices: derived from D65 primaries, so neutral grey is preserved
  // (each row sums to 1, i.e. M*[1,1,1]=[1,1,1]); Rec.709 space is identity.
  const rowsum = (m,r)=> m[r][0]+m[r][1]+m[r][2];
  for(const [k,m] of Object.entries(api.GAMUTS)){
    for(let r=0;r<3;r++) assert(Math.abs(rowsum(m,r)-1) < 1e-6, `gamut ${k} preserves grey (row ${r})`);
  }
  const isId = m => [0,1,2].every(i=>[0,1,2].every(j=>Math.abs(m[i][j]-(i===j?1:0))<1e-9));
  assert(isId(api.GAMUTS.none), 'identity gamut is identity');
  assert(!isId(api.GAMUTS.sgamut3cine) && !isId(api.GAMUTS.awg4), 'wide gamuts are non-identity');
  // every profile carries a gamut matrix; standard spaces stay identity
  assert(api.SRC_PROFILES.every(p=>Array.isArray(p.m)), 'every profile has a gamut matrix');
  assert(isId(api.SRC_PROFILES[0].m), 'Rec.709 profile gamut is identity');
  const slog3 = api.SRC_PROFILES.find(p=>/S-Log3/.test(p.n));
  assert(slog3.gk === 'sgamut3cine' && !isId(slog3.m), 'S-Log3 uses S-Gamut3.Cine matrix');

  // RAW embedded-JPEG scan: pick the largest preview, skip nested thumbnail
  const jpeg = (n, nested) => { const a=[0xFF,0xD8];
    if(nested){ const t=jpeg(40,false); const pl=[0,0,0,0,0,0,...t]; const L=pl.length+2;
      a.push(0xFF,0xE1,(L>>8)&0xff,L&0xff,...pl); }
    a.push(0xFF,0xE0,0x00,0x10,...Array(14).fill(0x11));
    a.push(0xFF,0xDA,0x00,0x0C,...Array(10).fill(0x33));
    for(let i=0;i<n;i++){ const v=(i*7)&0xff; a.push(v===0xFF?0x00:v); }
    a.push(0xFF,0xD9); return a; };
  const small = jpeg(400,false), big = jpeg(40000,true);
  const file = new Uint8Array([0x49,0x49,0x2A,0,...Array(200).fill(0xAB), ...small,
    ...Array(800).fill(0xCD), ...big, ...Array(3000).fill(0xEF)]);
  const blob = await api.extractEmbeddedJpeg({ arrayBuffer: async()=> file.buffer });
  const seg = new Uint8Array(await blob.arrayBuffer());
  assert(seg.length === big.length, 'RAW scan picks the largest preview');
  assert(seg[0]===0xFF && seg[1]===0xD8 && seg[seg.length-1]===0xD9, 'extracted segment is a whole JPEG');
}

console.log(failed ? `\nFAILED (${failed})` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
