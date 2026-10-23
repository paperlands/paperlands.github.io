// Phase 4 — Another agreement. `square` becomes `ngon len side`, `4` becomes
// `side`, `90` becomes `360/side`. The side count is the active instrument and the
// chosen length is preserved.
//   PROBE=fourth-turn-phase4.mjs bash design/probe/fourth-turn.sh
//
// The vet this probe answers:
//   * Can we recognise what persists?
//   * Is the changing exterior angle understandable?
//   * Does the composition accommodate the larger footprint honestly?
//   * Does this feel like exploration rather than selecting presets?
//
// The strongest measurement here is the *side* itself: every member of the family
// draws its first edge along the same heading, so the horizontal run of ink from
// the first vertex is the side length. If that run is the same at three, four,
// five and six sides, the rule is one rule and the length was preserved.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-phase4';
const rec = `${out}/recording`;
rmSync(out, { recursive: true, force: true });
mkdirSync(rec, { recursive: true });
const page_url = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const evidence = [], results = {};
const assert = (ok, label) => { evidence.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) results.failures = [...(results.failures || []), label]; };
const WORLD = 2 * 500 * Math.tan(Math.PI / 6);

async function shot(page, name, clip) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
// The instrument layer is hidden for every measurement of the drawing, so a size
// is the native figure's and never the rail's.
const hideInstrument = (page, on) => page.evaluate(on
  ? `(() => { if (!document.querySelector('#probe-hide')) { const s = document.createElement('style'); s.id = 'probe-hide'; s.textContent = '.instrument,.grip,.thread{display:none !important}'; document.head.append(s); } return true; })()`
  : `(() => { document.querySelector('#probe-hide')?.remove(); return true; })()`);
// Ink geometry of the drawing, plus the horizontal run of ink from a given point
// on a given row: the first edge of the figure, which is the side length.
function inkBox(file, probe) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
px = im.load()
def gold(x, y):
    r, g, b = px[x, y]
    return r > 140 and g > 95 and r > b + 30
minx, miny, maxx, maxy, count = w, h, -1, -1, 0
for y in range(h):
    for x in range(w):
        if gold(x, y):
            count += 1
            minx = min(minx, x); maxx = max(maxx, x); miny = min(miny, y); maxy = max(maxy, y)
out = {'count': count, 'box': None if count < 20 else [minx, miny, maxx, maxy],
       'w': (maxx - minx) if count >= 20 else None, 'h': (maxy - miny) if count >= 20 else None,
       'cx': ((minx + maxx) / 2 - w / 2) if count >= 20 else None,
       'cy': ((miny + maxy) / 2 - h / 2) if count >= 20 else None, 'size': [w, h]}
p = json.loads(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else None
if p and out['box']:
    x0, y0 = int(p['x']), int(p['y'])
    run = 0
    for dy in range(-4, 5):
        y = y0 + dy
        if y < 0 or y >= h: continue
        gaps = 0
        x = max(0, x0)
        length = 0
        while x < w:
            if gold(x, y):
                length += 1; gaps = 0
            else:
                gaps += 1
                if gaps > 2: break
            x += 1
        run = max(run, length)
    out['sideRun'] = run
print(json.dumps(out))
`, `${out}/${file}`, JSON.stringify(probe ?? null)], { encoding: 'utf8' }));
}
function pixelDiff(a, b) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
import sys, json
A = Image.open(sys.argv[1]).convert('RGB'); B = Image.open(sys.argv[2]).convert('RGB')
if A.size != B.size:
    print(json.dumps({'sizeMismatch': [A.size, B.size]})); raise SystemExit
d = ImageChops.difference(A, B)
print(json.dumps({'bbox': d.getbbox(), 'max': max(max(c) for c in d.getextrema())}))
`, a, b], { encoding: 'utf8' }));
}
const state = (page) => page.evaluate(`JSON.stringify({
  representation: window.fourthTurn.representation,
  values: window.fourthTurn.values,
  domain: window.fourthTurn.domain,
  active: window.fourthTurn.active,
  instrument: window.fourthTurn.instrument,
  stagePosts: window.fourthTurn.stagePosts,
  handRuns: window.fourthTurn.handRuns,
  rewrites: window.fourthTurn.rewrites,
  lit: window.fourthTurn.lit,
  argument: window.fourthTurn.argument,
  lastExecuted: window.fourthTurn.lastExecuted,
  composedShown: window.fourthTurn.composedShown,
  status: document.querySelector('#status').textContent,
  reading: document.querySelector('#reading').textContent,
  verb: document.querySelector('#verb').textContent,
  execText: document.querySelector('#executed').textContent,
  rows: [...document.querySelectorAll('.source-row')].map((r) => ({ id: r.dataset.id, code: r.textContent.trim() })),
  figure: (() => { const r = document.querySelector('.figure').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
  scrollY: window.scrollY,
  animations: document.getAnimations().length,
})`);
async function waitFor(page, expression, ms = 8000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await page.evaluate(expression)) return true;
    await sleep(50);
  }
  return false;
}
const figClip = (st) => ({ x: st.figure.x, y: st.figure.y, width: st.figure.w, height: st.figure.h });
// The family, computed from the recipe the page says it is drawing. The same
// arithmetic the call line performs — an independent mirror of it here, so a
// comparison with the measured ink is evidence about the drawing.
function family(st, side, len) {
  const scale = st.figure.h / WORLD;
  const radius = len / (2 * Math.sin(Math.PI / side));
  const theta = (2 * Math.PI) / side;
  const alpha = -theta / 2 - Math.PI / 2;
  const points = [];
  for (let k = 0; k < side; k += 1) {
    const angle = alpha + k * theta;
    points.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  }
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  return {
    scale,
    first: points[0],
    spanW: (Math.max(...xs) - Math.min(...xs)) * scale,
    spanH: (Math.max(...ys) - Math.min(...ys)) * scale,
    boxCx: ((Math.min(...xs) + Math.max(...xs)) / 2) * scale,
    boxCy: -((Math.min(...ys) + Math.max(...ys)) / 2) * scale,
    circumradius: radius,
    vertexY: st.figure.y + st.figure.h / 2 - points[0].y * scale,
    vertexX: st.figure.x + st.figure.w / 2 + points[0].x * scale,
  };
}
async function measure(page, name, probe) {
  await hideInstrument(page, true);
  const st = JSON.parse(await state(page));
  await shot(page, name, figClip(st));
  const box = inkBox(`${name}.png`, probe ? { x: probe.x - st.figure.x, y: probe.y - st.figure.y } : null);
  await hideInstrument(page, false);
  return { box, st };
}
const KEYS = { ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35, Escape: 27 };
const key = async (page, k, keyCode, modifiers = 0) => {
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  await sleep(140);
};


// Contrast, measured from rendered pixels for the instrument's marks and from
// computed styles for the source's tokens. Same method as Phase 3's probe.
function markContrast(file, ground, points) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
im = Image.open(sys.argv[1]).convert('RGB')
g = im.getpixel(tuple(json.loads(sys.argv[3])))
points = json.loads(sys.argv[2])
def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def L(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])
def ratio(a, b):
    la, lb = L(a), L(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
out = {}
for name, (x, y) in points.items():
    best = None
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            p = im.getpixel((x + dx, y + dy))
            r = ratio(p, g)
            if best is None or r > best['ratio']:
                best = {'ratio': round(r, 2), 'pixel': list(p), 'at': [x + dx, y + dy]}
    out[name] = best
out['ground'] = list(g)
print(json.dumps(out))
`, `${out}/${file}`, JSON.stringify(points), JSON.stringify(ground)], { encoding: 'utf8' }));
}
const relLum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const l1 = relLum(a), l2 = relLum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const parseRgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
const blend = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
async function settle(page, ms = 5000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const clean = await page.evaluate(`document.getAnimations().length === 0 && document.querySelectorAll('#flying > *').length === 0`);
    if (clean) return true;
    await sleep(60);
  }
  return false;
}
const threadCrossing = (target) => target.evaluate(`JSON.stringify((() => {
  const line = document.querySelector('#thread-line');
  const pts = (line.getAttribute('points') || '').trim().split(' ').filter(Boolean).map((q) => q.split(',').map(Number)).filter((q) => q.length === 2);
  const svg = document.querySelector('#thread').getBoundingClientRect();
  const segs = [];
  for (let i = 0; i < pts.length - 1; i += 1) segs.push([{ x: svg.left + pts[i][0], y: svg.top + pts[i][1] }, { x: svg.left + pts[i + 1][0], y: svg.top + pts[i + 1][1] }]);
  const rects = [...document.querySelectorAll('#source .code')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const inside = (p, r) => p.x > r.x + 1 && p.x < r.x + r.w - 1 && p.y > r.y + 1 && p.y < r.y + r.h - 1;
  let hits = 0;
  for (const [a, b] of segs) for (const r of rects) for (let t = 0; t <= 1; t += 0.02) if (inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, r)) { hits += 1; break; }
  return { points: pts.length, segments: segs.length, hits };
})())`);

const frames = [];
try {
  const page = await newPage(cdp);
  cdp.on((msg) => {
    if (msg.method === 'Page.screencastFrame' && msg.sessionId === page.sessionId) {
      frames.push({ data: Buffer.from(msg.params.data, 'base64'), ts: msg.params.metadata.timestamp });
      page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
    }
  });
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.goto(page_url, 100);
  assert(await waitFor(page, 'window.fourthTurn?.ready === true'), 'The pinned runtime is ready');
  await waitFor(page, 'window.fourthTurn?.finished === true');
  await waitFor(page, 'window.fourthTurn?.settled === true');

  // Walk to the parameterised square, then generalise it.
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1300);
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1200);
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1100);
  const parameterised = await measure(page, 'phase4-square-before');
  const beforeState = JSON.parse(await state(page));
  assert(beforeState.representation === 'parameterised' && beforeState.active === 'len', 'The length instrument is the one in hand before the generalisation');
  const postsBefore = beforeState.stagePosts;

  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1200);
  const opened = await measure(page, 'phase4-square', { x: family(JSON.parse(await state(page)), 4, 250).vertexX, y: family(JSON.parse(await state(page)), 4, 250).vertexY });
  const ngonState = JSON.parse(await state(page));
  results.ngon = ngonState;
  assert(ngonState.representation === 'ngon', 'The square generalises to a polygon');
  assert(ngonState.stagePosts === postsBefore, `The generalisation is a description, not an execution (${postsBefore} posts)`);
  assert(pixelDiff(`${out}/phase4-square-before.png`, `${out}/phase4-square.png`).bbox === null, 'At four sides the generalisation leaves the drawing pixel for pixel as it was');
  assert(ngonState.values.len === 250 && ngonState.rows.some((r) => r.code === 'ngon 250 4'), 'The chosen length is preserved and written into the call');
  assert(ngonState.rows.some((r) => r.code === 'loop side do') && ngonState.rows.some((r) => r.code === 'left 360/side'), 'The count and the exterior turn are the loop\'s own arguments now');
  assert(ngonState.active === 'side', 'The side count becomes the instrument in hand');
  assert(ngonState.reading === '4 sides · the turn is 90°', `The readout states the changing turn: "${ngonState.reading}"`);

  // The last stop of the chain retires the large invitation: the small replay
  // control is what remains for studying the execution, and the instrument is the
  // subject of the room.
  const stop = JSON.parse(await page.evaluate(`JSON.stringify({
    advanceResting: document.querySelector('#advance').getAttribute('aria-disabled') === 'true',
    replayVisible: document.querySelector('#replay').checkVisibility(),
    emphasis: document.documentElement.dataset.instrument ?? null,
    verbVisible: document.querySelector('#verb').checkVisibility(),
  })`));
  results.stop = stop;
  assert(stop.advanceResting === true && stop.replayVisible === true, `At the polygon the onward arrow rests and the replay remains (${JSON.stringify(stop)})`);

  // The instrument: a vertical rail on the locus of the first vertex.
  const rails = ngonState.instrument.railPoints.map((r) => r.map(Number));
  const edge = rails[0];
  const ticks = rails.slice(1);
  const edgeVertical = Math.abs(edge[0] - edge[2]) < 0.5 && Math.abs(edge[1] - edge[3]) > 50;
  const ticksOnTheLine = ticks.length === 4 && ticks.every((t) => Math.abs((t[0] + t[2]) / 2 - edge[0]) < 0.5 && Math.abs(t[1] - t[3]) < 0.5);
  results.rail = rails;
  assert(edgeVertical && ticksOnTheLine, `The rail is the vertical locus of the first vertex with one notch per member (${JSON.stringify(rails)})`);
  const gripCentre = { x: ngonState.instrument.grip.x + 22, y: ngonState.instrument.grip.y + 22 };
  const model4 = family(ngonState, 4, 250);
  assert(Math.hypot(gripCentre.x - model4.vertexX, gripCentre.y - model4.vertexY) < 2, 'The grip sits on the vertex of the four-sided member');

  // --- the family at one length ---------------------------------------------
  const members = {};
  for (const side of [3, 4, 5, 6]) {
    await page.evaluate(`window.fourthTurn.setValue('side', ${side})`);
    await waitFor(page, `window.fourthTurn.values.side === ${side}`, 2000);
    await sleep(450);
    const st = JSON.parse(await state(page));
    const model = family(st, side, st.values.len);
    const m = await measure(page, `phase4-side-${side}`, { x: model.vertexX, y: model.vertexY });
    members[side] = { box: m.box, model: { spanW: model.spanW, spanH: model.spanH, boxCx: model.boxCx, boxCy: model.boxCy, vertexX: model.vertexX, vertexY: model.vertexY }, values: st.values, reading: st.reading, argument: st.argument };
    await hideInstrument(page, true);
    await shot(page, `phase4-member-${side}`, figClip(st));
    await hideInstrument(page, false);
    await shot(page, `phase4-member-page-${side}`);
  }
  results.members = members;
  // What persists: the side length, measured as the first edge's horizontal run.
  const runs = Object.fromEntries(Object.entries(members).map(([k, v]) => [k, v.box.sideRun]));
  results.sideRuns = runs;
  const runValues = Object.values(runs);
  assert(runValues.every((r) => Math.abs(r - 256) <= 14), `Every member draws the same side length (first-edge runs ${runValues.join(', ')} px for a 250-unit side drawn at 1.025 px/unit)`);
  const spread = Math.max(...runValues) - Math.min(...runValues);
  assert(spread <= 12, `The side length is preserved across the family (spread ${spread} px)`);
  // What changes: the footprint, monotonically and without a re-frame.
  for (const side of [3, 4, 5, 6]) {
    const m = members[side];
    assert(Math.abs(m.box.w - m.model.spanW) <= 16 && Math.abs(m.box.h - m.model.spanH) <= 16, `At ${side} sides the footprint is the regular figure of that length (measured ${m.box.w}x${m.box.h}, modelled ${Math.round(m.model.spanW)}x${Math.round(m.model.spanH)})`);
    assert(Math.abs(m.box.cx - m.model.boxCx) <= 7 && Math.abs(m.box.cy - m.model.boxCy) <= 7, `At ${side} sides the drawing sits where the recipe places it (measured ${m.box.cx},${m.box.cy}; modelled ${Math.round(m.model.boxCx)},${Math.round(m.model.boxCy)})`);
  }
  assert(members[6].box.w > members[4].box.w * 1.9, `Six sides honestly span nearly twice the four-sided footprint (${members[6].box.w} vs ${members[4].box.w} px)`);
  const heights = [3, 4, 5, 6].map((side) => members[side].box.h);
  assert(heights.every((h, i) => i === 0 || h > heights[i - 1]), `The footprint grows with the count, without any re-framing (heights ${heights.join(', ')} px)`);
  const figureSizes = new Set(Object.values(members).map((m) => `${m.values.len}`));
  assert(figureSizes.size === 1 && [...figureSizes][0] === '250', 'The length never moved while the count changed');
  assert(Object.values(members).every((m) => m.argument === String(m.values.side) || m.argument === `250`), 'The call carries the count as its own argument');
  const readings = Object.values(members).map((m) => m.reading);
  assert(readings[0] === '3 sides · the turn is 120°' && readings[3] === '6 sides · the turn is 60°', `The readout follows the exterior angle: ${readings.join(' | ')}`);
  const contained = Object.values(members).every((m) => m.box.box[0] > 2 && m.box.box[1] > 2 && m.box.box[2] < m.box.size[0] - 2 && m.box.box[3] < m.box.size[1] - 2);
  assert(contained, 'Every member of the bounded domain stays inside the fixed stage');
  // The turn arc the instrument draws is the turn the loop makes.
  const sweepFrom = async (side) => {
    await page.evaluate(`window.fourthTurn.setValue('side', ${side})`);
    await waitFor(page, `window.fourthTurn.values.side === ${side}`, 2000);
    await sleep(200);
    return JSON.parse(await page.evaluate(`JSON.stringify((() => {
      const d = document.querySelector('#turn').getAttribute('d') || '';
      const pts = d.split(/[ML]/).filter(Boolean).map((p) => p.trim().split(' ').map(Number));
      if (pts.length < 3) return { sweep: null, points: pts.length };
      const g = document.querySelector('#grip').getBoundingClientRect();
      const f = document.querySelector('.figure').getBoundingClientRect();
      const first = { x: g.x + g.width / 2 - f.x, y: g.y + g.height / 2 - f.y };
      const a = { x: pts[0][0] - first.x, y: pts[0][1] - first.y };
      const b = { x: pts[pts.length - 1][0] - first.x, y: pts[pts.length - 1][1] - first.y };
      const deg = (v) => Math.atan2(v.y, v.x) * 180 / Math.PI;
      let sweep = deg(b) - deg(a);
      while (sweep > 180) sweep -= 360;
      while (sweep < -180) sweep += 360;
      return { sweep: Math.round(Math.abs(sweep)), points: pts.length };
    })())`));
  };
  const sweeps = { 4: await sweepFrom(4), 5: await sweepFrom(5), 6: await sweepFrom(6) };
  results.sweeps = sweeps;
  assert(sweeps[4].sweep === 90 && sweeps[5].sweep === 72 && sweeps[6].sweep === 60, `The arc at the vertex is the exterior turn itself (${sweeps[4].sweep}°, ${sweeps[5].sweep}°, ${sweeps[6].sweep}°)`);

  // --- the instrument's marks, measured against the ground ------------------
  const hexagon = JSON.parse(await state(page));
  const sixRails = hexagon.instrument.railPoints.map((r) => r.map(Number));
  const railMid = [(sixRails[0][0] + sixRails[0][2]) / 2, (sixRails[0][1] + sixRails[0][3]) / 2];
  const instrumentPoints = {
    ring: [Math.round(hexagon.instrument.grip.x + 13), Math.round(hexagon.instrument.grip.y + 22)],
    rail: [Math.round(hexagon.figure.x + railMid[0]), Math.round(hexagon.figure.y + railMid[1])],
    notch: [Math.round(hexagon.figure.x + sixRails[1][0]), Math.round(hexagon.figure.y + sixRails[1][1])],
    spoke: [Math.round(hexagon.figure.x + (Number(hexagon.instrument.spoke[0]) + Number(hexagon.instrument.spoke[2])) / 2), Math.round(hexagon.figure.y + (Number(hexagon.instrument.spoke[1]) + Number(hexagon.instrument.spoke[3])) / 2)],
  };
  const groundPoint = [Math.round(hexagon.figure.x - 40), Math.round(hexagon.figure.y + 40)];
  const marks = markContrast('phase4-member-page-6.png', groundPoint, instrumentPoints);
  results.markContrast = marks;
  assert(['ring', 'rail', 'notch', 'spoke'].every((k) => (marks[k]?.ratio ?? 0) >= 3), `Ring, rail, notch and spoke each clear 3:1 against the ground (${['ring', 'rail', 'notch', 'spoke'].map((k) => k + ' ' + marks[k]?.ratio).join(', ')})`);

  const groundRgb = [0x12, 0x0d, 0x17];
  const tokens = JSON.parse(await page.evaluate(`JSON.stringify((() => {
    const seen = [];
    for (const row of document.querySelectorAll('.source-row')) {
      const rowOpacity = Number(getComputedStyle(row).opacity);
      const state = row.classList.contains('is-lit') ? 'lit' : row.classList.contains('is-past') ? 'past' : 'future';
      for (const token of [...row.querySelectorAll('span')].filter((el) => !el.querySelector('span'))) seen.push({ state, rowOpacity, cls: token.className, color: getComputedStyle(token).color, text: token.textContent });
    }
    return seen;
  })())`));
  let worstToken = { ratio: 99 };
  for (const token of tokens) {
    const ratio = contrast(blend(parseRgb(token.color), groundRgb, token.rowOpacity), groundRgb);
    if (ratio < worstToken.ratio) worstToken = { ratio: Math.round(ratio * 100) / 100, cls: token.cls, state: token.state, text: token.text };
  }
  results.worstToken = worstToken;
  assert(worstToken.ratio >= 4.5, `Every token in the polygon's declaration meets AA against the ground (worst ${worstToken.ratio}:1, ${worstToken.cls} "${worstToken.text}")`);

  // --- a change of agreement, by hand ---------------------------------------
  await page.evaluate('window.fourthTurn.setValue("side", 4)');
  await sleep(400);
  const four = JSON.parse(await state(page));
  const grip = four.instrument.grip;
  const start = { x: Math.round(grip.x + 22), y: Math.round(grip.y + 22) };
  const modelFor = (side) => { const m = family(four, side, four.values.len); return { x: m.vertexX, y: m.vertexY }; };
  const six = modelFor(6);
  await page.s('Page.startScreencast', { format: 'jpeg', quality: 72, everyNthFrame: 1, maxWidth: 900, maxHeight: 560 });
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: start.x, y: start.y, button: 'left', buttons: 1, clickCount: 1 });
  const samples = [];
  const steps = 16;
  for (let i = 1; i <= steps; i += 1) {
    const y = Math.round(start.y + (six.y - start.y) * (i / steps));
    await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: start.x, y, button: 'left', buttons: 1 });
    await sleep(70);
    if (i % 4 === 0) samples.push(JSON.parse(await state(page)));
  }
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: start.x, y: six.y, button: 'left', buttons: 0 });
  await page.s('Page.stopScreencast');
  await sleep(500);
  results.drag = samples;
  const sides = samples.map((s) => s.values.side);
  assert(sides.includes(5) && sides[sides.length - 1] === 6, `The hand walked the family ${sides.join(' → ')}`);
  assert(samples.every((s) => s.values.len === 250), 'The chosen length was preserved through every change of count');
  assert(samples.every((s) => s.argument === String(s.values.side)), 'The argument followed the hand at every step');
  const gripOnVertex = samples.every((s) => {
    const m = family(s, s.values.side, s.values.len);
    const centre = { x: s.instrument.grip.x + 22, y: s.instrument.grip.y + 22 };
    return Math.hypot(centre.x - m.vertexX, centre.y - m.vertexY) < 2.5;
  });
  assert(gripOnVertex, 'The grip stayed on the first vertex as the count changed');
  const afterDrag = JSON.parse(await state(page));
  assert(afterDrag.values.side === 6 && afterDrag.values.len === 250, 'The change settled at six sides and the same length');

  // A press on the grip hands it the keyboard, so an arrow after a press belongs to
  // the instrument rather than to whichever button had focus.
  await page.evaluate('window.fourthTurn.setValue("side", 4)');
  await settle(page);
  const gripBox = JSON.parse(await page.evaluate(`JSON.stringify((() => { const r = document.querySelector('#grip').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })())`));
  const beforePress = JSON.parse(await page.evaluate('JSON.stringify(window.fourthTurn.values)'));
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: gripBox.x, y: gripBox.y, button: 'left', buttons: 1, clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: gripBox.x, y: gripBox.y, button: 'left', buttons: 0 });
  await sleep(150);
  const focused = await page.evaluate('document.activeElement?.id ?? null');
  await key(page, 'ArrowDown', KEYS.ArrowDown);
  const afterPress = JSON.parse(await page.evaluate('JSON.stringify({ values: window.fourthTurn.values, active: document.activeElement?.id ?? null })'));
  results.focusHandoff = { focused, values: afterPress.values, active: afterPress.active };
  assert(focused === 'grip' && afterPress.values.side === beforePress.side + 1, `Pressing the grip hands it the keyboard and the arrow walks the family (${beforePress.side} → ${afterPress.values.side})`);

  // --- keyboard, cancellation ----------------------------------------------
  await page.evaluate('document.querySelector("#grip").focus()');
  await page.evaluate('window.fourthTurn.setValue("side", 5)');
  await sleep(300);
  await key(page, 'ArrowDown', KEYS.ArrowDown);
  const down = JSON.parse(await state(page));
  assert(down.values.side === 6, `The arrow that points along the rail increases the count (${down.values.side})`);
  await key(page, 'ArrowUp', KEYS.ArrowUp);
  await key(page, 'ArrowUp', KEYS.ArrowUp);
  const up = JSON.parse(await state(page));
  assert(up.values.side === 4, `And the other way decreases it (${up.values.side})`);
  await key(page, 'Home', KEYS.Home);
  const home = JSON.parse(await state(page));
  assert(home.values.side === home.domain.side.min, `Home goes to the smallest member (${home.values.side} sides)`);
  await key(page, 'End', KEYS.End);
  const end = JSON.parse(await state(page));
  assert(end.values.side === end.domain.side.max, `End goes to the largest (${end.values.side} sides)`);
  const aria = JSON.parse(await page.evaluate(`JSON.stringify((() => { const g = document.querySelector('#grip'); return { role: g.getAttribute('role'), label: g.getAttribute('aria-label'), orientation: g.getAttribute('aria-orientation'), now: g.getAttribute('aria-valuenow'), text: g.getAttribute('aria-valuetext') }; })())`));
  results.aria = aria;
  assert(aria.role === 'slider' && aria.label === 'Side count' && aria.orientation === 'vertical' && aria.now === '6' && /6 sides.*60 degrees/.test(aria.text), `The count is a vertical slider that names its exterior turn (${JSON.stringify(aria)})`);

  const beforeEscape = JSON.parse(await state(page));
  const now = { x: Math.round(beforeEscape.instrument.grip.x + 22), y: Math.round(beforeEscape.instrument.grip.y + 22) };
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: now.x, y: now.y, button: 'left', buttons: 1, clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: now.x, y: now.y - 30, button: 'left', buttons: 1 });
  await sleep(200);
  const duringEscape = JSON.parse(await state(page));
  await key(page, 'Escape', KEYS.Escape);
  await sleep(350);
  const afterEscape = JSON.parse(await state(page));
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: now.x, y: now.y - 30, button: 'left', buttons: 0 });
  results.cancel = { before: beforeEscape.values, during: duringEscape.values, after: afterEscape.values };
  assert(duringEscape.values.side !== beforeEscape.values.side, `The gesture changed the count (${duringEscape.values.side})`);
  assert(afterEscape.values.side === beforeEscape.values.side, `Escape restores the count before the gesture (${afterEscape.values.side})`);

  // --- stepping back out of the agreement -----------------------------------
  const drawnSide = afterEscape.values.side;
  await page.evaluate('window.fourthTurn.setValue("side", 6)');
  await sleep(400);
  const beforeBack = JSON.parse(await state(page));
  await page.evaluate('document.querySelector("#reverse").click()');
  await sleep(300);
  const stepped = JSON.parse(await state(page));
  results.stepBack = { from: beforeBack.values, to: stepped.values, rep: stepped.representation, posts: stepped.stagePosts - beforeBack.stagePosts, status: stepped.status };
  assert(stepped.representation === 'parameterised', 'Stepping back returns to the length description');
  assert(stepped.stagePosts > beforeBack.stagePosts, 'A description that cannot draw what is on the canvas executes the reverted recipe');
  assert(stepped.status.includes('drawn again'), `And the page says so: "${stepped.status}"`);
  assert(stepped.values.side === 4, 'The count returns to the recipe');
  assert(await waitFor(page, 'window.fourthTurn?.finished === true', 8000), 'The reverted run settles');
  const backBox = await measure(page, 'phase4-stepped-back');
  const backModel = family(JSON.parse(await state(page)), 4, 250);
  assert(Math.abs(backBox.box.w - backModel.spanW) <= 16, 'And it draws the square at the recipe\'s own length');

  const errors = [...page.console].filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  assert(errors.length === 0, `No console errors in the phase (${errors.length})`);

  // --- recording ------------------------------------------------------------
  const durations = [];
  for (let i = 0; i < frames.length; i += 1) {
    const next = frames[i + 1]?.ts ?? frames[i].ts + 0.08;
    durations.push(Math.max(30, Math.min(400, Math.round((next - frames[i].ts) * 1000))));
  }
  frames.forEach((f, i) => writeFileSync(`${rec}/${String(i).padStart(4, '0')}.jpg`, f.data));
  results.recording = { captured: frames.length, spanMs: frames.length ? Math.round((frames[frames.length - 1].ts - frames[0].ts) * 1000) : 0 };
  try {
    const scaled = { x: Math.round(four.figure.x * (900 / 1280)), y: Math.round(four.figure.y * (560 / 800)), width: Math.round(four.figure.w * (900 / 1280)), height: Math.round(four.figure.h * (560 / 800)) };
    const report = JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import glob, sys, json
files = sorted(glob.glob(sys.argv[1] + '/*.jpg'))
durations = json.loads(sys.argv[2])
crop = json.loads(sys.argv[4])
ims, ds, blank, drawn = [], [], 0, 0
for f, d in zip(files, durations):
    im = Image.open(f).convert('RGB')
    if sum(im.resize((1, 1)).getpixel((0, 0))) / 3 > 200:
        continue
    fig = im.crop((crop['x'], crop['y'], crop['x'] + crop['width'], crop['y'] + crop['height']))
    lit = fig.convert('L').point(lambda v: 255 if v > 70 else 0).histogram()[255]
    if lit < 25:
        blank += 1
    else:
        drawn += 1
    ims.append(im.resize((900, 560))); ds.append(d)
if ims:
    ims[0].save(sys.argv[3], save_all=True, append_images=ims[1:], duration=ds, loop=0, format='WEBP', quality=74, minimize_size=True)
print(json.dumps({'frames': len(ims), 'drawn': drawn, 'blankDuringDrag': blank}))
`, rec, JSON.stringify(durations), `${out}/phase4-recording.webp`, JSON.stringify(scaled)], { encoding: 'utf8' }));
    results.recording = { ...results.recording, ...report };
    assert(report.drawn > 8 && report.blankDuringDrag <= 1, `The change recording holds ${report.drawn} frames of the answering figure and ${report.blankDuringDrag} blank ones`);
  } catch (error) {
    evidence.push('recording assembly failed: ' + error.message);
  }

  // --- reduced motion, and the phone ---------------------------------------
  const reduced = await newPage(cdp);
  await reduced.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await reduced.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await reduced.goto(page_url, 800);
  await reduced.evaluate('document.querySelector("#enable").click()');
  await waitFor(reduced, 'window.fourthTurn?.finished === true');
  await waitFor(reduced, 'window.fourthTurn?.settled === true');
  await reduced.evaluate('window.fourthTurn.gather(); window.fourthTurn.name(); window.fourthTurn.openRoom(); window.fourthTurn.generalise();');
  await sleep(250);
  await reduced.evaluate('window.fourthTurn.setValue("side", 6)');
  await sleep(400);
  const reducedState = JSON.parse(await state(reduced));
  results.reduced = reducedState;
  assert(reducedState.representation === 'ngon' && reducedState.values.side === 6 && reducedState.values.len === 250, 'Under reduced motion the whole family is reachable');
  assert(reducedState.animations === 0, `Under reduced motion no rewrite animation runs (${reducedState.animations})`);
  await shot(reduced, 'phase4-reduced');

  const phone = await newPage(cdp);
  await phone.s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await phone.goto(page_url, 100);
  await waitFor(phone, 'window.fourthTurn?.finished === true');
  await waitFor(phone, 'window.fourthTurn?.settled === true');
  // One rewrite at a time, so the archived phone frame is a settled state and the
  // transition has its own frame.
  for (let i = 0; i < 4; i += 1) {
    await phone.evaluate('document.querySelector("#advance").click()');
    await sleep(150);
    if (i === 2) await shot(phone, 'phase4-phone-transition');
    await sleep(950);
  }
  await phone.evaluate('window.fourthTurn.setValue("side", 6)');
  await sleep(400);
  const phoneSettledFirst = await settle(phone);
  const phoneState = JSON.parse(await state(phone));
  const phoneModel = family(phoneState, 6, phoneState.values.len);
  const phoneGrip = { x: phoneState.instrument.grip.x + 22, y: phoneState.instrument.grip.y + 22 };
  const phoneError = Math.hypot(phoneGrip.x - phoneModel.vertexX, phoneGrip.y - phoneModel.vertexY);
  results.phone = { error: Math.round(phoneError * 10) / 10, reading: phoneState.reading, figure: phoneState.figure };
  assert(phoneError < 3, `On a phone the grip is still on the first vertex (${results.phone.error} px)`);
  const overflow = await phone.evaluate('JSON.stringify({ docW: document.documentElement.scrollWidth, winW: window.innerWidth })');
  assert(JSON.parse(overflow).docW <= JSON.parse(overflow).winW + 1, `No horizontal overflow on a phone (${overflow})`);
  assert(phoneState.reading === '6 sides · the turn is 60°', `The phone keeps the readout ("${phoneState.reading}")`);
  assert(phoneSettledFirst && phoneState.animations === 0, `The phone capture is a settled state, not a transition (${phoneState.animations} animations, no flying rows)`);
  const phoneThread = JSON.parse(await threadCrossing(phone));
  results.phoneThread = phoneThread;
  assert(phoneThread.points === 4 && phoneThread.hits === 0, `On a phone the thread crosses no declaration (${phoneThread.hits} hits, routed through ${phoneThread.points} points)`);
  await shot(phone, 'phase4-phone');
  // A finger has no hover to explain the instrument, so the count is changed by
  // touch alone.
  const phoneStart = { ...phoneState.values };
  const phoneModel6 = family(phoneState, 6, phoneStart.len);
  const phoneModel3 = family(phoneState, 3, phoneStart.len);
  await phone.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(phoneModel6.vertexX), y: Math.round(phoneModel6.vertexY), id: 1 }] });
  await phone.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(phoneModel6.vertexX), y: Math.round(phoneModel3.vertexY), id: 1 }] });
  await sleep(200);
  const phoneTouched = JSON.parse(await state(phone));
  await phone.s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(350);
  results.phoneTouch = { from: phoneStart.side, during: phoneTouched.values.side, len: phoneTouched.values.len };
  assert(phoneTouched.values.side !== phoneStart.side && phoneTouched.values.len === phoneStart.len, `A finger on the grip walks the family and leaves the length alone (${phoneStart.side} → ${phoneTouched.values.side} sides at length ${phoneTouched.values.len})`);


  results.evidence = evidence;
  results.errors = errors;
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ evidence, failures: results.failures || [], sideRuns: results.sideRuns, members: Object.fromEntries(Object.entries(results.members).map(([k, v]) => [k, { w: v.box.w, h: v.box.h, cx: v.box.cx, cy: v.box.cy, reading: v.reading }])), sweeps: results.sweeps, recording: results.recording, stepBack: results.stepBack, errors, out }, null, 2));
} finally { cdp.close(); }
