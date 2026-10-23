// Phase 2 — the gesture gathers. Two equivalent rewrites over a resident drawing.
//   PROBE=fourth-turn-phase2.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-phase2';
const rec = `${out}/recording`;
rmSync(out, { recursive: true, force: true });
mkdirSync(rec, { recursive: true });
const page_url = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const evidence = [], results = {};
const assert = (ok, label) => { evidence.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) results.failures = [...(results.failures || []), label]; };
async function shot(page, name, clip) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
  return `${out}/${name}.png`;
}
function pixelDiff(a, b) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
import sys, json
A = Image.open(sys.argv[1]).convert('RGB'); B = Image.open(sys.argv[2]).convert('RGB')
d = ImageChops.difference(A, B)
print(json.dumps({'bbox': d.getbbox(), 'max': max(max(c) for c in d.getextrema())}))
`, a, b], { encoding: 'utf8' }));
}
function state(page) {
  return page.evaluate(`JSON.stringify({
    representation: window.fourthTurn.representation,
    lastExecuted: window.fourthTurn.lastExecuted.name,
    composedShown: window.fourthTurn.composedShown,
    rewrites: window.fourthTurn.rewrites,
    stagePosts: window.fourthTurn.stagePosts,
    settled: window.fourthTurn.settled,
    finished: window.fourthTurn.finished,
    advanceDisabled: document.querySelector('#advance').getAttribute('aria-disabled') === 'true',
    execText: document.querySelector('#executed').textContent,
    composedText: document.querySelector('#composed-block').hidden ? '' : document.querySelector('#composed').textContent,
    composedNote: document.querySelector('#composed-block').hidden ? '' : document.querySelector('#composed-block .inspection-note').textContent,
    rows: [...document.querySelectorAll('.source-row')].map((r) => ({ id: r.dataset.id, code: r.textContent.trim(), indent: getComputedStyle(r).paddingLeft })),
    lit: document.querySelectorAll('.source-row.is-lit').length,
    verb: document.querySelector('#verb').textContent,
    center: (() => { const n = document.querySelector('.notation').getBoundingClientRect(); const f = document.querySelector('.figure').getBoundingClientRect(); return { notation: Math.round(n.top + n.height / 2), figure: Math.round(f.top + f.height / 2) }; })(),
  })`);
}

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
  for (let i = 0; i < 120; i++) { const r = await page.evaluate('window.fourthTurn?.ready === true'); if (r) break; await sleep(100); }
  await page.evaluate(`new Promise(resolve => { const check = () => window.fourthTurn.finished ? resolve(1) : setTimeout(check, 30); check(); })`);

  // 1. Closure settles: gold cleared, nothing moves, invitation not yet offered.
  const atFinish = JSON.parse(await state(page));
  results.atFinish = atFinish;
  assert(atFinish.lit === 0, 'The execution gold is cleared the moment the square closes');
  assert(atFinish.settled === false && atFinish.advanceDisabled === true, 'No description change is offered until closure has settled');
  await sleep(1400);
  const afterSettle = JSON.parse(await state(page));
  results.afterSettle = afterSettle;
  assert(afterSettle.settled === true && afterSettle.advanceDisabled === false && afterSettle.verb === 'see.', 'After the settle, the invitation is available and still watching');
  assert(afterSettle.center.notation === atFinish.center.notation && afterSettle.center.figure === atFinish.center.figure, 'Nothing moved during the settle');

  const figure = await page.evaluate(`(() => { const r = document.querySelector('.figure').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
  await shot(page, 'phase2-before', figure);
  await shot(page, 'phase2-before-page');
  const postsAfterRun = afterSettle.stagePosts;

  // 2. Gather the repetitions.
  await page.s('Page.startScreencast', { format: 'jpeg', quality: 74, everyNthFrame: 2, maxWidth: 800, maxHeight: 500 });
  await page.evaluate(`document.querySelector('#advance').click()`);
  await sleep(1300);
  results.loop = JSON.parse(await state(page));
  await shot(page, 'phase2-loop', figure);
  await shot(page, 'phase2-loop-page');

  // 3. Give the gesture a name.
  await page.evaluate(`document.querySelector('#advance').click()`);
  await sleep(1100);
  results.defined = JSON.parse(await state(page));
  await shot(page, 'phase2-defined', figure);
  await shot(page, 'phase2-defined-page');
  await page.s('Page.stopScreencast');

  // The gate: the drawing did not move, and no runtime message was invented.
  const dLoop = pixelDiff(`${out}/phase2-before.png`, `${out}/phase2-loop.png`);
  const dDefined = pixelDiff(`${out}/phase2-before.png`, `${out}/phase2-defined.png`);
  results.drawing = { loop: dLoop, defined: dDefined };
  assert(dLoop.bbox === null && dDefined.bbox === null, `The drawing is pixel-identical through both rewrites (${JSON.stringify(dDefined)})`);
  assert(results.loop.stagePosts === postsAfterRun && results.defined.stagePosts === postsAfterRun, `No runtime message was sent during the rewrites (still ${postsAfterRun})`);

  assert(results.loop.representation === 'loop' && results.loop.rows.length === 4, 'The eight rows gather into a four-row loop');
  assert(results.loop.rows.some((r) => r.code === 'loop 4 do') && results.loop.rows.some((r) => r.code === 'end'), 'The loop opens with `loop 4 do` and closes with `end`');
  assert(results.loop.rows.find((r) => r.code === 'forward 250').indent !== afterSettle.rows.find((r) => r.code === 'forward 250').indent, 'The surviving pair is visibly indented into the loop');
  assert(results.defined.representation === 'defined' && results.defined.rows[results.defined.rows.length - 1].id === 'call', 'Naming wraps the loop and the call appears last');
  assert(results.loop.lit === 0 && results.defined.lit === 0, 'No execution light is invented during the rewrites');
  assert(results.loop.center.notation === afterSettle.center.notation && results.defined.center.notation === afterSettle.center.notation, 'The manuscript keeps its place as the source shrinks');
  assert(results.loop.center.figure === afterSettle.center.figure && results.defined.center.figure === afterSettle.center.figure, 'The drawing keeps its place as the source shrinks');

  // The inspector separates the last executed source from the composed recipe.
  assert(results.loop.composedShown === true && results.defined.composedShown === true, 'The composed recipe is shown apart from the executed source');
  assert(results.defined.execText === afterSettle.execText && results.defined.execText.includes('wait '), 'The inspector still shows the last executed source, rests and all');
  assert(results.defined.composedText.includes('def square do'), 'The composed recipe shows the named definition');
  assert(results.defined.composedNote === 'Current recipe · composed, not yet executed', 'The composed recipe is labelled as not yet executed');

  // 4. Only an explicit replay executes the composed recipe — preserving geometry and the closing rest.
  const t0 = Date.now();
  await page.evaluate(`document.querySelector('#replay').click()`);
  await page.evaluate(`new Promise(resolve => { const check = () => window.fourthTurn.finished && window.fourthTurn.lastExecuted.name === 'defined' ? resolve(1) : setTimeout(check, 30); check(); })`);
  const elapsed = Date.now() - t0;
  const replay = JSON.parse(await state(page));
  results.replay = { elapsed, ...replay };
  await shot(page, 'phase2-replayed', figure);
  const dReplay = pixelDiff(`${out}/phase2-before.png`, `${out}/phase2-replayed.png`);
  results.drawing.replay = dReplay;
  assert(replay.stagePosts === postsAfterRun + 1, 'Replay is the only action that runs the composed recipe');
  assert(replay.lastExecuted === 'defined' && replay.composedShown === false, 'After the replay the executed source is the named definition');
  assert(dReplay.bbox === null, `The replayed definition draws the same square (${JSON.stringify(dReplay)})`);
  assert(elapsed >= 2200, `The replayed recipe keeps its closing rest (${elapsed} ms)`);

  // Stepping back is a re-description too.
  await page.evaluate(`document.querySelector('#reverse').click()`);
  await sleep(220);
  results.reversed = JSON.parse(await state(page));
  assert(results.reversed.representation === 'loop' && results.reversed.stagePosts === postsAfterRun + 1, 'Stepping back is a representation change, not a re-run');
  const dRev = pixelDiff(`${out}/phase2-before.png`, await shot(page, 'phase2-reversed', figure));
  assert(dRev.bbox === null, 'The drawing is still identical after stepping back');

  // Reduced motion: immediate text changes, and the same reading stop is kept.
  const reduced = await newPage(cdp);
  await reduced.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await reduced.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await reduced.goto(page_url, 800);
  await reduced.evaluate('document.querySelector("#enable").click()');
  for (let i = 0; i < 120; i++) { const r = await reduced.evaluate('window.fourthTurn?.finished === true'); if (r) break; await sleep(100); }
  const rFinish = JSON.parse(await reduced.evaluate('JSON.stringify({ settled: window.fourthTurn.settled, disabled: document.querySelector("#advance").getAttribute("aria-disabled") === "true" })'));
  await sleep(1300);
  const rSettled = JSON.parse(await reduced.evaluate('JSON.stringify({ settled: window.fourthTurn.settled, disabled: document.querySelector("#advance").getAttribute("aria-disabled") === "true" })'));
  await reduced.evaluate('window.fourthTurn.gather(); window.fourthTurn.name()');
  await sleep(120);
  results.reduced = JSON.parse(await reduced.evaluate('JSON.stringify({ representation: window.fourthTurn.representation, animations: document.getAnimations().length, rows: document.querySelectorAll(".source-row").length })'));
  assert(rFinish.settled === false && rFinish.disabled === true && rSettled.settled === true, 'Reduced motion keeps the same intermediate reading stop');
  assert(results.reduced.representation === 'defined' && results.reduced.rows === 7, 'Under reduced motion the rewrites are immediate');
  assert(results.reduced.animations === 0, 'Under reduced motion no rewrite animation is left running');
  await shot(reduced, 'phase2-reduced');

  // Mobile: the reserved space keeps the room from recentring as the source shrinks.
  const phone = await newPage(cdp);
  await phone.s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await phone.goto(page_url, 100);
  for (let i = 0; i < 120; i++) { const r = await phone.evaluate('window.fourthTurn?.finished === true'); if (r) break; await sleep(100); }
  await sleep(1300);
  const phoneBefore = JSON.parse(await state(phone));
  await phone.evaluate('window.fourthTurn.gather(); window.fourthTurn.name()');
  await sleep(300);
  const phoneAfter = JSON.parse(await state(phone));
  results.phone = { before: phoneBefore.center, after: phoneAfter.center };
  assert(phoneBefore.center.figure === phoneAfter.center.figure, 'On a phone the drawing keeps its place as the source shrinks');
  await shot(phone, 'phase2-phone');

  const errors = [...page.console, ...reduced.console, ...phone.console].filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  assert(errors.length === 0, 'No console errors in the phase');

  const durations = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1]?.ts ?? frames[i].ts + 0.08;
    durations.push(Math.max(30, Math.min(400, Math.round((next - frames[i].ts) * 1000))));
  }
  frames.forEach((f, i) => writeFileSync(`${rec}/${String(i).padStart(4, '0')}.jpg`, f.data));
  results.recording = { captured: frames.length, spanMs: frames.length ? Math.round((frames[frames.length - 1].ts - frames[0].ts) * 1000) : 0 };
  try {
    execFileSync('python3', ['-c', `
from PIL import Image
import glob, sys, json
files = sorted(glob.glob(sys.argv[1] + '/*.jpg'))
durations = json.loads(sys.argv[2])
ims, ds = [], []
for f, d in zip(files, durations):
    im = Image.open(f).convert('RGB')
    if sum(im.resize((1, 1)).getpixel((0, 0))) / 3 > 200:
        continue
    ims.append(im.resize((800, 500))); ds.append(d)
if ims:
    ims[0].save(sys.argv[3], save_all=True, append_images=ims[1:], duration=ds, loop=0, format='WEBP', quality=72, minimize_size=True)
    print(len(ims))
`, rec, JSON.stringify(durations), `${out}/phase2-recording.webp`], { encoding: 'utf8' });
  } catch (error) { evidence.push('recording assembly failed: ' + error.message); }

  results.evidence = evidence;
  results.errors = errors;
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ evidence, failures: results.failures || [], drawing: results.drawing, replay: { elapsed: results.replay.elapsed, lastExecutedRep: results.replay.lastExecutedRep }, centers: { before: afterSettle.center, loop: results.loop.center, defined: results.defined.center }, recording: results.recording, out }, null, 2));
} finally { cdp.close(); }
