// Fourth-turn — which canvas actually holds the drawing, and how to read it.
//   PROBE=fourth-turn-canvas-diagnose.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-canvas-diagnose';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
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
try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) { const s = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"'); if (s !== "pending") break; await sleep(150); }
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 15000 } })');
  await page.evaluate(`(async () => { await window.__ft.play(${JSON.stringify(PROGRAM)}); })()`);
  await page.evaluate('new Promise(r => setTimeout(r, 400))');
  const report = await page.evaluate(`(() => {
    const rows = [];
    const cs = [...document.querySelectorAll('canvas')];
    for (const c of cs) {
      const r = c.getBoundingClientRect();
      let url = null, urlChars = null, err = null;
      try { url = c.toDataURL('image/png'); urlChars = url.length; } catch (e) { err = String(e); }
      // count ink by drawing into a 2D canvas
      let ink = null, inkErr = null;
      try {
        const off = document.createElement('canvas');
        off.width = c.width; off.height = c.height;
        const ctx = off.getContext('2d');
        ctx.drawImage(c, 0, 0);
        const d = ctx.getImageData(0, 0, off.width, off.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 32) n++;
        ink = n;
      } catch (e) { inkErr = String(e); }
      rows.push({ tag: c.tagName, cls: c.className, id: c.id, w: c.width, h: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), inDom: document.contains(c), urlChars, ink, inkErr, err, url });
    }
    return JSON.stringify({ count: cs.length, rows, bodyChildren: [...document.body.children].map((n) => n.tagName + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className : '')) });
  })()`);
  const data = JSON.parse(report);
  for (const row of data.rows) {
    if (row.url) writeFileSync(`${out}/canvas-${row.w}x${row.h}${row.cls ? '-' + row.cls : ''}.png`, Buffer.from(String(row.url).split(',')[1], 'base64'));
    delete row.url;
  }
  writeFileSync(`${out}/report.json`, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
} finally { cdp.close(); }
