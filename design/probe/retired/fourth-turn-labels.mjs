// Phase 0 follow-up — numeric proof of fixed-successor targeting.
// The index is labelled AFTER the loop, once each agent has finished, so a value
// that tracks the live loop counter is exposed.
//   PROBE=fourth-turn-labels.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-labels';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });

// A short run so the four agents stay separated and their labels stay legible.
const ring = (side, steps, pre, post) => `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 5
      ${pre}
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
      ${post}
    end
  end
end
ring 100 ${side} ${steps}`;

const variants = {
  'L-let-me-let-tgt': ring(4, 3, 'let me = count\n      let tgt = mod(me + 1, side)', 'label tgt 18'),
  'M-fn-direct': ring(4, 3, 'fn tgt mod(count + 1, side)', 'label tgt 18'),
  'N-let-me-fn-tgt': ring(4, 3, 'let me = count\n      fn tgt mod(me + 1, side)', 'label tgt 18'),
  'O-control-fixed': ring(4, 3, 'let tgt = 2', 'label tgt 18'),
  // Diagnostics: does the binding hold a displayable value after the loop?
  'P-let-count-label': ring(4, 3, 'let me = count\n      fn tgt mod(count + 1, side)', 'label me 18'),
  'Q-fn-count-label': ring(4, 3, 'fn me count\n      fn tgt mod(count + 1, side)', 'label me 18'),
};
async function run(id, program) {
  const raw = await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`);
  const r = JSON.parse(raw);
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${id}.png`, Buffer.from(data, 'base64'));
  return r;
}
try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) { const s = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"'); if (s !== "pending") break; await sleep(150); }
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } })');
  const results = {};
  for (const [id, program] of Object.entries(variants)) results[id] = await run(id, program);
  writeFileSync(`${out}/report.json`, JSON.stringify({ results }, null, 2));
  console.log(JSON.stringify({ results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok ? 'ok' : `FAULT: ${v.error}`])), out }, null, 2));
} finally { cdp.close(); }
