// Fourth-turn — the thread on a narrow page. Why the polyline's points come back
// empty on a 390 px viewport, when the same code sets them on a wide one.
//   PROBE=fourth-turn-thread-diagnose.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-thread-diagnose';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const page_url = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
const dump = () => page.evaluate(`JSON.stringify((() => {
  const el = document.querySelector('#thread-line');
  const svg = document.querySelector('#thread');
  return {
    count: document.querySelectorAll('#thread-line').length,
    tag: el?.tagName ?? null,
    points: el?.getAttribute('points') ?? null,
    html: el?.outerHTML?.slice(0, 160) ?? null,
    threadHidden: svg?.hasAttribute('hidden') ?? null,
    narrow: matchMedia('(max-width: 650px)').matches,
    active: window.fourthTurn.active,
    representation: window.fourthTurn.representation,
    argumentToken: document.querySelector('.tok-argument.is-active')?.textContent ?? null,
    tokens: document.querySelectorAll('.tok-argument').length,
    notation: !!document.querySelector('.notation'),
    grip: document.querySelector('#grip').getBoundingClientRect().toJSON(),
  };
})())`);
try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await page.s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.goto(page_url, 100);
  for (let i = 0; i < 80 && !(await page.evaluate('window.fourthTurn?.ready === true')); i += 1) await sleep(100);
  await page.evaluate('new Promise(r => { const c = () => window.fourthTurn.settled ? r(1) : setTimeout(c, 40); c(); })');
  const results = { atStart: JSON.parse(await dump()) };
  for (let i = 0; i < 3; i += 1) {
    await page.evaluate('document.querySelector("#advance").click()');
    await sleep(1200);
    results[`step${i + 1}`] = JSON.parse(await dump());
  }
  // the exact expression the phase probe uses, before anything else touches it
  results.crossingBefore = JSON.parse(await page.evaluate(`JSON.stringify((() => {
    const line = document.querySelector('#thread-line');
    const raw = line.getAttribute('points');
    const pts = (raw || '').trim().split(' ').filter(Boolean).map((p) => p.split(',').map(Number)).filter((p) => p.length === 2);
    const svg = document.querySelector('#thread').getBoundingClientRect();
    const rects = [...document.querySelectorAll('#source .code')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    return { raw, points: pts.length, rects: rects.length, svg: [svg.left, svg.top, svg.width, svg.height] };
  })())`));
  await page.evaluate('window.fourthTurn.setValue("len", 245)');
  await sleep(500);
  results.afterSetValue = JSON.parse(await dump());
  const errors = [...page.console].filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  results.errors = errors;
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/phone.png`, Buffer.from(data, 'base64'));
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { cdp.close(); }
