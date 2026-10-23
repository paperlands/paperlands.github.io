// Diagnostic, not a gate: how long from the act's arrival to "play with the angles"?
//
//   PROBE=fourth-turn-arrival-diagnose.mjs bash design/probe/fourth-turn.sh
//
// The transition into the loop is the act's own next step — the visitor did not ask for it — so any
// pause in it is dead time, not reading time. This probe dates the moments and separates the parts:
// the opening's authored walk (visible progress, the subject of the act), the page's own settle after
// it, the pace's rest before the act moves on, and where the instrument finally answers.
import { connect, newPage } from './cdp.mjs';
const cdp = await connect();
const site = process.env.TURN_SITE_BASE || 'http://127.0.0.1:8847';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { kind: 'diagnostic observations; not a passing conformance verdict', site };

const sample = (target) => target.evaluate(`(() => {
  const ft = document.querySelector('.fourth-turn')?.fourthTurn;
  return JSON.stringify({
    rep: ft ? ft.representation : null,
    verb: document.querySelector('#verb')?.textContent ?? null,
    settled: ft ? ft.settled : null,
    beatCount: ft ? ft.beatCount : null,
    state: document.querySelector('.fourth-turn')?.dataset.state ?? null,
    gripHidden: !ft || document.querySelector('#grip')?.hasAttribute('hidden'),
  });
})()`);

// One run, dated: the same page watched from its arrival, with and without a press.
async function dated(press) {
  const page = await newPage(cdp);
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const marks = { start: Date.now() };
  await page.goto(site, 1800);
  marks.loaded = Date.now();
  await page.evaluate('document.querySelector(".fourth-turn").scrollIntoView({ block: "center", behavior: "instant" })');
  let pressed = false;
  const timeline = [];
  for (let i = 0; i < 240; i += 1) {
    const row = JSON.parse(await sample(page));
    row.ms = Date.now() - marks.loaded;
    const last = timeline[timeline.length - 1];
    if (!last || last.rep !== row.rep || last.verb !== row.verb || last.settled !== row.settled || (row.beatCount ?? 0) !== (last.beatCount ?? 0)) timeline.push(row);
    if (press && !pressed && row.rep === 'explicit' && row.ms > 400) {
      pressed = true;
      await page.evaluate('document.querySelector("#advance").click()');
      marks.pressed = Date.now() - marks.loaded;
    }
    if (row.rep === 'loop' && row.verb === 'play with the angles.') { marks.loop = row.ms; break; }
    if (row.rep === 'loop') { marks.loopAt = marks.loopAt ?? row.ms; }
    await sleep(50);
  }
  return { marks, timeline: timeline.map((r) => ({ ms: r.ms, rep: r.rep, verb: r.verb, settled: r.settled, beats: r.beatCount, gripHidden: r.gripHidden })) };
}

try {
  report.untouched = await dated(false);
  report.pressed = await dated(true);
  report.summary = {
    'untouched: to the loop (ms)': report.untouched.marks.loop ?? null,
    'pressed early: to the loop (ms)': report.pressed.marks.loop ?? null,
    'press made at (ms)': report.pressed.marks.pressed ?? null,
  };
} catch (error) {
  report.error = String(error && error.stack ? error.stack : error);
} finally {
  console.log(JSON.stringify(report, null, 2));
  cdp.close();
}
