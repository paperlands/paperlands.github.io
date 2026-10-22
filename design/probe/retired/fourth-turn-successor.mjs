// Phase 0 follow-up — fixed-successor targeting. Command counts cannot tell a
// stable ring from a per-step retarget; only the drawn paths can. This probe runs
// each binding form at the FULL budget so nothing is hidden by shortening.
//   PROBE=fourth-turn-successor.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-successor';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
const stepsFor = (s) => Math.ceil(90 / (1 - Math.cos((2 * Math.PI) / s)));

const ring = (side, steps, body) => `def ring len side steps do
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

// n=6, full budget. Each variant differs only in how the successor is bound.
const variants = {
  'A-let-me-let-tgt': ring(6, stepsFor(6), 'let me = count\n      let tgt = mod(me + 1, side)'),
  'B-fn-direct': ring(6, stepsFor(6), 'fn tgt mod(count + 1, side)'),
  'C-let-direct': ring(6, stepsFor(6), 'let tgt = mod(count + 1, side)'),
  'D-let-me-fn-tgt': ring(6, stepsFor(6), 'let me = count\n      fn tgt mod(me + 1, side)'),
  'E-fn-reverse': ring(6, stepsFor(6), 'fn tgt mod(count - 1 + side, side)'),
  // A reading witness: label the successor index at each agent (n=4, short).
  'F-label-let': ring(4, 20, 'let me = count\n      let tgt = mod(me + 1, side)\n      label tgt'),
  'G-label-fn': ring(4, 20, 'fn tgt mod(count + 1, side)\n      label tgt'),
  'H-label-plain': ring(4, 20, 'let tgt = 2\n      label tgt'),
};
async function run(id, program) {
  const r = JSON.parse(await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`));
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${id}.png`, Buffer.from(data, 'base64'));
  return r;
}
try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) { const s = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"'); if (s !== 'pending') break; await sleep(150); }
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } })');
  const results = {};
  for (const [id, program] of Object.entries(variants)) {
    const r = await run(id, program);
    results[id] = { ok: r.ok, executed: r.ok ? r.settled.commandCount : null, error: r.ok ? null : r.error, program };
  }
  // A shape metric: a correct ring is smooth (small turning variance along the
  // path), a per-step retarget zigzags. Measure per-trail turning-angle spread.
  const shape = JSON.parse(execFileSync('python3', ['-c', `
import sys, json
from PIL import Image
out = {}
for name in sys.argv[1:]:
    im = Image.open(name + '.png').convert('RGB'); px = im.load(); w, h = im.size
    pts = [(x, y) for y in range(0, h, 2) for x in range(0, w, 2) if px[x, y][0] > 150 and px[x, y][0] > px[x, y][2] + 30]
    # crude curvature signal: count of sharp direction changes along the topmost
    # per-column trace is unreliable; instead report ink density and spread.
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    out[name.split('/')[-1]] = {'ink': len(pts), 'spanX': (max(xs) - min(xs)) if pts else 0, 'spanY': (max(ys) - min(ys)) if pts else 0}
print(json.dumps(out))
`, ...Object.keys(variants).map((id) => `${out}/${id}`)], { encoding: 'utf8' }));
  writeFileSync(`${out}/report.json`, JSON.stringify({ results, shape }, null, 2));
  console.log(JSON.stringify({ results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok ? `ok executed=${v.executed}` : `FAULT: ${v.error}`])), shape, out }, null, 2));
} finally { cdp.close(); }
