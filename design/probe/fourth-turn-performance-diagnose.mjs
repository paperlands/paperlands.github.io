// Diagnostic, not a gate: where do a performance's line reports go, what does the press say while it
// runs, and is a stop actually witnessed?
//
//   PROBE=fourth-turn-performance-diagnose.mjs bash design/probe/fourth-turn.sh
//
// Three observations in the act probe are recorded rather than asserted, and each needs a root cause
// before it can become a claim. This probe measures all three, and separates the candidates:
//
//   1. Line reports. The act counted 1 in three seconds where the probe rig counts hundreds for the
//      same shape. Two candidates: the *program* (the act runs the replay form, with its authored
//      rests) or the *stage* (the act presents through two canvases, and its caps differ). The rig
//      can play the act's own executed source, so the program can be held constant while the stage
//      changes — which decides it.
//   2. The press's word. Sampled every 150 ms through a whole performance, so "was it ever right"
//      replaces "was it right when we looked".
//   3. The stop. `finished` is true after a natural end and after a cancel alike, so the timeline
//      records the controller's own disposition and the presented result: `cancelled` is a stop, and
//      an `ok` result is an end that happened on its own.
import { connect, newPage } from './cdp.mjs';
const cdp = await connect();
const rigOnly = process.env.PROBE_RIG_ONLY === '1';
const base = process.env.TURN_SITE_BASE || 'http://127.0.0.1:8847';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { kind: 'diagnostic observations; not a passing conformance verdict' };

const rig = await newPage(cdp);
await rig.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
await rig.goto(process.env.PROBE_BASE || 'http://127.0.0.1:8847/design/probe/fourth-turn.html', 60);
for (let i = 0; i < 80; i += 1) {
  const state = await rig.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"');
  if (state !== 'pending') break;
  await sleep(150);
}

const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await page.goto(base, 1800);
await page.evaluate('document.querySelector(".fourth-turn").scrollIntoView({ block: "center", behavior: "instant" })');
for (let i = 0; i < 90; i += 1) {
  if (await page.evaluate('!!document.querySelector(".fourth-turn")?.fourthTurn?.ready')) break;
  await sleep(200);
}
await page.evaluate('window.ft = document.querySelector(".fourth-turn").fourthTurn');
await waitFor('window.ft.settled', 12000);

async function waitFor(expression, timeout = 9000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await page.evaluate(expression)) return true; await sleep(80); }
  return false;
}
async function toPolygon() {
  for (let i = 0; i < 6; i += 1) {
    if (await page.evaluate('window.ft.representation === "polygon"')) return true;
    await page.evaluate('window.ft.played(); document.querySelector("#advance").click()');
    await waitFor('window.ft.representation === "polygon"', 9000);
    await sleep(400);
  }
  return page.evaluate('window.ft.representation === "polygon"');
}

// Every message the stage sends, counted by kind: the page's own count can then be compared with
// what actually crossed the bridge.
await page.evaluate(`(() => {
  window.__bridge = { kinds: {}, lines: 0 };
  window.addEventListener('message', (event) => {
    if (event.data?.channel !== 'fourth-turn-stage') return;
    const kind = event.data.kind;
    window.__bridge.kinds[kind] = (window.__bridge.kinds[kind] ?? 0) + 1;
    if (kind === 'beat') window.__bridge.lines += 1;
  });
})()`);

const sample = () => page.evaluate(`(() => {
  const ft = window.ft, r = ft.run ?? {};
  return {
    label: document.querySelector('#advance').getAttribute('aria-label'),
    act: document.querySelector('#advance').dataset.act ?? null,
    status: (document.querySelector('#status').textContent || '').slice(0, 54),
    disposition: r.disposition ?? null,
    submitted: r.submitted ? r.submitted.id : null,
    cancelled: r.presented ? String(!!r.presented.cancelled) : null,
    result: r.presented && r.presented.result ? (r.presented.result.cancelled ? 'cancelled' : r.presented.result.ok ? 'ok' : 'failed') : null,
    beats: ft.beats, bridgeLines: window.__bridge.lines, posts: ft.stagePosts,
    state: document.querySelector('.fourth-turn').dataset.state,
  };
})()`);

try {
  report.motion = await page.evaluate('({ reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, saveData: !!navigator.connection?.saveData })');
  if (!await toPolygon()) throw new Error('the act never reached the polygon');

  // ---- 2 and 3: the press's word, and whether a stop is witnessed ----------------------------
  report.timeline = [];
  await page.evaluate('window.ft.played(); document.querySelector("#advance").click()');   // begin
  const began = Date.now();
  let pressed = false;
  while (Date.now() - began < 16000) {
    const row = await sample();
    row.ms = Date.now() - began;
    report.timeline.push(row);
    if (!pressed && row.ms > 2600 && row.disposition === 'running') {
      pressed = true;
      await page.evaluate('window.ft.played(); document.querySelector("#advance").click()');   // stop
      row.pressedStop = true;
    }
    if (row.ms > 3000 && row.disposition !== 'running') break;
    await sleep(150);
  }
  report.stopWitnessed = report.timeline.some((row) => row.cancelled === 'true' || row.result === 'cancelled');
  report.wordSeen = [...new Set(report.timeline.map((row) => row.label))];
  report.statusSeen = [...new Set(report.timeline.map((row) => row.status))];
  report.executedSource = await page.evaluate('window.ft.source');

  report.actExecutedSource = report.executedSource;
  report.reports = [];
  if (!rigOnly) {
  // ---- 1: the line reports, program held constant, stage and caps varied ---------------------
  const rigSource = await rig.evaluate(`(() => {
    const ring = ['beColour "e8b04b"', 'bold 1.1', 'hd', 'jmpto -50 -50', '', 'def ring len side steps do', 'loop side do', 'forward len', 'left 360/side', "as 'agent[count]' do", 'show 5', 'fn tgt mod(count + 1, side)', 'loop steps do', 'faceto "agent[tgt]".x "agent[tgt]".y', 'fw len/100', 'wait 1/25', 'end', 'end', 'end', 'end', '', 'ring 100 4 91'].join(String.fromCharCode(10));
    return ring;
  })()`);
  const runs = [
    { name: 'rig · its own ring, caps 60000', program: rigSource, caps: 60000 },
    { name: 'rig · its own ring, caps 15000', program: rigSource, caps: 15000 },
    { name: 'rig · the act\'s executed source, caps 15000', program: report.executedSource, caps: 15000 },
    { name: 'rig · the act\'s executed source, caps 60000', program: report.executedSource, caps: 60000 },
  ];
  for (const run of runs) {
    await rig.evaluate(`window.__ft.open({ caps: { maxCommands: ${run.caps}, maxRecurseDepth: 40 } })`);
    const result = JSON.parse(await rig.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(`${run.program}\n\nwait 0.5`)})))()`));
    report.reports.push({
      name: run.name,
      ok: result.ok,
      error: result.error ?? null,
      commands: result.settled?.commandCount ?? null,
      beats: result.beats ?? null,
      beatLines: result.beatLines ?? null,
      ms: Math.round(result.settledMs ?? 0),
    });
  }
  }
} catch (error) {
  report.error = String(error && error.stack ? error.stack : error);
} finally {
  console.log(JSON.stringify(report, null, 2));
  cdp.close();
}
