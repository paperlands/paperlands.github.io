// Phase 0 smoke probe — vocabulary and the sibling/pursuit contract against the
// CURRENT pin. Run: PROBE=fourth-turn-smoke.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-evidence';
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });

const ngon = (len, side) => `def ngon len side do\n  loop side do\n    fw len\n    lt 360/side\n  end\nend\nngon ${len} ${side}`;
const ring = (side, steps, expr) => `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 6
      let me = count
      let tgt = ${expr}
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
ring 100 ${side} ${steps}`;

const programs = {
  'bracket-scalar': 'let a = [7]\nshow 6\nlt a*10\nfw 40',
  'bracket-vector': 'let a = [7, 3]\nshow 6\nlt 20\nfw 40',
  'paren-remainder': 'let a = (7+1) // 3\nshow 6\nlt a*30\nfw 80',
  'fn-call-2args': 'let a = mod(7, 3)\nlet b = round(3.6, 0.5)\nshow 6\nlt a*30\nfw b*40',
  'numeric-witness': 'let a = round(3.6)\nlet b = mod(7, 3)\nlet c = 7 // 3\nlet d = abs(-4)\nshow 6\nbeColour a/10\nfw 60\nbeColour b/4\nlt 90\nfw 60\nbeColour c/4\nlt 90\nfw 60\nbeColour d/8\nlt 90\nfw 60',
  'pursuit-fn-rem-4': ring(4, 90, '(me+1) // side'),
  'pursuit-fn-mod-4': ring(4, 90, 'mod(me+1, side)'),
  'pursuit-6': ring(6, 180, '(me+1) // side'),
  'pursuit-8': ring(8, 308, '(me+1) // side'),
  'pursuit-3': ring(3, 60, '(me+1) // side'),
  'pursuit-missing': ring(4, 90, '(me+1) // side').replace('agent[tgt]', 'watcher[tgt]'),
  'pursuit-move-first-then-face': `def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 6
      let me = count
      let tgt = (me+1) // side
      loop steps do
        fw len/100
        faceto "agent[tgt]".x "agent[tgt]".y
        wait 1/25
      end
    end
  end
end
ring 100 4 90`,
};

try {
  await page.goto(base, 60);
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"');
    if (state !== 'pending') break;
    await sleep(150);
  }
  const boot = await page.evaluate('JSON.stringify({ ready: window.__ft?.ready, error: window.__ft?.error, artifact: window.__ft?.artifact })');
  const open = await page.evaluate('JSON.stringify(window.__ft.open({ caps: { maxCommands: 15000, maxRecurseDepth: 40 } }))');

  const results = {};
  for (const [id, program] of Object.entries(programs)) {
    const payload = JSON.stringify(program);
    const result = await page.evaluate(`(async () => { const r = await window.__ft.play(${payload}); return JSON.stringify(r); })()`);
    results[id] = JSON.parse(result);
    const shot = await page.s('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${out}/${id}.png`, Buffer.from(shot.data, 'base64'));
    await sleep(120);
  }
  const summary = Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.ok ? `ok cmds=${r.accepted.commands}/${r.settled.commandCount} beats=${r.beats} ${Math.round(r.settledMs)}ms` : `FAULT@${Math.round(r.atMs)}ms: ${r.error}`]));
  const errors = page.console.filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  console.log(JSON.stringify({ boot: JSON.parse(boot), open: JSON.parse(open), summary, errors, out }, null, 2));
  writeFileSync(`${out}/smoke.json`, JSON.stringify({ boot: JSON.parse(boot), open: JSON.parse(open), results, errors }, null, 2));
} finally { cdp.close(); }
