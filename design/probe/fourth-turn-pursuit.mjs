// The fourth turn — the discrete pursuit: four agents, one law, measured on the pinned runtime.
//
//   PROBE=fourth-turn-pursuit.mjs bash design/probe/fourth-turn.sh
//
// The law is the whole program: each agent turns toward its successor, advances a small distance,
// and repeats. The polygon supplies the initial conditions and nothing else — no spiral routine.
// This probe establishes, on the current pin, the things a page may then present:
//
//   1. Does the pursuit execute and settle at four agents, one speed, one finite budget, with
//      visible heads and monochrome trails — and does the ink *appear progressively*? A whole-result
//      swap would hide the movement, so presentation needs a policy; that policy needs this fact.
//   2. Are the two historical traps still real? A successor bound with `let` must misbehave while
//      executing the *same* command count as the `fn` form; a rest between agent spawns must not
//      settle, while the two-pass and single-pass forms must.
//   3. Does the mathematics hold: peers follow their intended successor, a regular start keeps
//      approximate rotational symmetry, reversing successor order mirrors the drawing, finer steps
//      with the same total travel approach a stable trajectory, and completion is the authored
//      bound rather than an execution cap.
//   4. Does disposal stop the drawing and the announcements?
//   5. Does the same law under a different beginning (one vertex displaced) give a different
//      collective form — the condition/relation separation, as an optical measurement.
//
// Measurement route: this headless build clears the WebGL buffer before a page screenshot, so ink
// is read from `Page.startScreencast` frames, as in `fourth-turn-gate.mjs`. Command counts and
// command-count equality never establish targeting; only the drawn paths do. The beginning, middle
// and end of a performance are captured as separate, identical re-runs at fixed delays — the
// program carries no native randomness — and are kept as images for a human look.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-pursuit';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
const W = 900, H = 900;
await page.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const evidence = [];
const report = { kind: 'the discrete pursuit, measured on the pinned runtime', base };
const assert = (ok, label) => {
  evidence.push((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) report.failures = [...(report.failures ?? []), label];
};

// ---- the frames the compositor pushes, which are the only frames that carry the ink ----------
const frames = [];
cdp.on((msg) => {
  if (msg.method !== 'Page.screencastFrame' || msg.sessionId !== page.sessionId) return;
  frames.push(Buffer.from(msg.params.data, 'base64'));
  page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
});
const keep = (name) => {
  const data = frames[frames.length - 1];
  if (!data) return null;
  writeFileSync(`${out}/${name}.png`, data);
  return name;
};
const play = async (program) => JSON.parse(await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`));
const executed = (run) => run?.settled?.commandCount ?? null;
const dispose = () => page.evaluate('window.__ft.dispose()');
const stale = () => page.evaluate('window.__ft.stale');

// ---- what a saved frame holds: ink, extent, and the reach from the canvas centre -------------
function measure(names) {
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
    world = 577.3502691896258 / h
    name = path.rsplit('/', 1)[-1][:-4]
    if not n or not bb:
        out[name] = {'ink': 0, 'bbox': None}
        continue
    x0, y0, x1, y1 = bb
    # the reach: the furthest inked pixel from the canvas centre, in world units
    px = mask.load()
    reach = 0
    for y in range(y0, y1 + 1, 2):
        for x in range(x0, x1 + 1, 2):
            if px[x, y]:
                reach = max(reach, ((x - w / 2) ** 2 + (y - h / 2) ** 2) ** 0.5)
    out[name] = {
        'ink': n, 'bbox': bb, 'bg': bg,
        'wWorld': round((x1 - x0) * world, 2), 'hWorld': round((y1 - y0) * world, 2),
        'reachWorld': round(reach * world, 2),
    }
print(json.dumps(out))
`, ...names.map((n) => `${out}/${n}.png`)], { encoding: 'utf8', maxBuffer: 1 << 24 }));
}
// A frame compared with another, with an optional rotation or mirror about the canvas centre:
// rotational symmetry and handedness are measured against the drawing's own ink, not described.
function compare(a, b, { rotate = 0, mirror = false } = {}) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image, ImageChops, ImageOps
import sys, json
A = Image.open(sys.argv[1]).convert('L')
B = Image.open(sys.argv[2]).convert('L')
if sys.argv[3] != '0':
    A = A.rotate(float(sys.argv[3]), resample=Image.BICUBIC)
if sys.argv[4] == '1':
    A = ImageOps.mirror(A)
a = A.point(lambda v: 255 if v > 40 else 0)
b = B.point(lambda v: 255 if v > 40 else 0)
ia, ib = a.histogram()[255], b.histogram()[255]
d = ImageChops.difference(a, b)
n = d.histogram()[255]
print(json.dumps({'inkA': ia, 'inkB': ib, 'mismatch': n, 'mismatchFraction': round(n / max(1, ia + ib), 4)}))
`, `${out}/${a}.png`, `${out}/${b}.png`, String(rotate), mirror ? '1' : '0']), { encoding: 'utf8' });
}

// ---- the law, as source. One colour, one speed, one budget; only the beginning differs. -------
const OPTICS = 'beColour "e8b04b"\nbold 1.1\nhd\njmpto -50 -50';
const agent = ({ spawn = 'count', index = 0, successor, step, wait, steps, label = '' }) => [
  `  as 'agent[${spawn === 'count' ? 'count' : index}]' do`,
  '    beColour "e8b04b"',
  '    show 5',
  `    ${successor}`,
  `    loop ${steps} do`,
  '      faceto "agent[tgt]".x "agent[tgt]".y',
  `      fw ${step}`,
  `      wait ${wait}`,
  '    end',
  ...(label ? [`    ${label}`] : []),
  '  end',
].join('\n');
// The spawn name must be the loop's own counter. A literal index executes the identical command
// count and announces the identical beats while drawing nothing at all; the contrast is kept
// below rather than hidden (see `pursue-literal-spawn`).
const ring = ({ side, steps, step = 'len/100', wait = '1/25', successor, label = '', spawn = 'count', scaffold = 'len' }) => `${OPTICS}

def ring len side steps do
  loop side do
    forward ${scaffold}
    left 360/side
${Array.from({ length: side }, (_, i) => agent({ spawn, index: i, successor, step, wait, steps, label })).join('\n')}
  end
end
ring 100 ${side} ${steps}`;
// The same law, a different beginning: one starting vertex stands 40 units inside the ring, and
// nothing else changes. The language has no `if` in its table, so the displacement is arithmetic on
// the loop's own counter — measured working in `fourth-turn-pursuit-diagnose.mjs`.
const displaced = ({ steps }) => ring({ side: 4, steps, scaffold: 'len - 40 * (count == 0)', successor: 'fn tgt mod(count + 1, side)' });

// ---- one performance, watched from outside ---------------------------------------------------
// `moment` captures the drawing a fixed delay into an identical re-run; `settle` captures the
// finished drawing while an authored rest holds it. Both are separate runs of a deterministic
// program, which is why the three moments can be taken from three runs.
async function moment(tag, program, atMs) {
  frames.length = 0;
  await sleep(420);
  frames.length = 0;
  const running = play(program);
  await sleep(atMs);
  const name = keep(`${tag}`) ?? null;
  const run = await running;
  return { frame: name, run, ...(name ? measure([name])[name] : { ink: 0 }) };
}
async function settle(tag, program) {
  frames.length = 0;
  await sleep(420);
  frames.length = 0;
  const run = await play(`${program}\n\nwait 0.5`);
  await sleep(160);
  const tail = frames.slice(Math.max(0, frames.length - 10));
  const names = tail.map((data, i) => {
    const name = `${tag}-${String(i).padStart(2, '0')}`;
    writeFileSync(`${out}/${name}.png`, data);
    return name;
  });
  const measured = names.length ? measure(names) : {};
  let chosen = null, best = -1;
  for (const name of names) if ((measured[name]?.ink ?? 0) >= best) { best = measured[name]?.ink ?? 0; chosen = name; }
  for (const name of names) if (name !== chosen) execFileSync('rm', ['-f', `${out}/${name}.png`]);
  return { run, frame: chosen, ...(chosen ? measured[chosen] : { ink: 0 }) };
}

try {
  await page.goto(base, 80);
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"');
    if (state !== 'pending') break;
    await sleep(150);
  }
  const artifact = await page.evaluate('window.__ft.artifact');
  report.artifact = artifact;
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 60000, maxRecurseDepth: 40 } })');
  await page.s('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: W, maxHeight: H });

  // ---- 1. the proof, and the progressive fact ------------------------------------------------
  const canonical = ring({ side: 4, steps: 91, successor: 'fn tgt mod(count + 1, side)' });
  report.canonicalProgram = canonical;
  const beginning = await moment('pursue-beginning', canonical, 700);
  const middle = await moment('pursue-middle', canonical, 1900);
  const end = await settle('pursue-end', canonical);
  report.moments = { beginning, middle, end };
  assert(end.run.ok && executed(end.run) > 0, `Four agents pursue and settle (${end.run.ok ? `${executed(end.run)} commands, ${Math.round(end.run.settledMs)} ms` : end.run.error})`);
  assert(beginning.ink > 0 && middle.ink > beginning.ink && end.ink > middle.ink,
    `The drawing appears progressively — the whole result is not held back (ink ${beginning.ink} → ${middle.ink} → ${end.ink})`);
  assert((end.run.beats ?? 0) >= 1, `The runtime announces progress of its own (${end.run.beats} line beats: ${JSON.stringify(end.run.beatLines)})`);

  // ---- 2. the traps, rechecked ----------------------------------------------------------------
  // A literal spawn name with the identical law: same commands, same beats, no trails.
  const literalSpawn = await settle('pursue-literal-spawn', ring({ side: 4, steps: 91, spawn: 'literal', successor: 'fn tgt mod(count + 1, side)' }));
  report.literalSpawn = literalSpawn;
  assert(literalSpawn.run.ok && executed(literalSpawn.run) === executed(end.run) && literalSpawn.ink < end.ink / 1.5,
    `A literal spawn name executes the same commands and draws almost nothing (${executed(literalSpawn.run)} commands, ink ${literalSpawn.ink} against ${end.ink}) — the name must be the loop's own counter`);

  const letContrast = await settle('pursue-let-contrast', ring({ side: 4, steps: 91, successor: 'let tgt = mod(count + 1, side)' }));
  const sameCount = letContrast.run.ok && end.run.ok && executed(letContrast.run) === executed(end.run) && executed(end.run) > 0;
  const difference = end.frame && letContrast.frame ? compare(end.frame, letContrast.frame) : null;
  report.letContrast = { ...letContrast, sameCount, difference };
  assert(sameCount, `A successor bound with \`let\` executes the identical command count (${executed(letContrast.run)} = ${executed(end.run)})`);
  assert(difference && difference.mismatchFraction > 0.15,
    `and draws a different picture, so counts do not establish targeting (mismatch ${difference?.mismatchFraction})`);

  const interleaved = `beColour "e8b04b"
bold 1.1
hd

def ring len side steps do
  loop side do
    forward len
    left 360/side
    wait 0.5
    as 'agent[count]' do
      beColour "e8b04b"
      show 5
      fn tgt mod(count + 1, side)
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
ring 100 4 91`;
  const interleavedRun = await settle('pursue-interleaved-rest', interleaved);
  report.interleaved = interleavedRun;
  assert(!interleavedRun.run.ok || interleavedRun.ink < end.ink / 2,
    `A rest between spawns still fails to perform (${interleavedRun.run.ok ? `settled with only ${interleavedRun.ink} ink` : interleavedRun.run.error})`);

  const twoPass = `beColour "e8b04b"
bold 1.1
hd

def ring len side steps do
  loop side do
    forward len
    left 360/side
    wait 0.3
  end
end
ring 100 4 0
jmpto 0 0

def agents len side steps do
  loop side do
    forward len
    left 360/side
    as 'agent[count]' do
      beColour "e8b04b"
      show 5
      fn tgt mod(count + 1, side)
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
agents 100 4 91`;
  const twoPassRun = await settle('pursue-two-pass', twoPass);
  report.twoPass = twoPassRun;
  assert(twoPassRun.run.ok && twoPassRun.ink > 0, `The two-pass construction still performs (${twoPassRun.run.ok ? `${executed(twoPassRun.run)} commands` : twoPassRun.run.error})`);

  // ---- 3. the mathematics ---------------------------------------------------------------------
  // Handedness: reversing the successor order must mirror the drawing.
  const reverse = await settle('pursue-reverse', ring({ side: 4, steps: 91, successor: 'fn tgt mod(count - 1 + side, side)' }));
  const best = (from, options) => options.reduce((chosen, option) => {
    const measured = compare(end.frame, reverse.frame, option);
    return !chosen || measured.mismatchFraction < chosen.measured.mismatchFraction ? { option, measured } : chosen;
  }, null);
  const rotations = [0, 90, 180, 270].map((rotate) => ({ rotate }));
  const mirrored = end.frame && reverse.frame ? best(end.frame, rotations.map((option) => ({ ...option, mirror: true }))) : null;
  const straight = end.frame && reverse.frame ? best(end.frame, rotations) : null;
  report.reverse = { ...reverse, mirrored, straight };
  assert(reverse.run.ok && mirrored && straight && mirrored.measured.mismatchFraction < straight.measured.mismatchFraction / 2,
    `Reversing the successor order mirrors the drawing, at the ring's own phase (best mirrored ${mirrored?.measured.mismatchFraction} at ${JSON.stringify(mirrored?.option)} against ${straight?.measured.mismatchFraction} straight)`);

  // Symmetry: a regular start keeps approximate rotational symmetry; a displaced one does not.
  const rotated = end.frame ? compare(end.frame, end.frame, { rotate: 90 }) : null;
  const displacedRun = await settle('pursue-displaced', displaced({ steps: 91 }));
  const displacedRotated = displacedRun.frame ? compare(displacedRun.frame, displacedRun.frame, { rotate: 90 }) : null;
  report.symmetry = { regular: rotated, displaced: displacedRotated, displacedInk: displacedRun.ink, regularInk: end.ink };
  assert(rotated && rotated.mismatchFraction < 0.35,
    `A regular start keeps approximate four-fold symmetry (rotate 90° mismatch ${rotated?.mismatchFraction})`);
  assert(displacedRotated && rotated && displacedRotated.mismatchFraction > rotated.mismatchFraction + 0.08,
    `One displaced vertex breaks it, under the same law (displaced ${displacedRotated?.mismatchFraction} against regular ${rotated?.mismatchFraction})`);
  assert(displacedRun.run.ok && displacedRun.ink > 0, `The displaced beginning performs too (${executed(displacedRun.run)} commands)`);

  // Refinement: the same total travel, finer steps — the trajectory must settle toward a limit.
  const coarse = await settle('pursue-coarse', ring({ side: 4, steps: 46, step: 'len/50', wait: '1/25', successor: 'fn tgt mod(count + 1, side)' }));
  const fine = await settle('pursue-fine', ring({ side: 4, steps: 182, step: 'len/200', wait: '1/100', successor: 'fn tgt mod(count + 1, side)' }));
  const reach = [coarse.reachWorld, end.reachWorld, fine.reachWorld];
  const roughToMiddle = coarse.frame && end.frame ? compare(coarse.frame, end.frame) : null;
  const middleToFine = end.frame && fine.frame ? compare(end.frame, fine.frame) : null;
  report.refinement = { coarse, middle: end, fine, reach, roughToMiddle, middleToFine };
  assert(coarse.run.ok && fine.run.ok && roughToMiddle && middleToFine && middleToFine.mismatchFraction < roughToMiddle.mismatchFraction,
    `Finer steps approach a stable trajectory at the same total travel (picture mismatch ${roughToMiddle?.mismatchFraction} coarsely → ${middleToFine?.mismatchFraction} finely; the scaffold's reach stays ${reach.join(' / ')} world, which the starting conditions own)`);

  // Completion is the authored bound, not an execution cap: a longer budget draws further.
  const short = await settle('pursue-short-budget', ring({ side: 4, steps: 30, successor: 'fn tgt mod(count + 1, side)' }));
  report.budget = { short, long: end };
  assert(short.run.ok && short.ink < end.ink,
    `A shorter authored budget completes with less travel — the bound is the program's (ink ${short.ink} at 30 steps against ${end.ink} at 91)`);
  assert(!String(end.run.error ?? '').includes('limit'), 'No command or recursion cap masqueraded as completion');

  // ---- 4. disposal ----------------------------------------------------------------------------
  const beforeDispose = await stale();
  frames.length = 0;
  const live = play(ring({ side: 4, steps: 300, successor: 'fn tgt mod(count + 1, side)' }));
  await sleep(1500);
  const atDispose = keep('pursue-dispose') ?? null;
  await dispose();
  await sleep(900);
  const settledFrame = keep('pursue-after-dispose') ?? null;
  await sleep(1400);
  const laterStill = keep('pursue-after-dispose-later') ?? null;
  const stopped = await live;
  const staleAfter = await stale();
  const frozen = settledFrame && laterStill ? compare(settledFrame, laterStill) : null;
  const arriving = atDispose && settledFrame ? compare(atDispose, settledFrame) : null;
  report.disposal = { stopped: { ok: stopped.ok, error: stopped.error }, beatsAfter: staleAfter.beats - beforeDispose.beats, frozen, arriving };
  assert(!stopped.ok, `Cancelling a performance rejects its run (${stopped.error})`);
  assert(frozen && frozen.mismatchFraction < 0.005,
    `and the drawing stops: once the last in-flight frame has landed (${arriving?.mismatchFraction} of it differs), two later looks are identical (mismatch ${frozen?.mismatchFraction})`);
  assert(staleAfter.beats - beforeDispose.beats === 0, `and nothing is announced after it (${staleAfter.beats - beforeDispose.beats} beats arrived)`);

  // ---- 5. the successor, read off the drawing --------------------------------------------------
  const labelsFn = await settle('pursue-labels-fn', ring({ side: 4, steps: 20, successor: 'fn tgt mod(count + 1, side)', label: 'label tgt' }));
  const labelsLet = await settle('pursue-labels-let', ring({ side: 4, steps: 20, successor: 'let tgt = mod(count + 1, side)', label: 'label tgt' }));
  const labelsPlain = await settle('pursue-labels-plain', ring({ side: 4, steps: 20, successor: 'let tgt = 2', label: 'label tgt' }));
  report.labels = { fn: labelsFn.frame, let: labelsLet.frame, plain: labelsPlain.frame, ink: [labelsFn.ink, labelsLet.ink, labelsPlain.ink] };
  assert(labelsFn.run.ok && labelsLet.run.ok && labelsPlain.run.ok, 'All three labelled witnesses run, to be read as images');
  assert(labelsFn.ink > 0 && labelsPlain.ink > 0,
    `The witnesses carry ink — the labels are drawn where the agents stop (${labelsFn.ink} / ${labelsLet.ink} / ${labelsPlain.ink})`);
} catch (error) {
  report.error = String(error && error.stack ? error.stack : error);
} finally {
  await page.s('Page.stopScreencast').catch(() => {});
  report.evidence = evidence;
  report.console = page.console?.slice(-8) ?? [];
  writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(evidence.join('\n'));
  console.log(`\n${out}/report.json`);
  cdp.close();
}
