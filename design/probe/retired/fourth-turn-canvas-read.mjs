// Fourth-turn — how to observe the native canvas honestly.
// WebGL drawing buffers are cleared after compositing, so a screenshot taken
// long after a static run can come back empty. This probe finds a measurement
// route that does not depend on capture timing, before the geometry probe's
// numbers are trusted.
//   PROBE=fourth-turn-canvas-read.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-canvas-read';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
const results = {};
const PROGRAM = `beColour "e6b366"
bold 1.1
show 9
def ngon len side do
  jmpto 0-len/2 0-(len/(2*tan(pi/side)))
  loop side do
    forward len
    left 360/side
  end
end
ngon 250 6`;
function inkOf(name) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
im = Image.open(sys.argv[1]).convert('L')
bg = im.getpixel((2, 2))
m = im.point(lambda v: 255 if v > bg + 25 else 0)
bb = m.getbbox()
data = list(m.getdata())
print(json.dumps({'bbox': bb, 'ink': sum(1 for p in data if p)}))
`, `${out}/${name}.png`], { encoding: 'utf8' }));
}
async function shot(name) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
  return inkOf(name);
}
try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) { const s = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"'); if (s !== 'pending') break; await sleep(150); }
  results.keys = JSON.parse(await page.evaluate('JSON.stringify(Object.keys(window.__ft.open({ caps: { maxCommands: 15000 } })))'));
  results.hatchKeys = JSON.parse(await page.evaluate('JSON.stringify(Object.keys(window.__ft.hatch))'));
  results.hatchProto = JSON.parse(await page.evaluate('JSON.stringify(Object.getOwnPropertyNames(Object.getPrototypeOf(window.__ft.hatch)))'));
  results.run = JSON.parse(await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(PROGRAM)})))()`));

  // 1. Straight after the run, with no delay.
  results.immediate = await shot('immediate');
  // 2. Again, to see whether a capture itself clears the buffer.
  results.second = await shot('second');
  // 3. After two animation frames.
  await page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
  results.afterRaf = await shot('after-raf');
  // 4. After a DOM repaint nudge.
  await page.evaluate(`(() => { document.body.style.outline = '1px solid transparent'; document.body.getBoundingClientRect(); document.body.style.outline = ''; })()`);
  results.afterNudge = await shot('after-nudge');
  // 5. A direct canvas readback, if the runtime preserves its drawing buffer.
  results.readback = JSON.parse(await page.evaluate(`(() => {
    const c = document.querySelector('canvas');
    const url = c.toDataURL('image/png');
    const off = document.createElement('canvas'); off.width = c.width; off.height = c.height;
    const ctx = off.getContext('2d'); const img = new Image();
    return JSON.stringify({ dataUrlChars: url.length, head: url.slice(0, 30) });
  })()`));
  writeFileSync(`${out}/readback.txt`, results.readback.head);
  // 6. During a slow run: still animating when captured.
  const slow = PROGRAM + '\nwait 1.2';
  await page.evaluate(`window.__ft.play(${JSON.stringify(slow)})`);
  await sleep(270);
  results.duringRun = await shot('during-run');
  await sleep(1400);
  results.afterSlow = await shot('after-slow');
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ...results, out }, null, 2));
} finally { cdp.close(); }
