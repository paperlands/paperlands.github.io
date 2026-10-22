// Phase 0 — ordering probe: when may sibling identities be created relative to
// movement, and does a scaffold rest between spawns break settlement?
//   PROBE=fourth-turn-order.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-order';
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });

const agentBlock = (target = 'mod(count + 1, side)') => `as 'agent[count]' do
      show 5
      fn follow ${target}
      loop steps do
        faceto "agent[follow]".x "agent[follow]".y
        fw len/100
        wait 1/25
      end
    end`;

const programs = {
  // One synchronous pass: every `as` is created before the scheduler yields.
  'one-pass': `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    ${agentBlock()}
  end
end
ring 100 4 30`,
  // A rest between spawns: agent0 must read agent1 before it exists.
  'rest-between-spawns': `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    ${agentBlock()}
    wait 0.5
  end
end
ring 100 4 30`,
  // Draw the scaffold with rests, then spawn every agent in one synchronous walk.
  'two-pass': `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    wait 0.3
  end
  jmpto 0 0
  loop side do
    fw len
    lt 360/side
    ${agentBlock()}
  end
end
ring 100 4 30`,
  // Two passes with no rests at all.
  'two-pass-restless': `def ring len side steps do
  loop side do
    fw len
    lt 360/side
  end
  jmpto 0 0
  loop side do
    fw len
    lt 360/side
    ${agentBlock()}
  end
end
ring 100 4 30`,
  // A never-created peer still faults.
  'absent': `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    ${agentBlock('mod(count + 1, side) + 10')}
  end
end
ring 100 4 30`,
};
try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) { const s = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"'); if (s !== 'pending') break; await sleep(150); }
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } })');
  const results = {};
  for (const [id, program] of Object.entries(programs)) {
    const r = JSON.parse(await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`));
    results[id] = r;
    const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}/${id}.png`, Buffer.from(data, 'base64'));
  }
  const summary = Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.ok ? `ok executed=${r.settled.commandCount} ${Math.round(r.settledMs)}ms` : `FAULT@${Math.round(r.atMs)}ms: ${r.error}`]));
  const errors = page.console.filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  writeFileSync(`${out}/report.json`, JSON.stringify({ summary, errors, results }, null, 2));
  console.log(JSON.stringify({ summary, errors, out }, null, 2));
} finally { cdp.close(); }
