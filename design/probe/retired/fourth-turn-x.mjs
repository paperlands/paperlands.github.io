// Fourth-turn Phase 0 — the native-X gate, focused.
//   PROBE=fourth-turn-x.mjs bash design/probe/fourth-turn.sh
// Answers: can the host read X.x, can a native run carry X.x into a sibling
// pursuit (open vs closed region), and does dragging the native point change
// the geometry?
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-x';
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
const W = 900, H = 900;
await page.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const evidence = [], results = {};
const assert = (ok, label) => { evidence.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) results.failures = [...(results.failures || []), label]; };

const head = `jmpto -150 -250
let X
let X.y = -250
let side = round((X.x + 150) / 50) + 3`;
const ringBody = (read) => `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 5
      fn tgt mod(count + 1, side)
      loop steps do
        ${read ? 'faceto "agent[tgt]".x "agent[tgt]".y' : 'lt 0'}
        fw len/100
        wait 1/25
      end
    end
  end
end`;
const programs = {
  'x-let-ngon': `${head}
def ngon len side do
  loop side do
    fw len
    lt 360/side
  end
end
let figure = ngon 100 side`,
  'x-top-ring': `${head}
${ringBody(true)}
ring 100 side 90`,
  'x-let-ring': `${head}
${ringBody(true)}
let figure = ring 100 side 90`,
  'x-let-ring-no-read': `${head}
${ringBody(false)}
let figure = ring 100 side 90`,
};
async function run(id, program) {
  const raw = await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`);
  results[id] = JSON.parse(raw);
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${id}.png`, Buffer.from(data, 'base64'));
  return results[id];
}
try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) { const s = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"'); if (s !== 'pending') break; await sleep(150); }
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } })');

  for (const [id, program] of Object.entries(programs)) await run(id, program);
  assert(results['x-let-ngon'].ok, 'A native reactive polygon reads X.x and executes');
  assert(results['x-top-ring'].ok, 'A top-level pursuit call can use an X-derived side');
  assert(!results['x-let-ring'].ok && /closed region/.test(results['x-let-ring'].error), 'Wrapping the sibling pursuit in `let figure` closes the region and blocks the world read');
  assert(results['x-let-ring-no-read'].ok, 'A sibling call that reads no other figure still runs inside `let figure`');

  // Locate the native point from the runtime's own overlay, then drag it with
  // the camera locked so no unclaimed gesture can fake a geometry change.
  await run('x-pin-base', programs['x-let-ngon']);
  await page.evaluate('window.__ft.lockCamera()');
  await sleep(200);
  const pin = JSON.parse(await page.evaluate('JSON.stringify(window.__ft.pinBox())'));
  const pinImg = await page.evaluate('window.__ft.pinImage()');
  if (typeof pinImg === 'string' && pinImg.startsWith('data:')) writeFileSync(`${out}/overlay.png`, Buffer.from(pinImg.split(',')[1], 'base64'));
  results.pin = pin;
  const shot = async () => (await page.s('Page.captureScreenshot', { format: 'png' })).data;
  if (pin.hot || (pin.box && pin.count > 0)) {
    const from = pin.hot || { x: pin.box.cx, y: pin.box.cy };
    const before = await shot();
    await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 });
    for (const step of [40, 80, 120, 160]) { await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: from.x + step, y: from.y, button: 'left', buttons: 1 }); await sleep(30); }
    await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: from.x + 160, y: from.y, button: 'left', buttons: 0 });
    await sleep(700);
    const after = await shot();
    writeFileSync(`${out}/x-dragged.png`, Buffer.from(after, 'base64'));
    results.dragChanged = before !== after;
    assert(before !== after, 'Dragging the native point changes the reactive polygon geometry');
    const quietA = await shot();
    await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: 820, y: 820, button: 'left', buttons: 1, clickCount: 1 });
    await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 760, button: 'left', buttons: 1 });
    await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 760, button: 'left', buttons: 0 });
    await sleep(300);
    const quietB = await shot();
    results.backgroundDragChanged = quietA !== quietB;
    assert(quietA === quietB, 'With the camera locked, an unclaimed canvas drag changes nothing, so the pin drag is attributable');
  } else {
    evidence.push('SKIP native drag: no 2D overlay pin was found (' + JSON.stringify(pin) + ')');
  }

  results.evidence = evidence;
  const errors = page.console.filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  results.errors = errors;
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ evidence, pin: results.pin, dragChanged: results.dragChanged, backgroundDragChanged: results.backgroundDragChanged, summary: Object.fromEntries(Object.entries(programs).map(([id]) => [id, results[id]?.ok ? `ok executed=${results[id].settled.commandCount}` : `FAULT: ${results[id]?.error}`])), errors, out }, null, 2));
} finally { cdp.close(); }
