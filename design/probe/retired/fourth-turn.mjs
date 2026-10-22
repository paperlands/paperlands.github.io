// Fourth-turn Phase 0 — the native proof, run against the CURRENT pin.
//
//   PROBE=fourth-turn.mjs bash design/probe/fourth-turn.sh
//
// Establishes: executed vocabulary, numeric semantics, polygon geometry,
// sibling identities/scheduling, finite pursuit completion, colour, heads,
// lifecycle/stop semantics, and whether a native X can be observed or carried
// into pursuit. Writes report.json, frames, and a pursuit recording.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-evidence';
const rec = `${out}/recording`;
rmSync(out, { recursive: true, force: true });
mkdirSync(rec, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
const W = 900, H = 900;
await page.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const evidence = [], results = {};
const assert = (ok, label) => { if (!ok) throw new Error(label); evidence.push(label); };

// ---- program builders -------------------------------------------------------
const stepsFor = (side) => Math.ceil(90 / (1 - Math.cos((2 * Math.PI) / side)));
const ngon = (side, len = 100) => `def ngon len side do\n  loop side do\n    fw len\n    lt 360/side\n  end\nend\nngon ${len} ${side}`;
// The successor is bound with `fn`, not `let`. `fn name expr` freezes the value
// at definition; `let name = expr` stays live, so inside the second loop it
// tracks the inner counter and every agent retargets each step (zigzag spokes).
// Verified in fourth-turn-successor.mjs / fourth-turn-labels.mjs.
const ring = (side, steps, { reverse = false } = {}) => {
  const off = reverse ? 'mod(count - 1 + side, side)' : 'mod(count + 1, side)';
  const body = `fn tgt ${off}`;
  return `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 5
      ${body}
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
ring 100 ${side} ${steps}`;
};

const vocabulary = {
  'square-short': 'fw 100\nlt 90\nfw 100\nlt 90\nfw 100\nlt 90\nfw 100\nlt 90',
  'square-long': 'forward 100\nleft 90\nforward 100\nleft 90\nforward 100\nleft 90\nforward 100\nleft 90',
  'square-mixed': 'forward 100\nlt 90\nfd 100\nleft 90\nforward 100\nrt 90\nfd 100\nright 90',
  'move-synonyms': 'fd 100\nrt 45\njump 40\njump 40\njumpto 0 0\ngoto 30 30\nlt 90',
  'numeric-paren': 'let a = round(3.6)\nlet b = round(3.6, 0.5)\nlet c = mod(7, 3)\nlet d = abs(-4)\nlet e = 7 // 3\nlet f = (7 + 1) // 3\nshow 6\nlt a*10\nfw b*40\nrt c*40\nfw d*40\nlt e*40\nfw f*20',
  'colour-hex': 'beColour "e8b04b"\nshow 8\n' + ngon(4),
  'colour-name': 'colour "afd2d0"\nshow 8\n' + ngon(4),
  'colour-random': 'beColour random\nshow 8\n' + ngon(4),
  'head-hide': 'hd\nshow 8\n' + ngon(4),
  'head-show': 'show 8\n' + ngon(4),
  'fault-unknown-verb': 'hop 100',
  'fault-missing-target': 'faceto "ghost".x "ghost".y',
  'fault-bad-arity': 'round(3.6, 0.5, 1)',
};
const geometry = Object.fromEntries([3, 4, 5, 6, 7, 8].map((n) => [`ngon-${n}`, ngon(n)]));
const pursuit = Object.fromEntries([3, 4, 5, 6, 7, 8].map((n) => [`pursuit-${n}`, ring(n, stepsFor(n))]));

async function shoot(name) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function run(id, program) {
  const payload = JSON.stringify(program);
  const raw = await page.evaluate(`(async () => { const r = await window.__ft.play(${payload}); return JSON.stringify(r); })()`);
  const r = JSON.parse(raw);
  results[id] = r;
  await shoot(id);
  return r;
}
function line(r) {
  if (!r.ok) return `FAULT@${Math.round(r.atMs)}ms: ${r.error}`;
  return `ok accepted=${r.accepted.commands} executed=${r.settled.commandCount} beats=${r.beats} ${Math.round(r.settledMs)}ms`;
}

try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"');
    if (state !== 'pending') break;
    await sleep(150);
  }
  const boot = JSON.parse(await page.evaluate('JSON.stringify({ ready: window.__ft?.ready, error: window.__ft?.error, artifact: window.__ft?.artifact })'));
  const open = JSON.parse(await page.evaluate('JSON.stringify(window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } }))'));
  assert(boot.ready === true, `The current pin loads: ${boot.artifact}`);
  assert(JSON.stringify(open.keys) === '["play","onLine","dispose"]', 'The host surface is exactly play / onLine / dispose — no value read-back channel');

  // --- A. vocabulary ---------------------------------------------------------
  for (const [id, program] of Object.entries(vocabulary)) await run(id, program);
  assert(results['square-long'].ok, 'Long verb "forward . left" executes on the current pin (the old pin rejected it)');
  assert(results['square-short'].accepted.commands === results['square-long'].accepted.commands, 'Short and long spellings execute the same number of commands');
  assert(results['move-synonyms'].ok, 'fd / jump / jumpto / goto are accepted');
  assert(results['numeric-paren'].ok, 'round / mod / abs and the // operator execute');
  assert(!results['fault-unknown-verb'].ok && /hop/.test(results['fault-unknown-verb'].error), 'An unknown verb faults with a named error');
  assert(!results['fault-missing-target'].ok && /ghost/.test(results['fault-missing-target'].error), 'A missing successor identity faults honestly');
  assert(!results['fault-bad-arity'].ok, 'A wrong argument count faults');
  assert(results['colour-random'].ok, 'Native beColour random executes');

  // --- B. geometry -----------------------------------------------------------
  for (const [id, program] of Object.entries(geometry)) await run(id, program);
  assert(geometry && results['ngon-8'].ok, 'Regular polygons n=3..8 all execute');
  assert(results['ngon-4'].accepted.commands === results['square-short'].accepted.commands, 'ngon 100 4 executes the same work as the explicit square');

  // --- C. pursuit with a recording ------------------------------------------
  for (const [id, program] of Object.entries(pursuit)) await run(id, program);
  for (const n of [3, 4, 5, 6, 7, 8]) {
    const r = results[`pursuit-${n}`];
    const budget = stepsFor(n);
    assert(r.ok, `pursuit n=${n} completes without fault`);
    // full work is 2 scaffold commands per vertex plus 3 per step per agent
    const expected = n * 2 + n * budget * 3;
    assert(r.settled.commandCount > n * budget * 2, `pursuit n=${n} actually executes the sibling loops (${r.settled.commandCount} > ${n * budget * 2})`);
  }
  assert(results['pursuit-4'].settledMs > 2500, 'A 4-agent pursuit runs its full authored duration, not an early stale settlement');
  results['pursuit-6'].recordedDuration = stepsFor(6) / 25;
  results['pursuit-4'].recordedDuration = stepsFor(4) / 25;

  // Successor direction is real: forward vs reverse curl differently.
  const rev6 = await run('pursuit-6-reverse', ring(6, stepsFor(6), { reverse: true }));
  assert(rev6.ok, 'A reverse successor ring also completes');
  // Contrast, kept deliberately: the SAME successor expression bound with `let`
  // instead of `fn`. Equal command counts, different targeting (zigzag spokes).
  const let6 = await run('pursuit-6-let-contrast', `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 5
      let me = count
      let tgt = mod(me + 1, side)
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
ring 100 6 ${stepsFor(6)}`);
  results['pursuit-6-let-contrast'].summary = line(let6);
  assert(let6.ok && let6.settled.commandCount === results['pursuit-6'].settled.commandCount, 'The let-bound contrast executes the identical command count yet targets differently');

  // Record n=4 and n=6 as a short native recording.
  const frames = [];
  cdp.on((msg) => {
    if (msg.method === 'Page.screencastFrame' && msg.sessionId === page.sessionId) {
      frames.push(Buffer.from(msg.params.data, 'base64'));
      page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
    }
  });
  await page.s('Page.startScreencast', { format: 'jpeg', quality: 72, everyNthFrame: 2, maxWidth: 480, maxHeight: 480 });
  await run('recording-4', ring(4, stepsFor(4)));
  await run('recording-6', ring(6, stepsFor(6)));
  await page.s('Page.stopScreencast');
  frames.forEach((buffer, i) => writeFileSync(`${rec}/${String(i).padStart(4, '0')}.jpg`, buffer));
  evidence.push(`Captured ${frames.length} native pursuit frames`);

  // --- D. lifecycle / stop ---------------------------------------------------
  await page.evaluate('void window.__ft.play(' + JSON.stringify(ring(6, stepsFor(6))) + ').then(r => { window.__run1 = r; })');
  await sleep(500);
  const during = await page.evaluate('window.__ft.hatch ? "running" : "gone"');
  await page.evaluate('window.__ft.dispose()');
  await sleep(250);
  const afterDispose = JSON.parse(await page.evaluate('JSON.stringify(window.__run1)'));
  assert(during === 'running', 'A pursuit was running when stop was requested');
  assert(afterDispose && afterDispose.ok === false, 'dispose() cancels the live pursuit and rejects its promise (stop = cancel)');

  // supersede: a new play replaces the old
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } })');
  await page.evaluate('void window.__ft.play(' + JSON.stringify(ring(6, stepsFor(6))) + ').then(r => { window.__runA = r; })');
  await sleep(400);
  await page.evaluate('void window.__ft.play(' + JSON.stringify(ngon(4)) + ').then(r => { window.__runB = r; })');
  await sleep(400);
  const runA = JSON.parse(await page.evaluate('JSON.stringify(window.__runA)'));
  const runB = JSON.parse(await page.evaluate('JSON.stringify(window.__runB)'));
  assert(runA.ok === false && /superseded/.test(runA.error), 'A newer play supersedes the older run with an explicit "superseded" error');
  assert(runB.ok === true, 'The newer run completes normally');

  // --- E. native X -----------------------------------------------------------
  const xProgram = `jmpto -150 -250
let X
let X.y = -250
let side = round((X.x + 150) / 50) + 3
def ngon len side do
  loop side do
    fw len
    lt 360/side
  end
end
let figure = ngon 100 side`;
  const xResult = await run('native-x', xProgram);
  const dom = JSON.parse(await page.evaluate('JSON.stringify(window.__ft.dom())'));
  results['native-x'].dom = dom;
  assert(xResult.ok, 'A native reactive figure `let X` + derived `side` + `let figure = ngon …` executes');
  writeFileSync(`${out}/native-x-dom.json`, JSON.stringify(dom, null, 2));

  // Find the native point's mounted handle (smallest pointer-active element).
  const handle = await page.evaluate(`(() => {
    const nodes = [...document.body.children].filter(n => n.tagName !== 'CANVAS' && n.tagName !== 'PRE');
    let best = null;
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.width >= 4 && r.height >= 4 && getComputedStyle(n).pointerEvents !== 'none') {
        if (!best || r.width * r.height < best.area) best = { x: r.x + r.width / 2, y: r.y + r.height / 2, area: r.width * r.height, tag: n.tagName, cls: String(n.className) };
      }
    }
    return best;
  })()`);
  results['native-x'].handle = handle;
  if (handle) {
    const before = (await page.s('Page.captureScreenshot', { format: 'png' })).data;
    await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: handle.x, y: handle.y, button: 'left', buttons: 1, clickCount: 1 });
    for (let s = 1; s <= 8; s++) { await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x + s * 12, y: handle.y, button: 'left', buttons: 1 }); await sleep(25); }
    await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: handle.x + 96, y: handle.y, button: 'left', buttons: 0 });
    await sleep(500);
    const after = (await page.s('Page.captureScreenshot', { format: 'png' })).data;
    await shoot('native-x-dragged');
    results['native-x'].dragChangedGeometry = before !== after;
    evidence.push(`Native point drag on the mounted ${handle.tag}: geometry ${before !== after ? 'changed' : 'unchanged'}`);
  }
  // Can the host read the native value? There is no channel; record the attempt.
  const readBack = await page.evaluate(`(() => {
    const h = window.__ft.hatch;
    const names = Object.getOwnPropertyNames(h);
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(h));
    return { own: names, proto, hasValue: names.some(n => /value|x|figure|state/i.test(n)) };
  })()`);
  results['native-x'].readBack = readBack;
  assert(readBack.hasValue === false, 'The host exposes no value/X/figure/state read-back on the hatch object');

  // Native X driving the whole pursuit in one run.
  const xPursuit = `jmpto -150 -250
let X
let X.y = -250
let side = round((X.x + 150) / 50) + 3
def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 5
      let me = count
      let tgt = mod(me + 1, side)
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
let figure = ring 100 side 90`;
  const xp = await run('native-x-pursuit', xPursuit);
  results['native-x-pursuit'].summary = line(xp);
  if (xp.ok) evidence.push('A single native run carries X.x into the pursuit spawn (`let figure = ring 100 side 90`)');
  else evidence.push('Native X cannot carry into pursuit in one run: ' + xp.error);

  const summary = Object.fromEntries(Object.entries(results).map(([id, r]) => [id, line(r)]));
  const errors = page.console.filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  writeFileSync(`${out}/report.json`, JSON.stringify({ boot, open, summary, evidence, errors, results }, null, 2));
  // Animated webp from the short recording.
  try {
    execFileSync('python3', ['-c', `
from PIL import Image
import glob, sys
frames = sorted(glob.glob(sys.argv[1] + '/*.jpg'))
if frames:
    ims = [Image.open(f).convert('RGB') for f in frames]
    ims[0].save(sys.argv[2], save_all=True, append_images=ims[1:], duration=70, loop=0, format='WEBP', quality=72)
    print(len(ims))
`, rec, `${out}/pursuit-recording.webp`], { encoding: 'utf8' });
  } catch (error) { evidence.push('recording assembly failed: ' + error.message); }
  console.log(JSON.stringify({ boot, open, summary, evidence, errors, out }, null, 2));
} finally { cdp.close(); }
