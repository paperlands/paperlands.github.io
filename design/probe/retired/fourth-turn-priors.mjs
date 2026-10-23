// Phase 0 — the operator's own code pieces, tested verbatim on the current pin.
//   PROBE=fourth-turn-priors.mjs bash design/probe/fourth-turn.sh
// Then one corrected open-world variant, so we know exactly what the pin rejects
// versus what only the spelling needed to change.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-priors';
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });

const programs = {
  'u1-square-named': `def square do
  loop 4 do
    fw 100
    lt 90
  end
end
let polygon = square`,
  'u2-square-sizer': `def square len do
  loop 4 do
    fw len
    lt 90
  end
end
let sizer
let sizer.y=0
let polygon = square sizer.x`,
  'u3-ngon-sizer': `def ngon len side do
  loop side do
    fw len
    lt 360/side
  end
end
let X
let X.y=0
let polygon = ngon X.x round(X.x/5)`,
  'u4-mice-verbatim': `def ngon len side do
  loop side do
    forward len
    left 360/side
    beColour random
    as 'mice[count]' do
      hd
      fn follow mod([count+1], side)
      loop 1000 do
        fw len/50
        wait 1/50
        faceto "mice[follow]".x "mice[follow]".y
      end
    end
  end
end
let X
let X.y=0
let polygon = ngon X.x round(X.x/20)`,
  'u5-bracket-mod-only': `def ngon len side do
  loop side do
    fw len
    lt 360/side
    as 'mice[count]' do
      let follow = mod([count+1], side)
      faceto "mice[follow]".x "mice[follow]".y
    end
  end
end
ngon 100 4`,
  'u6-mice-open-world': `def ngon len side steps do
  loop side do
    forward len
    left 360/side
    beColour random
    as 'mice[count]' do
      hd
      fn follow mod(count + 1, side)
      loop steps do
        faceto "mice[follow]".x "mice[follow]".y
        fw len/50
        wait 1/50
      end
    end
  end
end
ngon 100 6 120`,
  'u7-mice-open-visible': `def ngon len side steps do
  loop side do
    forward len
    left 360/side
    beColour random
    as 'mice[count]' do
      show 5
      fn follow mod(count + 1, side)
      loop steps do
        faceto "mice[follow]".x "mice[follow]".y
        fw len/50
        wait 1/50
      end
    end
  end
end
ngon 100 6 120`,
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
  const summary = Object.fromEntries(Object.entries(results).map(([id, r]) => [id, r.ok ? `ok executed=${r.settled.commandCount} beats=${r.beats} ${Math.round(r.settledMs)}ms` : `FAULT@${Math.round(r.atMs)}ms: ${r.error}`]));
  const errors = page.console.filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  writeFileSync(`${out}/report.json`, JSON.stringify({ summary, errors, results }, null, 2));
  console.log(JSON.stringify({ summary, errors, out }, null, 2));
} finally { cdp.close(); }
