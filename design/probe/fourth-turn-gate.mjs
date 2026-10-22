// The fourth turn — the gate: the recipes the page actually runs, measured on the pinned runtime.
//
//   PROBE=fourth-turn-gate.mjs bash design/probe/fourth-turn.sh
//
// The questions, in the order the study asks them:
//
//   1. Does the vocabulary the act uses execute on the CURRENT pin — `forward` / `left`, the
//      loop, `def`, `360/side`, and the placement's `tan(180/side)`?
//   2. Does naming the loop a polygon draw the very square the pairs draw, pixel for pixel, so
//      the name leaves the current whole alone?
//   3. Does the generalisation contain that square at side 4, and does every milestone
//      (3, 4, 5, 6 sides at the authored length) sit inside the fixed stage?
//   4. Does the page's own arithmetic — `figure.mjs`, the one the instrument and the chips are
//      drawn from — agree with the runtime's own ink?
//   5. How expensive is a fresh wait-free run, which is what the hand's play needs?
//
// The programs come from `programs.mjs` and the geometry from `figure.mjs`, so this gate
// measures exactly the source the page executes and exactly the model the instrument uses.
// Measurement route: this headless build clears the WebGL drawing buffer before a page
// screenshot or `toDataURL`, so a static capture comes back empty and two different drawings
// would compare equal. Compositor frames pushed by `Page.startScreencast` do carry the ink, so
// every number below is measured from a screencast frame taken while the finished drawing is
// held by an authored rest, and a comparison is refused where either drawing is blank.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { handProgram, AUTHORED, MILESTONES } from '../../assets/js/home/fourth-turn/programs.mjs';
import { WORLD, figureWalk } from '../../assets/js/home/fourth-turn/figure.mjs';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-gate';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
const W = 900, H = 900;
await page.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const evidence = [], results = {};
const assert = (ok, label) => {
  evidence.push((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) results.failures = [...(results.failures ?? []), label];
};

// The recipe as the runtime receives it, in the two forms the study uses: with the head (the
// act's own drawing) and with it hidden (`hd`), because the head's marker is ink at a corner
// and a footprint has to be the path's own.
const geometry = (program) => program.source.replace('show 9', 'hd');
const hold = (text) => `${text}\nwait 0.5`;

const frames = [];
cdp.on((msg) => {
  if (msg.method !== 'Page.screencastFrame' || msg.sessionId !== page.sessionId) return;
  frames.push(Buffer.from(msg.params.data, 'base64'));
  page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
});

const play = async (program) => JSON.parse(await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`));

// The completed drawing is held by an authored rest while the compositor pushes frames; the
// fullest frame of that hold is the measurement. A frame the compositor delivers late belongs
// to the previous program, so the window is opened after a drain.
async function capture(tag, program) {
  frames.length = 0;
  await sleep(450);
  frames.length = 0;
  const run = await play(hold(program));
  await sleep(180);
  const seen = frames.length;
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
  results[`frame_${tag}`] = { frames: seen, chosen, inks: names.map((n) => measured[n]?.ink ?? null) };
  if (!chosen) return { run, frames: seen, ink: 0, bbox: null };
  return { run, frames: seen, ...measured[chosen] };
}

// Ink geometry from a frame, in device pixels and world units about the canvas centre (the
// camera looks at the origin). The frame is the composited page, so ink is found by distance
// from the frame's own background luminance rather than from an alpha channel.
function measureBatch(names) {
  return JSON.parse(execFileSync('python3', ['-c', `
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
    world = ${WORLD} / h
    name = path.rsplit('/', 1)[-1][:-4]
    if not n or not bb:
        out[name] = {'ink': 0, 'bbox': None, 'wWorld': None, 'hWorld': None, 'cxWorld': None, 'cyWorld': None, 'bg': bg, 'size': [w, h]}
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
}

const diffFrames = (a, b) => JSON.parse(execFileSync('python3', ['-c', `
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

async function capDiff(a, b) {
  const aName = results[`frame_${a}`]?.chosen;
  const bName = results[`frame_${b}`]?.chosen;
  if (!aName || !bName) return { error: `missing frame for ${!aName ? a : b}` };
  return diffFrames(`${out}/${aName}.png`, `${out}/${bName}.png`);
}

// What the page's own arithmetic says the drawing's extent is, in world units, at the values
// the recipe was given. These are the generalisation's milestones, so the walk closes at its own
// count (`closed: true`) — the one arithmetic, asked the one question this gate cares about.
const modelled = ({ len, turn, side = null }) => {
  const ring = figureWalk({ closed: true, len, turn, side, box: { cx: 0, cy: 0, scale: 1 } });
  const xs = ring.map((p) => p.x), ys = ring.map((p) => p.y);
  return {
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
    cx: (Math.max(...xs) + Math.min(...xs)) / 2,
    cy: (Math.max(...ys) + Math.min(...ys)) / 2,
  };
};

try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"');
    if (state !== 'pending') break;
    await sleep(150);
  }
  const boot = JSON.parse(await page.evaluate('JSON.stringify({ ready: window.__ft?.ready, error: window.__ft?.error, artifact: window.__ft?.artifact })'));
  const open = JSON.parse(await page.evaluate('JSON.stringify(window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } }))'));
  assert(boot.ready === true, `The current pin loads (${boot.artifact})`);
  assert(JSON.stringify(open.keys) === '["play","onBeat","dispose"]', 'The host surface is exactly play / onBeat / dispose — no value read-back channel');
  await page.s('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: W, maxHeight: H });

  // --- 1. The vocabulary the act uses ------------------------------------------------
  const pairs = capture('pairs', geometry(handProgram('explicit', AUTHORED.len, AUTHORED.side)));
  // Sequential: each play supersedes the last, so two captures cannot be in flight together.
  results.pairs = await capture('pairs', geometry(handProgram('explicit', AUTHORED.len, AUTHORED.side)));
  results.loop90 = await capture('loop90', geometry(handProgram('loop', AUTHORED.len, AUTHORED.side, 90)));
  results.named = await capture('named', geometry(handProgram('defined', AUTHORED.len, AUTHORED.side, 90)));
  assert(results.pairs.run.ok && results.loop90.run.ok && results.named.run.ok, 'The pairs, the loop and the named polygon all execute');
  assert(results.pairs.ink > 500 && results.loop90.ink > 500, `Both drawings are on the canvas (${results.pairs.ink} / ${results.loop90.ink} ink px)`);
  const faulted = await play('hop 100');
  assert(faulted.ok === false && /hop/.test(faulted.error ?? ''), `An unknown verb still faults with a named error (${faulted.error})`);

  // --- 2. The name leaves the square alone -------------------------------------------
  results.pairsVsLoop = await capDiff('pairs', 'loop90');
  assert(results.pairsVsLoop.bbox === null, `Gathering the pairs into a loop draws the identical square (${JSON.stringify(results.pairsVsLoop)})`);
  results.pairsVsNamed = await capDiff('pairs', 'named');
  assert(results.pairsVsNamed.bbox === null, `Naming it a polygon draws the identical square (${JSON.stringify(results.pairsVsNamed)})`);

  // --- 3. The generalisation contains the square, and the family fits ------------------
  results.square = await capture('square', geometry(handProgram('polygon', AUTHORED.len, 4, 90)));
  results.fourVsPairs = await capDiff('pairs', 'square');
  assert(results.square.ink > 500, `The four-sided generalisation is drawn (${results.square.ink} ink px)`);
  assert(results.fourVsPairs.bbox === null, `At side 4 the generalisation is the square, corner for corner (${JSON.stringify(results.fourVsPairs)})`);
  // The trap the recipe documents: the language's angles are degrees while `pi` is the ratio.
  results.pi = await capture('pi', geometry(handProgram('polygon', AUTHORED.len, 4, 90)).replace('180/side', 'pi/side'));
  results.piDiff = await capDiff('square', 'pi');
  assert(results.piDiff.bbox !== null, `tan(pi/side) is not tan(180/side): the angle unit is degrees (${JSON.stringify(results.pi.bbox)} vs ${JSON.stringify(results.square.bbox)})`);

  const family = {};
  for (const milestone of MILESTONES) {
    const drawn = await capture(`m${milestone.side}`, geometry(handProgram('polygon', AUTHORED.len, milestone.side, milestone.turn)));
    const model = modelled({ len: AUTHORED.len, turn: milestone.turn, side: milestone.side });
    const clipped = drawn.bbox == null || drawn.bbox[0] <= 1 || drawn.bbox[1] <= 1 || drawn.bbox[2] >= W - 2 || drawn.bbox[3] >= H - 2;
    family[milestone.name] = {
      ok: drawn.run.ok, ink: drawn.ink, commands: drawn.run.settled?.commandCount,
      wWorld: drawn.wWorld, hWorld: drawn.hWorld, cxWorld: drawn.cxWorld, cyWorld: drawn.cyWorld,
      model: { w: Math.round(model.w * 100) / 100, h: Math.round(model.h * 100) / 100 },
      fits: !clipped,
    };
    // --- 4. The page's arithmetic against the runtime's ink ---------------------------
    const dw = Math.abs((drawn.wWorld ?? 0) - model.w);
    const dh = Math.abs((drawn.hWorld ?? 0) - model.h);
    const drift = Math.max(Math.abs((drawn.cxWorld ?? 99) - model.cx), Math.abs((drawn.cyWorld ?? 99) - model.cy));
    assert(drawn.run.ok && drawn.ink > 500 && !clipped, `The ${milestone.name} is drawn inside the stage (${drawn.ink} ink px, ${drawn.wWorld}x${drawn.hWorld} world)`);
    assert(dw <= 4 && dh <= 4, `The ${milestone.name} measures what figure.mjs models (${drawn.wWorld} vs ${model.w.toFixed(2)} world wide, ${drawn.hWorld} vs ${model.h.toFixed(2)} tall)`);
    assert(drift <= 3, `The ${milestone.name} lands where figure.mjs puts it (${drawn.cxWorld},${drawn.cyWorld} vs ${model.cx.toFixed(2)},${model.cy.toFixed(2)} world about the canvas centre)`);
  }
  results.family = family;

  // An octagon at length 250 is the honest outside of the stage. The study opens
  // shorter than that, so the overflow is checked at the length where it was measured.
  results.octagon = await capture('octagon', geometry(handProgram('polygon', 250, 8, 45)));
  const octagonClipped = results.octagon.bbox == null || results.octagon.bbox[0] <= 1 || results.octagon.bbox[2] >= W - 2;
  assert(octagonClipped, `At length 250 an eight-sided figure leaves the fixed stage (${results.octagon.wWorld} world wide)`);

  // --- 5. The cost of answering the hand ---------------------------------------------
  await page.s('Page.stopScreencast');
  const times = [];
  const fast = handProgram('polygon', AUTHORED.len, 6, 60).source;
  for (let i = 0; i < 16; i++) {
    const t = await page.evaluate(`(async () => { const t0 = performance.now(); window.__ft.dispose(); await window.__ft.play(${JSON.stringify(fast)}); return performance.now() - t0; })()`);
    times.push(Math.round(t * 10) / 10);
  }
  times.sort((a, b) => a - b);
  results.rerun = { min: times[0], median: times[Math.floor(times.length / 2)], max: times[times.length - 1], times };
  assert(results.rerun.median < 60, `A fresh wait-free native run answers in ${results.rerun.median} ms (median of ${times.length})`);

  results.evidence = evidence;
  results.errors = page.console.filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ artifact: boot.artifact, failures: results.failures ?? [], family: results.family, rerun: results.rerun, errors: results.errors, out }, null, 2));
  if (results.failures?.length) process.exitCode = 1;
} finally { cdp.close(); }
