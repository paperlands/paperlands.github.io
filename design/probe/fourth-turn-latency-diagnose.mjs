// Diagnostic, not a conformance gate: measure the act's handling frame by frame, in the phases a
// visitor meets them, and report where the time goes.
//
//   TURN_SITE_BASE=http://127.0.0.1:8826 PROBE=fourth-turn-latency-diagnose.mjs bash design/probe/fourth-turn.sh
//
// What it measures, in the page's own terms: the frame deltas of `requestAnimationFrame`, the long
// tasks the browser reports, the synchronous cost of the instrument's own handlers, and how many
// programs the runtime was asked to execute. It asserts nothing; it reports, so a claim about lag
// can be checked against a number instead of a feeling.
import { connect, newPage } from './cdp.mjs';
const cdp = await connect(), page = await newPage(cdp);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const site = process.env.TURN_SITE_BASE || 'http://127.0.0.1:8826';
const report = { kind: 'diagnostic observations; not a passing conformance verdict', site };

const RECORDER = `(() => {
  window.__lat = { frames: [], long: [], handlers: [], on: true };
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    window.__lat.frames.push(Math.round((now - last) * 10) / 10);
    last = now;
    if (window.__lat.on) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__lat.long.push(Math.round(entry.duration)); }).observe({ entryTypes: ['longtask'] });
  } catch { /* the observer is a courtesy, not a contract */ }
})()`;

async function pos(selector) {
  return page.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
}
async function mouse(type, q, held = false) {
  await page.s('Input.dispatchMouseEvent', { type, ...q, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: type === 'mousePressed' || held ? 1 : 0, ...(type === 'mouseMoved' ? {} : { clickCount: 1 }) });
}
// The same sentence the act's own probe uses: a click that the page cannot mistake for a script.
async function click(selector) {
  const q = await pos(selector);
  await mouse('mouseMoved', q); await mouse('mousePressed', q); await mouse('mouseReleased', q);
}
async function waitFor(expression, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await page.evaluate(expression)) return true; await sleep(60); }
  return false;
}
// One measurement: the recorder runs, the hand moves, the numbers are read back.
async function sample(label, action) {
  const before = await page.evaluate('({ posts: window.ft.stagePosts, runs: window.ft.handRuns })');
  await page.evaluate(`window.__lat.frames.length = 0; window.__lat.long.length = 0;`);
  const started = Date.now();
  await action();
  const after = await page.evaluate('({ posts: window.ft.stagePosts, runs: window.ft.handRuns, lat: window.__lat })');
  const frames = after.lat.frames.slice();
  const sorted = [...frames].sort((a, b) => a - b);
  const at = (q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0);
  return {
    label,
    wallMs: Date.now() - started,
    frames: frames.length,
    medianMs: at(0.5),
    p95Ms: at(0.95),
    maxMs: sorted[sorted.length - 1] ?? 0,
    over33: frames.filter((delta) => delta > 33).length,
    longTasks: after.lat.long,
    posts: after.posts - before.posts,
    handRuns: after.runs - before.runs,
  };
}
// Twelve moves along the handle's own rail, at the act's own spacing.
async function sweep(selector, dx, dy, steps = 12, gapMs = 25) {
  const q = await pos(selector);
  await mouse('mouseMoved', q);
  await mouse('mousePressed', q);
  for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', { x: q.x + (dx * i) / steps, y: q.y + (dy * i) / steps }, true); await sleep(gapMs); }
  await mouse('mouseReleased', { x: q.x + dx, y: q.y + dy });
  await sleep(200);
}

try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.goto(site, 1800);
  await page.evaluate('document.querySelector(".fourth-turn").scrollIntoView({ block: "center", behavior: "instant" })');
  await waitFor('!!document.querySelector(".fourth-turn")?.fourthTurn');
  await page.evaluate('window.ft = document.querySelector(".fourth-turn").fourthTurn');
  await page.evaluate(RECORDER);
  await waitFor('window.ft.ready && window.ft.settled');

  // Phase 0 — the arrival, before anything is handled.
  report.arrival = await sample('the square arriving, untouched', async () => { await sleep(1500); });

  // Phase 1 — the first square is drawn; the pairs gather into the loop, and the act's own walk
  // then steps the dial by itself. This is the window the report calls "after the first square".
  await click('#advance');
  await waitFor('window.ft.representation === "loop"');
  report.gather = await sample('the pairs gathering into the loop', async () => { await sleep(1200); });
  report.tour = await sample('the act walking the dial by itself', async () => { await sleep(2000); });

  // Phase 2 — the hand takes the handle and sweeps it, mid-tour and after a pause.
  report.sweepDuringTour = await sample('a sweep while the act is still walking the dial', () => sweep('#grip', 40, -60));

  await page.evaluate('window.ft.played()');
  await sleep(1800);
  report.sweepAtRest = await sample('a sweep once the act has let go', () => sweep('#grip', -40, 60));

  // Phase 3 — the manuscript argument, the other access point to the same value.
  await sleep(1500);
  report.argumentDrag = await sample('a slide on the manuscript argument', () => sweep('.tok-argument.is-active', 60, 0));

  // Phase 4 — the generalisation, where the count is the instrument.
  await page.evaluate('window.ft.played(); window.ft.name(); window.ft.generalise()');
  await waitFor('window.ft.representation === "polygon"');
  await sleep(1200);
  report.sideSweep = await sample('a sweep of the count in the generalisation', () => sweep('#grip', 0, -80));
  // Where the time actually goes, named: a CPU profile across one sweep of the angle handle.
  await page.s('Profiler.enable');
  await page.s('Profiler.setSamplingInterval', { interval: 250 });
  await page.s('Profiler.start');
  await sweep('#grip', 40, -50, 10, 25);
  const { profile } = await page.s('Profiler.stop');
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const self = new Map();
  profile.samples.forEach((id, i) => {
    const node = byId.get(id);
    if (!node) return;
    const frame = node.callFrame;
    const key = `${frame.functionName || '(anonymous)'} · ${(frame.url || '').split('/').slice(-1)[0]}:${frame.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + (profile.timeDeltas[i] ?? 0));
  });
  report.profile = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([key, micro]) => `${key} — ${Math.round(micro / 100) / 10}ms`);
  // The runtime's own cost, measured through the real stage: post a wait-free program, wait for
  // `finished`. The same figure is asked for with the authored optics and with them reduced, so
  // "the drawing is expensive" can be separated from "the page is expensive".
  report.runtime = await page.evaluate(`(async () => {
    const frame = document.querySelector('#runtime');
    const source = window.ft.source;
    const once = (program) => new Promise((resolve) => {
      const id = 90000 + Math.floor(Math.random() * 9000);
      const started = performance.now();
      const onMessage = (event) => {
        if (event.source !== frame.contentWindow || event.data?.channel !== 'fourth-turn-stage') return;
        if (event.data.kind !== 'finished' || event.data.id !== id) return;
        window.removeEventListener('message', onMessage);
        resolve(Math.round((performance.now() - started) * 10) / 10);
      };
      window.addEventListener('message', onMessage);
      frame.contentWindow.postMessage({ channel: 'fourth-turn-host', kind: 'play', id, program, mode: 'swap' }, location.origin);
    });
    const times = async (program) => { const out = []; for (let i = 0; i < 6; i++) out.push(await once(program)); return out; };
    const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
    const authored = await times(source);
    const bare = await times(source.replace('show 9', 'show 1').replace('bold 1.1', 'bold 1'));
    const plain = await times(source.split(String.fromCharCode(10)).filter((line) => !/^(show|bold|beColour)/.test(line)).join(String.fromCharCode(10)));
    return { program: source, authoredMs: median(authored), bareMs: median(bare), plainMs: median(plain), authored, bare, plain };
  })()`);

  report.state = await page.evaluate('({ rep: window.ft.representation, values: window.ft.values, posts: window.ft.stagePosts, runs: window.ft.handRuns, console: null })');
} catch (error) {
  report.error = String(error && error.stack ? error.stack : error);
} finally {
  report.console = page.console?.slice(-12) ?? [];
  console.log(JSON.stringify(report, null, 2));
  cdp.close();
}
