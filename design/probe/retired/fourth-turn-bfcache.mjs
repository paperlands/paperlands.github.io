// Fourth-turn — what survives leaving the page.
//   PROBE=fourth-turn-bfcache.mjs bash design/probe/fourth-turn.sh
//
// `pagehide` disposes the runtime, so a BFCache return would otherwise restore a
// full recipe beside an empty stage. This probe navigates away and back and
// reports whether this build restores the page through the BFCache at all, and
// what the host does when it does.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-bfcache';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const page_url = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
const results = {};
const snapshot = () => page.evaluate(`JSON.stringify({
  representation: window.fourthTurn?.representation ?? null,
  values: window.fourthTurn?.values ?? null,
  finished: window.fourthTurn?.finished ?? null,
  stagePosts: window.fourthTurn?.stagePosts ?? null,
  status: document.querySelector('#status')?.textContent ?? null,
  rows: document.querySelectorAll('.source-row').length,
  nav: performance.getEntriesByType('navigation').map((n) => ({ type: n.type })).concat([{ type: 'restore?' }]).slice(0, 1),
})`);
try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.goto(page_url, 100);
  for (let i = 0; i < 80 && !(await page.evaluate('window.fourthTurn?.ready === true')); i += 1) await sleep(100);
  await page.evaluate('new Promise(r => { const c = () => window.fourthTurn.settled ? r(1) : setTimeout(c, 40); c(); })');
  await page.evaluate('window.fourthTurn.gather(); window.fourthTurn.name(); window.fourthTurn.openRoom(); window.fourthTurn.generalise(); window.fourthTurn.setValue("side", 6);');
  await sleep(500);
  results.before = JSON.parse(await snapshot());

  await page.goto('about:blank', 300);
  await sleep(300);
  await page.evaluate(`history.back()`);
  await sleep(600);
  results.duringRedraw = JSON.parse(await snapshot());
  for (let i = 0; i < 120 && !(await page.evaluate('window.fourthTurn?.finished === true')); i += 1) await sleep(100);
  await sleep(200);
  results.after = JSON.parse(await snapshot());
  results.restored = await page.evaluate('window.fourthTurn?.representation ?? null');
  results.reloadedFresh = results.after.representation === 'explicit';
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ...results, out }, null, 2));
} finally { cdp.close(); }
