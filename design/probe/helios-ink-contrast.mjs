// Ink over a photograph: how much light the line actually adds, and where it
// loses. The canvas is screened — it only ever adds — so its increment is
// a*(1-plate): strongest over a dark plate, nothing over a bright one. Two
// questions, one instrument:
//
//   1. Does the line hold? ink pixels, mean lift, the fraction whose lift falls
//      under the visible threshold, the bins of plate luminance where it loses,
//      and the ink's own hue (does the chapter's light survive the filter?).
//   2. Does the line collide with what the people wear or hold? The mean hue of
//      the body cutout's own ink, and the distance from the chapter's light.
//
// A: the composition. B: the same frame with the canvas hidden = the plate under
// the ink. Every variant gets a FRESH page: the fold's depth, the glint and the
// handoff are all one-shot states, so a control measured in a settled page is
// not the control for a treatment. Only --ink-pool differs between variants.
//
// Observed (2026-10-07, 1440x900 dsf2, Chromium via CDP 9241):
//   The plate under the ink is never bright — brightPlate 0.0–0.9% in every
//   scene, so the line does not die over lit cloth; it dies of its own
//   faintness (creators' 108-circle torus: lost 25.1% at pool 0).
//   The pool raises the line's lift and lowers that fraction monotonically:
//   creators 51.6 -> 60.6 lift, lost 25.1 -> 21.8% (pool 0 -> .75);
//   inquiry 61.4 -> 68.9, lost 14.7 -> 14.2%. Shipped at .3 (see helios.css):
//   most of the gain, none of the visible dimming of the photograph.
//   Hue, not brightness, is what collides: the ink is screened, and
//   screen(pale ink, warm plate) sums, so an apricot ink over a warm plate
//   lands within 11–13 degrees of the hues the people themselves carry —
//   measured, inquiry inkHue 21.7 vs bodyHue 10.4. INK_HUE_SHIFT exists to
//   feel that lever: -45 puts the same drawing 19 degrees off the plate.
//   Limitation: the leaders fold draws only inside a window of its own
//   runway; outside it the canvas is retired and ink reads 0. Its rows are
//   usable at .5/.75 (lift 47.2/48.7, lost 14.1/13.8%); at .3 it is flaky.
//
// Usage: CDP_PORT=9241 node design/probe/helios-ink-contrast.mjs
// Env: PROBE_BASE, INK_POOLS="0,.3,.5,.75", SCENES, PROBE_OUT
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.env.PROBE_OUT || '/tmp/helios-ink';
const BASE = process.env.PROBE_BASE || 'http://127.0.0.1:4001/';
const POOLS = (process.env.INK_POOLS || '0,.3,.5,.75').split(',').map(parseFloat);
const SCENES = (process.env.SCENES || 'creators,inquiry,leaders').split(',');
const W = +(process.env.PROBE_W || 1440), H = +(process.env.PROBE_H || 900);
// A feeling knob, not a treatment: extra hue rotation on the canvas, so the
// same drawing can be felt in a light chosen against the plate's own hue
// instead of derived from the chapter's. The halo stays as authored.
const HUE_SHIFT = process.env.INK_HUE_SHIFT === undefined ? null : +process.env.INK_HUE_SHIFT;
// The canvas' own chroma lever. The ink is authored per chapter now, so the
// sheet's saturate(.55) — tuned for one warm default ink — is a candidate to
// move. null means "as authored".
const SATS = (process.env.INK_SATURATES || '').split(',').filter(Boolean).map(parseFloat);
if (!SATS.length) SATS.push(null);
const VARIANTS = [];
for (const pool of POOLS) for (const sat of SATS) VARIANTS.push({ pool, sat });
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Decoding happens where a decoder already exists (the browser); Node never
// grows a PNG parser.
const MEASURE = `(async (payload) => {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [ia, ib] = await Promise.all([load('data:image/png;base64,' + payload.a), load('data:image/png;base64,' + payload.b)]);
  const w = ia.width, h = ia.height;
  const read = (img) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; };
  const A = read(ia), B = read(ib);
  const lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
  const hueOf = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return null; let x = 60 * (mx === r ? ((g - b) / (mx - mn)) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn)); if (x < 0) x += 360; const t = x * Math.PI / 180; return [Math.cos(t), Math.sin(t)]; };
  const EDGES = [0, .1, .2, .3, .4, .55, 1];
  const bins = EDGES.slice(0, -1).map((lo, i) => ({ lo, hi: EDGES[i + 1], n: 0, lift: 0, lost: 0 }));
  let ink = 0, lost = 0, liftSum = 0, bright = 0, inkChroma = 0, plateChroma = 0;
  let hueCos = 0, hueSin = 0, hueN = 0;
  for (let i = 0; i < A.length; i += 4) {
    const lb = lum(B, i), la = lum(A, i), lift = (la - lb) * 255;
    if (lift <= 1) continue;                      // no light added here: not the ink
    ink++;
    liftSum += lift;
    const cA = Math.max(A[i], A[i + 1], A[i + 2]) - Math.min(A[i], A[i + 1], A[i + 2]);
    const cB = Math.max(B[i], B[i + 1], B[i + 2]) - Math.min(B[i], B[i + 1], B[i + 2]);
    inkChroma += cA; plateChroma += cB;
    if (lift < 6) lost++;
    if (lb > .4) bright++;
    if (lift > 10) { const hv = hueOf(A[i], A[i + 1], A[i + 2]); if (hv) { hueCos += hv[0]; hueSin += hv[1]; hueN++; } }
    const bi = EDGES.findIndex((lo, k) => lb >= lo && lb < EDGES[k + 1]);
    if (bi >= 0) { bins[bi].n++; bins[bi].lift += lift; if (lift < 6) bins[bi].lost++; }
  }
  const hue = hueN ? (Math.atan2(hueSin / hueN, hueCos / hueN) * 180 / Math.PI + 360) % 360 : null;
  const pct = (a, b) => b ? +(100 * a / b).toFixed(1) : null;
  return {
    size: [w, h], ink, lost, lostPct: pct(lost, ink),
    meanLift: ink ? +(liftSum / ink).toFixed(2) : null,
    brightInkPct: pct(bright, ink),
    inkHue: hue === null ? null : +hue.toFixed(1),
    inkChroma: ink ? +(inkChroma / ink).toFixed(1) : null,
    plateChroma: ink ? +(plateChroma / ink).toFixed(1) : null,
    chromaGain: ink ? +((inkChroma - plateChroma) / ink).toFixed(1) : null,
    bins: bins.map(b => ({ lo: b.lo, hi: b.hi, n: b.n, meanLift: b.n ? +(b.lift / b.n).toFixed(2) : null, lostPct: pct(b.lost, b.n) })),
  };
})`;

// What the people themselves are wearing or holding: the alpha-weighted mean hue
// of the body cutout, in its own colours. Compared against the ink's hue this is
// the collision number — a line cannot be told from a shawl of its own hue.
const BODY_HUE = `(async (selector) => {
  const img = document.querySelector(selector);
  if (!img || !img.naturalWidth) return null;
  const cv = document.createElement('canvas');
  const s = 160 / img.naturalWidth;
  cv.width = Math.max(1, Math.round(img.naturalWidth * s)); cv.height = Math.max(1, Math.round(img.naturalHeight * s));
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, cv.width, cv.height);
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let cos = 0, sin = 0, n = 0, sat = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 200) continue;
    const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
    if (mx === mn || mx < 40) continue;
    const x = 60 * (mx === r ? ((gg - b) / (mx - mn)) : mx === gg ? 2 + (b - r) / (mx - mn) : 4 + (r - gg) / (mx - mn));
    const hue = ((x % 360) + 360) % 360, t = hue * Math.PI / 180;
    const weight = (mx - mn) / mx;
    cos += Math.cos(t) * weight; sin += Math.sin(t) * weight; sat += weight; n++;
  }
  return n ? { hue: +(((Math.atan2(sin, cos) * 180 / Math.PI) + 360) % 360).toFixed(1), pixels: n, chroma: +(sat / n).toFixed(3) } : null;
})`;

const cdp = await connect();
const p = await newPage(cdp);
await p.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: false });

const clipOf = async selector => p.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) } })()`);
const grab = async (clip, scale = 1) => (await p.s('Page.captureScreenshot', { format: 'png', clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale }, captureBeyondViewport: true })).data;
const sameFrame = (a, b) => p.evaluate(`(async (x) => { const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s }); const [i1, i2] = await Promise.all([load('data:image/png;base64,' + x.a), load('data:image/png;base64,' + x.b)]); const w = i1.width, h = i1.height; const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(i1, 0, 0); const d1 = g.getImageData(0, 0, w, h).data; g.clearRect(0, 0, w, h); g.drawImage(i2, 0, 0); const d2 = g.getImageData(0, 0, w, h).data; let big = 0; for (let i = 0; i < d1.length; i += 4) { if (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]) > 10) big++; } return { big, of: d1.length / 4, quiet: big / (d1.length / 4) < 0.0006 } })(${JSON.stringify({ a, b })})`, { awaitPromise: true });

const report = { base: BASE, viewport: [W, H], pools: POOLS, sats: SATS, hueShift: HUE_SHIFT, scenes: {} };
for (const id of SCENES) {
  report.scenes[id] = { rows: [] };
  for (const v of VARIANTS) {
    const pool = v.pool, sat = v.sat;
    await p.goto(BASE, 2200);
    await p.evaluate(`document.querySelectorAll('.helios-air').forEach(e => { e.style.animationPlayState = 'paused' }); true`);
    await p.evaluate(`document.documentElement.style.setProperty('--ink-pool', '${pool}')`);
    if (HUE_SHIFT !== null || sat !== null) {
      const chain = `saturate(${sat === null ? '.55' : sat}) hue-rotate(${8 + (HUE_SHIFT ?? 0)}deg) brightness(var(--ink-light)) contrast(1.28) drop-shadow(0 0 20px rgb(233 174 100 / var(--ember))) drop-shadow(0 0 60px #c96e281a)`;
      await p.evaluate(`(() => { let s = document.getElementById('ink-canvas-filter'); if (!s) { s = document.createElement('style'); s.id = 'ink-canvas-filter'; document.head.append(s); } s.textContent = '[data-look="helios"] .helios-possibility__thought canvas { filter: ${chain} !important }'; return true })()`);
    }
    await p.evaluate(`(() => { const d = document.querySelector('[data-chapter="${id}"]'); if (d && !d.open) d.querySelector('summary').click(); return true })()`);
    await p.evaluate(`(async () => { for (let i = 0; i < 80; i++) { if (document.querySelector('[data-life="${id}"][data-drawing-ready]')) return true; await new Promise(r => setTimeout(r, 125)) } return false })()`);
    await sleep(1800);
    await p.evaluate(`document.querySelector('[data-life="${id}"]').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    const stage = await clipOf(`[data-life="${id}"]`);
    // The page owns its clock: wait until two frames agree before believing one.
    let a = null, aHalf = null, quiet = null;
    for (let i = 0; i < 4; i++) {
      const q1 = await grab(stage, .4); await sleep(350);
      const q2 = await grab(stage, .4);
      quiet = await sameFrame(q1, q2);
      if (quiet.quiet) { aHalf = q1; break; }
    }
    if (aHalf) a = await grab(stage);
    if (!a) { console.log(`${id} pool=${pool}: never quiet (${quiet && quiet.big} px moving)`); report.scenes[id].rows.push({ pool, error: 'unstable', quiet }); continue; }
    const hid = await p.evaluate(`(() => { const el = document.querySelector('[data-life="${id}"] .helios-possibility__thought'); if (!el) return false; el.style.visibility = 'hidden'; return true })()`);
    if (!hid) { console.log(`${id} pool=${pool}: no thought plane to hide`); report.scenes[id].rows.push({ pool, error: 'no plane' }); continue; }
    await sleep(420);
    const b = await grab(stage);
    await p.evaluate(`(() => { const el = document.querySelector('[data-life="${id}"] .helios-possibility__thought'); if (el) el.style.visibility = ''; return true })()`);
    // The reveal clock is not frozen while we hide the plane: if the plate
    // drifted in that interval, the diff is not the ink. Require the frame we
    // return to to be the frame we left.
    await sleep(420);
    const a2 = await grab(stage, .4);
    const back = aHalf ? await sameFrame(aHalf, a2) : { big: 0, quiet: true };
    if (!back.quiet) console.log(`${id} pool=${pool}: plate drifted ${back.big} px while the ink was hidden — the diff carries both`);
    const m = await p.evaluate(`(${MEASURE})(${JSON.stringify({ a, b })})`, { awaitPromise: true });
    const bodyHue = await p.evaluate(`(${BODY_HUE})(${JSON.stringify(`[data-life="${id}"] .helios-possibility__body img`)})`, { awaitPromise: true });
    const hueDelta = m.inkHue !== null && bodyHue ? Math.round(Math.abs(((m.inkHue - bodyHue.hue + 540) % 360) - 180) === 180 ? 180 : Math.min(Math.abs(m.inkHue - bodyHue.hue), 360 - Math.abs(m.inkHue - bodyHue.hue))) : null;
    const row = { pool, sat, stablePx: quiet.big, driftedPx: back.big, ...m, bodyHue, hueDelta };
    report.scenes[id].rows.push(row);
    const tag = `${id}-pool${pool}${sat === null ? '' : `-sat${sat}`}${HUE_SHIFT === null ? '' : `-hue${HUE_SHIFT}`}`;
    writeFileSync(`${OUT}/${tag}.png`, Buffer.from(a, 'base64'));
    writeFileSync(`${OUT}/${tag}-plate.png`, Buffer.from(b, 'base64'));
    console.log(`${id.padEnd(9)} pool=${String(pool).padEnd(4)} sat=${String(sat).padEnd(5)} ink=${String(m.ink).padStart(7)} lift=${String(m.meanLift).padStart(5)} lost=${String(m.lostPct).padStart(5)}% chroma=${String(m.inkChroma).padStart(5)} (plate ${String(m.plateChroma).padStart(5)}, +${String(m.chromaGain).padStart(5)})  inkHue=${String(m.inkHue).padStart(5)} bodyHue=${bodyHue ? String(bodyHue.hue).padStart(5) : '  n/a'}  Δhue=${String(hueDelta).padStart(4)}`);
  }
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log('\nwrote', `${OUT}/report.json`);
cdp.close();
