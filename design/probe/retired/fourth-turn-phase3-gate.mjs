// Fourth-turn Phase 3/4 gate — the parameterised recipe and the instrument's
// native basis, measured before any page-side control is built.
//
//   PROBE=fourth-turn-phase3-gate.mjs bash design/probe/fourth-turn.sh
//
// Questions:
//   1. Does `def square len do … end` + `square 250` draw the *same* square the
//      study already shows (pixel-identical), so naming the length preserves the
//      existing whole?
//   2. Does the parameterised framing (`jmpto -len/2 …`) hold for every length,
//      and does the polygon generalisation centre itself with tan(180/side)?
//   3. At side=4 does `ngon len side` draw the identical square, so the family
//      contains the member we already know?
//   4. How expensive is a wait-free native re-run? (An honest instrument has to
//      answer the hand faster than a demonstration run.)
//   5. What footprint does each (side, len) occupy in the fixed stage, so the
//      Phase 4 domain is derived from a polygon's footprint, not a square's.
//
// Measurement route. `fourth-turn-canvas-read.mjs` and
// `fourth-turn-canvas-diagnose.mjs` established that this headless build clears
// the WebGL drawing buffer before a page-level screenshot or `toDataURL`, so a
// static capture of the probe canvas comes back empty — a blank frame would make
// two different drawings compare equal. Compositor frames pushed by
// `Page.startScreencast` do carry the ink, so every number below is measured
// from a screencast frame taken while the finished drawing is held by an
// authored rest. Each measurement records its ink pixel count, and the probe
// refuses a comparison where either drawing is blank.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-phase3-gate';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
const W = 900, H = 900;
await page.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const evidence = [], results = {};
const assert = (ok, label) => { evidence.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) results.failures = [...(results.failures || []), label]; };

const WORLD_HEIGHT = 2 * 500 * Math.tan(Math.PI / 6); // fov 60 at z 500

const PRE = `# warm gold, one small head, born on the left
beColour "e6b366"
bold 1.1
show 9`;

// The Phase 1/2 demonstration square: fixed length, an authored rest after every
// instruction so the interpreter's beat lands on the line that ran.
const DEMO = `${PRE}
jmpto -125 -125
forward 250
wait 0.45
left 90
wait 0.15
forward 250
wait 0.45
left 90
wait 0.15
forward 250
wait 0.45
left 90
wait 0.15
forward 250
wait 0.45
left 90
wait 0.6`;

// Phase 3: the length becomes a name. Same preamble, same body, same optical
// closing rest — only the argument is supplied from outside the definition.
const p3 = (len, waits = false) => `${PRE}
def square len do
  jmpto 0-len/2 0-len/2
  loop 4 do
    forward len${waits ? '\n    wait 0.45' : ''}
    left 90${waits ? '\n    wait 0.15' : ''}
  end
end
square ${len}${waits ? '\nwait 0.6' : ''}`;

// Same definition, unary minus on the parameter: the authoring form is chosen on
// evidence rather than assumption.
const p3unary = (len) => `${PRE}
def square len do
  jmpto -len/2 -len/2
  loop 4 do
    forward len
    left 90
  end
end
square ${len}`;

// Geometry only: the head marker is ink at a corner, so a footprint is measured
// with the head hidden.
const geoSquare = (len) => `${PRE}
hd
def square len do
  jmpto 0-len/2 0-len/2
  loop 4 do
    forward len
    left 90
  end
end
square ${len}`;

// Phase 4: count and exterior angle replace `4` and `90`. The placement holds the
// circumcentre at the origin, at the distance len/(2·tan(half the exterior
// angle)) from the first vertex. The language's angles are degrees — `tan` is
// defined as tan(toRadians(x)) while `pi` is the ratio — so the half-angle is
// spelled 180/side, in the same unit as `left 360/side`.
const p4 = (len, side, { turned = false, hide = true } = {}) => `${PRE}
${hide ? 'hd' : ''}
def ngon len side do
  jmpto 0-len/2 0-(len/(2*tan(${turned ? 'pi' : '180'}/side)))
  loop side do
    forward len
    left 360/side
  end
end
ngon ${len} ${side}`;

const frames = [];
cdp.on((msg) => {
  if (msg.method !== 'Page.screencastFrame' || msg.sessionId !== page.sessionId) return;
  frames.push(Buffer.from(msg.params.data, 'base64'));
  page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
});

async function play(program) {
  return JSON.parse(await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`));
}
// The completed drawing is held by an authored rest while the compositor pushes
// frames; the last frame of that hold is the measurement.
async function capture(tag, program) {
  // A frame the compositor delivers late belongs to the *previous* program, and a
  // stale frame would silently attribute one drawing to another. Drain first, then
  // open the window this capture owns.
  frames.length = 0;
  await sleep(450);
  frames.length = 0;
  const run = await play(`${program}\nwait 0.5`);
  await sleep(180);
  const seen = frames.length;
  // Only the tail of the hold matters: the finished drawing is held by the rest.
  const tail = frames.slice(Math.max(0, seen - 12));
  const names = tail.map((data, i) => {
    const name = `${tag}-${String(i).padStart(2, '0')}`;
    writeFileSync(`${out}/${name}.png`, data);
    return name;
  });
  const measured = names.length ? measureBatch(names) : {};
  let chosen = null, chosenInk = -1;
  for (const name of names) {
    const m = measured[name];
    if (m && m.ink >= chosenInk) { chosenInk = m.ink; chosen = name; }
  }
  for (const name of names) if (name !== chosen) execFileSync('rm', ['-f', `${out}/${name}.png`]);
  results[`frame_${tag}`] = { frames: seen, tail: names.length, chosen, inks: names.map((n) => measured[n]?.ink ?? null) };
  if (!chosen) return { run, frames: seen, ink: 0, bbox: null };
  return { run, frames: seen, ...measured[chosen] };
}

// Ink geometry from a frame, in device pixels and world units relative to the
// canvas centre (the camera looks at the origin). The screencast frame is the
// composited page, so ink is found by distance from the frame's own background
// luminance rather than from an alpha channel.
function measureBatch(names) {
  const rows = JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
out = {}
for path in sys.argv[1:]:
    im = Image.open(path).convert('L')
    w, h = im.size
    hist = im.histogram()
    bg = hist.index(max(hist))
    mask = im.point(lambda v: 255 if abs(v - bg) > 20 else 0)
    bb = mask.getbbox()
    n = mask.histogram()[255]
    world = ${WORLD_HEIGHT} / h
    name = path.rsplit('/', 1)[-1][:-4]
    if not n or not bb:
        out[name] = {'ink': 0, 'bbox': None, 'wPx': None, 'hPx': None, 'wWorld': None, 'hWorld': None, 'cxWorld': None, 'cyWorld': None, 'bg': bg, 'size': [w, h]}
    else:
        x0, y0, x1, y1 = bb
        out[name] = {
            'ink': n, 'bbox': bb, 'bg': bg, 'size': [w, h],
            'wPx': x1 - x0, 'hPx': y1 - y0,
            'wWorld': round((x1 - x0) * world, 2), 'hWorld': round((y1 - y0) * world, 2),
            'cxWorld': round(((x0 + x1) / 2 - w / 2) * world, 2),
            'cyWorld': round(((y0 + y1) / 2 - h / 2) * world, 2),
        }
print(json.dumps(out))
`, ...names.map((n) => `${out}/${n}.png`)], { encoding: 'utf8', maxBuffer: 1 << 24 }));
  return rows;
}
function measure(name) { return measureBatch([name])[name]; }

function diffFrames(a, b) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
import sys, json
A = Image.open(sys.argv[1]).convert('RGB'); B = Image.open(sys.argv[2]).convert('RGB')
if A.size != B.size:
    print(json.dumps({'sizeMismatch': [A.size, B.size]})); raise SystemExit
d = ImageChops.difference(A, B).convert('L')
mask = d.point(lambda v: 255 if v > 12 else 0)
bb = mask.getbbox()
print(json.dumps({'bbox': bb, 'n': mask.histogram()[255], 'max': max(d.getextrema())}))
`, a, b], { encoding: 'utf8' }));
}

async function capDiff(a, b) {
  const aName = results[`frame_${a}`]?.chosen;
  const bName = results[`frame_${b}`]?.chosen;
  if (!aName || !bName) return { error: `missing frame for ${!aName ? a : b}` };
  return diffFrames(`${out}/${aName}.png`, `${out}/${bName}.png`);
}

try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) { const s = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"'); if (s !== 'pending') break; await sleep(150); }
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } })');
  await page.s('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: W, maxHeight: H });

  // --- 1. The name preserves the square -------------------------------------
  results.demo = await capture('demo', DEMO);
  results.p3waits = await capture('p3waits', p3(250, true));
  assert(results.demo.run.ok && results.p3waits.run.ok, 'The parameterised square and the fixed-length square both execute');
  assert(results.demo.ink > 500 && results.p3waits.ink > 500, `Both drawings are on the canvas (${results.demo.ink} / ${results.p3waits.ink} ink px, ${results.demo.frames} / ${results.p3waits.frames} frames)`);
  results.nameDiff = await capDiff('demo', 'p3waits');
  assert(results.nameDiff.bbox === null, `Naming the length draws the identical square (${JSON.stringify(results.nameDiff)})`);

  results.p3fast = await capture('p3fast', p3(250));
  results.fastDiff = await capDiff('demo', 'p3fast');
  assert(results.fastDiff.bbox === null, `Without rests the same square is drawn (${JSON.stringify(results.fastDiff)})`);
  results.p3unary = await capture('p3unary', p3unary(250));
  results.unaryDiff = await capDiff('p3fast', 'p3unary');
  assert(results.unaryDiff.bbox === null, `Unary-minus and 0-len/2 placements agree (${JSON.stringify(results.unaryDiff)})`);

  // --- 2. Placement holds across the length domain ---------------------------
  const centring = {};
  for (const len of [150, 200, 250]) {
    const c = await capture(`square${len}`, geoSquare(len));
    centring[len] = { ok: c.run.ok, commands: c.run.settled?.commandCount, ink: c.ink, wWorld: c.wWorld, hWorld: c.hWorld, cxWorld: c.cxWorld, cyWorld: c.cyWorld };
    const drift = Math.max(Math.abs(c.cxWorld ?? 99), Math.abs(c.cyWorld ?? 99));
    const sized = Math.abs((c.hWorld ?? 0) - len) < 3;
    assert(c.run.ok && c.ink > 500 && drift <= 2 && sized, `At length ${len} the square is centred and its own size (${c.wWorld}x${c.hWorld} world, offset ${c.cxWorld},${c.cyWorld})`);
  }
  results.centring = centring;

  // The head marker is real ink at a corner: hidden head = the path's footprint.
  results.headDiff = await capDiff('p3fast', 'square250');
  assert(results.headDiff.bbox !== null, `The head marker adds ink at the first vertex (${results.headDiff.n} px, ${JSON.stringify(results.headDiff.bbox)})`);

  // --- 3. The generalisation contains the square ----------------------------
  results.p4sq = await capture('p4sq', p4(250, 4, { hide: false }));
  const dNgon4 = await capDiff('p3fast', 'p4sq');
  results.ngon4Diff = dNgon4;
  assert(results.p4sq.ink > 500, `The four-sided ngon is drawn (${results.p4sq.ink} ink px)`);
  assert(dNgon4.bbox === null, `At side 4 the ngon is the square, corner for corner (${JSON.stringify(dNgon4)})`);
  // The trap: the language's angles are degrees while `pi` is the ratio.
  results.p4pi = await capture('p4pi', p4(250, 4, { hide: false, turned: true }));
  results.piDiff = await capDiff('p4sq', 'p4pi');
  assert(results.piDiff.bbox !== null, `tan(pi/side) is not tan(180/side): the angle unit is degrees, and the wrong spelling moves the figure (${JSON.stringify(results.p4pi.bbox)} vs ${JSON.stringify(results.p4sq.bbox)})`);

  // --- 4. Footprints: the domain is derived, not assumed --------------------
  const grid = {};
  for (const side of [3, 4, 5, 6, 7, 8]) for (const len of [100, 150, 200, 250, 300, 400]) {
    const c = await capture(`fp${side}-${len}`, p4(len, side));
    // A figure that leaves the stage reaches the frame edge, so its measured box
    // becomes the whole frame and containment has to be read from the border.
    const clipped = c.bbox == null || c.bbox[0] <= 1 || c.bbox[1] <= 1 || c.bbox[2] >= W - 2 || c.bbox[3] >= H - 2;
    const fits = !clipped;
    grid[`${side}/${len}`] = { ok: c.run.ok, commands: c.run.settled?.commandCount, ink: c.ink, wWorld: c.wWorld, hWorld: c.hWorld, cxWorld: c.cxWorld, cyWorld: c.cyWorld, fits };
  }
  results.footprints = grid;
  results.stage = { worldHeight: WORLD_HEIGHT, worldWidth: WORLD_HEIGHT * (W / H), canvas: W };
  const fit = (k) => grid[k]?.fits === true;
  assert(grid['4/250'].wWorld > 250 && grid['4/250'].wWorld < 254, `A four-sided figure at length 250 spans its own length (${grid['4/250'].wWorld} world)`);
  assert(grid['6/250'].wWorld > 490 && grid['6/250'].wWorld < 512, `At the same length, six sides span nearly twice as much (${grid['6/250'].wWorld} world)`);
  assert(grid['3/250'].fits && grid['4/250'].fits && grid['5/250'].fits && grid['6/250'].fits, 'Every side 3-6 at length 250 is fully inside the fixed stage');
  assert(!grid['8/250'].fits, `At length 250 an octagon leaves the stage (${grid['8/250'].wWorld} world wide)`);
  const largestFitting = {};
  for (const side of [3, 4, 5, 6, 7, 8]) {
    let best = null;
    for (const len of [100, 150, 200, 250, 300, 400]) if (fit(`${side}/${len}`)) best = len;
    largestFitting[side] = best;
  }
  results.largestFitting = largestFitting;
  assert([3, 4, 5, 6].every((s) => largestFitting[s] >= 250), `Sides 3-6 fit the stage through at least length 250 (${JSON.stringify(largestFitting)})`);

  // --- 5. The cost of answering the hand ------------------------------------
  await page.s('Page.stopScreencast');
  const times = [];
  const fast = p4(250, 6);
  for (let i = 0; i < 16; i++) {
    const t = await page.evaluate(`(async () => { const t0 = performance.now(); window.__ft.dispose(); await window.__ft.play(${JSON.stringify(fast)}); return performance.now() - t0; })()`);
    times.push(Math.round(t * 10) / 10);
  }
  times.sort((a, b) => a - b);
  results.rerun = { min: times[0], median: times[Math.floor(times.length / 2)], max: times[times.length - 1], times };
  assert(results.rerun.median < 60, `A fresh wait-free native run answers in ${results.rerun.median} ms (median of ${times.length})`);

  results.evidence = evidence;
  results.errors = [...page.console].filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ evidence, failures: results.failures || [], nameDiff: results.nameDiff, ngon4Diff: results.ngon4Diff, piDiff: results.piDiff, headDiff: results.headDiff, centring: results.centring, size250: { four: grid['4/250'], six: grid['6/250'], eight: grid['8/250'] }, largestFitting, rerun: results.rerun, errors: results.errors, out }, null, 2));
} finally { cdp.close(); }
