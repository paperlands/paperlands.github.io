// Diagnostic, not a gate: which spawn form actually leaves trails?
//
//   PROBE=fourth-turn-pursuit-diagnose.mjs bash design/probe/fourth-turn.sh
//
// The first pursuit run settled, executed 1112 commands and announced 365 line beats — and drew a
// bare scaffold square with no trails at all. Command counts and beats again said nothing about the
// picture. This isolates the two places the probe's generated source differed from the phase-0
// canonical text: the spawn name (`agent[count]` against a literal index) and where the colour is
// set (top level against inside the agent block).
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-pursuit-diagnose';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
const frames = [];
cdp.on((msg) => {
  if (msg.method !== 'Page.screencastFrame' || msg.sessionId !== page.sessionId) return;
  frames.push(Buffer.from(msg.params.data, 'base64'));
  page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
});

// The phase-0 canonical text, verbatim.
const CANONICAL = `# warm gold, one small head, born on the left
beColour "e8b04b"
bold 1.1
show 9

def ring len side steps do
  loop side do
    fw len
    lt 360/side
    as 'agent[count]' do
      show 5
      fn tgt mod(count + 1, side)
      loop steps do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
ring 100 4 91`;

// Generated the way the pursuit probe generated it: the spawn name written out as a literal.
const generated = (spawn, colourAt) => {
  const agents = [0, 1, 2, 3].map((i) => `  as 'agent[${spawn === 'literal' ? i : 'count'}]' do
    ${colourAt === 'inside' ? 'beColour "e8b04b"' : ''}
    show 5
    fn tgt mod(count + 1, side)
    loop 91 do
      faceto "agent[tgt]".x "agent[tgt]".y
      fw len/100
      wait 1/25
    end
  end`).join('\n');
  return `beColour "e8b04b"
bold 1.1
hd

def ring len side steps do
  loop side do
    forward len
    left 360/side
${agents}
  end
end
ring 100 4 91`;
};

// A different beginning without an `if`: is a comparison a number the scaffold can be built from?
const conditional = (side) => `beColour "e8b04b"
bold 1.1
hd

def ring len side steps do
  loop side do
    forward ${side}
    left 360/side
    as 'agent[count]' do
      beColour "e8b04b"
      show 5
      fn tgt mod(count + 1, side)
      label count == 0
      loop 91 do
        faceto "agent[tgt]".x "agent[tgt]".y
        fw len/100
        wait 1/25
      end
    end
  end
end
ring 100 4 91`;

const variants = {
  'canonical': CANONICAL,
  'literal-index-colour-inside': generated('literal', 'inside'),
  'count-name-colour-inside': generated('count', 'inside'),
  'literal-index-colour-top': generated('literal', 'top'),
  // One of four sides shorter, chosen by arithmetic on the loop counter alone.
  'condition-shorter-side': conditional('len - 40 * (count == 0)'),
  'arithmetic-shorter-side': conditional('len - 40 * (1 - mod(count, 4) // 3)'),
};

function measure(name) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
im = Image.open(sys.argv[1]).convert('L')
h = im.size[1]
hist = im.histogram(); bg = hist.index(max(hist))
mask = im.point(lambda v: 255 if abs(v - bg) > 20 else 0)
bb = mask.getbbox()
print(json.dumps({'ink': mask.histogram()[255], 'bbox': bb, 'bg': bg}))
`, `${out}/${name}.png`], { encoding: 'utf8' }));
}

const play = async (program) => JSON.parse(await page.evaluate(`(async () => JSON.stringify(await window.__ft.play(${JSON.stringify(program)})))()`));
const report = {};
try {
  await page.goto(base, 80);
  for (let i = 0; i < 80; i++) {
    const state = await page.evaluate('window.__ft ? (window.__ft.ready ? "ready" : "failed") : "pending"');
    if (state !== 'pending') break;
    await sleep(150);
  }
  await page.evaluate('window.__ft.open({ caps: { maxCommands: 60000, maxRecurseDepth: 40 } })');
  await page.s('Page.startScreencast', { format: 'png', everyNthFrame: 1, maxWidth: 900, maxHeight: 900 });
  for (const [id, program] of Object.entries(variants)) {
    frames.length = 0;
    await sleep(420);
    frames.length = 0;
    const run = await play(`${program}\n\nwait 0.6`);
    await sleep(200);
    const last = frames[frames.length - 1];
    if (last) writeFileSync(`${out}/${id}.png`, last);
    report[id] = { ok: run.ok, error: run.ok ? null : run.error, commands: run.settled?.commandCount ?? null, beats: run.beats, ...(last ? measure(id) : { ink: 0 }) };
  }
  await page.s('Page.stopScreencast').catch(() => {});
} catch (error) {
  report.error = String(error && error.stack ? error.stack : error);
} finally {
  console.log(JSON.stringify(report, null, 2));
  cdp.close();
}
