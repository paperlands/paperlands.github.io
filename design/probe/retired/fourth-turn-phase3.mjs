// Phase 3 — Room inside the name. One direct instrument on the figure's own first
// vertex changes the length argument, and the square answers.
//   PROBE=fourth-turn-phase3.mjs bash design/probe/fourth-turn.sh
//
// The vet this probe answers:
//   * Is the instrument discoverable without a spoken explanation?
//   * Is growth visible, or does auto-framing disguise it?
//   * Do hand, source argument, and drawing feel like one relationship?
//   * Does cancellation restore the previous state?
// It also answers the milestone: the hand changes one condition and the square
// answers — measured, at ~12 ms a run, with no tween anywhere.
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-phase3';
const rec = `${out}/recording`;
rmSync(out, { recursive: true, force: true });
mkdirSync(rec, { recursive: true });
const page_url = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const evidence = [], results = {};
const assert = (ok, label) => { evidence.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) results.failures = [...(results.failures || []), label]; };

const WORLD = 2 * 500 * Math.tan(Math.PI / 6); // 577.35 world units across the stage height

async function shot(page, name, clip) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
// The drawing is gold; the instrument is ember and mineral blue. Measurements of
// the *drawing* hide the instrument layer first, so a growth number is the native
// figure's, never the rail's. The ember marks would otherwise pass a gold test.
function goldBox(file) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
im = Image.open(sys.argv[1]).convert('RGB')
w, h = im.size
px = im.load()
minx, miny, maxx, maxy, count = w, h, -1, -1, 0
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if r > 140 and g > 95 and r > b + 30:
            count += 1
            minx = min(minx, x); maxx = max(maxx, x); miny = min(miny, y); maxy = max(maxy, y)
print(json.dumps({'count': count, 'box': None if count < 20 else [minx, miny, maxx, maxy],
                  'w': (maxx - minx) if count >= 20 else None, 'h': (maxy - miny) if count >= 20 else None,
                  'cx': ((minx + maxx) / 2 - w / 2) if count >= 20 else None,
                  'cy': ((miny + maxy) / 2 - h / 2) if count >= 20 else None,
                  'size': [w, h]}))
`, `${out}/${file}`], { encoding: 'utf8' }));
}
function pixelDiff(a, b) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
import sys, json
A = Image.open(sys.argv[1]).convert('RGB'); B = Image.open(sys.argv[2]).convert('RGB')
if A.size != B.size:
    print(json.dumps({'sizeMismatch': [A.size, B.size]})); raise SystemExit
d = ImageChops.difference(A, B)
print(json.dumps({'bbox': d.getbbox(), 'max': max(max(c) for c in d.getextrema())}))
`, a, b], { encoding: 'utf8' }));
}
const hideInstrument = (page, on) => page.evaluate(on
  ? `(() => { if (!document.querySelector('#probe-hide')) { const s = document.createElement('style'); s.id = 'probe-hide'; s.textContent = '.instrument,.grip,.thread{display:none !important}'; document.head.append(s); } return true; })()`
  : `(() => { document.querySelector('#probe-hide')?.remove(); return true; })()`);
const state = (page) => page.evaluate(`JSON.stringify({
  representation: window.fourthTurn.representation,
  values: window.fourthTurn.values,
  domain: window.fourthTurn.domain,
  active: window.fourthTurn.active,
  instrument: window.fourthTurn.instrument,
  stagePosts: window.fourthTurn.stagePosts,
  handRuns: window.fourthTurn.handRuns,
  rewrites: window.fourthTurn.rewrites,
  lit: window.fourthTurn.lit,
  argument: window.fourthTurn.argument,
  lastExecuted: window.fourthTurn.lastExecuted,
  status: document.querySelector('#status').textContent,
  reading: document.querySelector('#reading').textContent,
  verb: document.querySelector('#verb').textContent,
  execText: document.querySelector('#executed').textContent,
  composedShown: !document.querySelector('#composed-block').hidden,
  rows: [...document.querySelectorAll('.source-row')].map((r) => ({ id: r.dataset.id, code: r.textContent.trim() })),
  gripHidden: document.querySelector('#grip').hidden,
  seedVisible: document.querySelector('.seed').checkVisibility(),
  figure: (() => { const r = document.querySelector('.figure').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
  scrollY: window.scrollY,
  animations: document.getAnimations().length,
})`);
async function waitFor(page, expression, ms = 6000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await page.evaluate(expression)) return true;
    await sleep(50);
  }
  return false;
}
const figClip = (st) => ({ x: st.figure.x, y: st.figure.y, width: st.figure.w, height: st.figure.h });
// The first vertex of the figure, computed from the recipe the page says it is
// drawing. This mirrors the arithmetic in the call line, it does not read the
// runtime: comparing it with the measured gold corner is what makes it evidence.
function predictedVertex(st) {
  const scale = st.figure.h / WORLD;
  const { len, side } = st.values;
  const radius = len / (2 * Math.sin(Math.PI / (st.representation === 'ngon' ? side : 4)));
  const theta = (2 * Math.PI) / (st.representation === 'ngon' ? side : 4);
  const alpha = -theta / 2 - Math.PI / 2;
  return {
    x: st.figure.x + st.figure.w / 2 + radius * Math.cos(alpha) * scale,
    y: st.figure.y + st.figure.h / 2 - radius * Math.sin(alpha) * scale,
    scale,
  };
}
async function measure(page, name) {
  await hideInstrument(page, true);
  const st = JSON.parse(await state(page));
  await shot(page, name, figClip(st));
  const box = goldBox(`${name}.png`);
  await hideInstrument(page, false);
  return { box, st };
}
const key = async (page, k, code, keyCode, modifiers = 0) => {
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  await sleep(120);
};
const KEYS = { ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35, Escape: 27 };


// The instrument's marks and the source's tokens are both functional: one is a
// control, the other is the declaration it writes into. Both are measured against
// the ground they sit on, from the rendered frame for the marks and from computed
// styles for the text (the method Phase 1 established).
function markContrast(file, ground, points) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
im = Image.open(sys.argv[1]).convert('RGB')
points = json.loads(sys.argv[2])
g = im.getpixel(tuple(json.loads(sys.argv[3])))
def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def L(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])
def ratio(a, b):
    la, lb = L(a), L(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
out = {}
for name, (x, y) in points.items():
    best = None
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            p = im.getpixel((x + dx, y + dy))
            r = ratio(p, g)
            if best is None or r > best['ratio']:
                best = {'ratio': round(r, 2), 'pixel': list(p), 'at': [x + dx, y + dy]}
    out[name] = best
out['ground'] = list(g)
print(json.dumps(out))
`, `${out}/${file}`, JSON.stringify(points), JSON.stringify(ground)], { encoding: 'utf8' }));
}
const relLum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const l1 = relLum(a), l2 = relLum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const parseRgb = (value) => value.match(/[\d.]+/g).slice(0, 3).map(Number);
const blend = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
async function settle(page, ms = 4000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const clean = await page.evaluate(`document.getAnimations().length === 0 && document.querySelectorAll('#flying > *').length === 0`);
    if (clean) return true;
    await sleep(60);
  }
  return false;
}

const frames = [];
try {
  const page = await newPage(cdp);
  cdp.on((msg) => {
    if (msg.method === 'Page.screencastFrame' && msg.sessionId === page.sessionId) {
      frames.push({ data: Buffer.from(msg.params.data, 'base64'), ts: msg.params.metadata.timestamp });
      page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
    }
  });
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.goto(page_url, 100);
  assert(await waitFor(page, 'window.fourthTurn?.ready === true'), 'The pinned runtime is ready');
  await waitFor(page, 'window.fourthTurn?.finished === true');
  await waitFor(page, 'window.fourthTurn?.settled === true');

  // --- before the instrument: three re-descriptions of the same square -------
  const closed = await measure(page, 'phase3-closed');
  results.closed = closed.box;
  assert(closed.box.count > 500, `The square is drawn (${closed.box.count} ink px)`);
  const before = JSON.parse(await state(page));
  assert(before.active === null && before.gripHidden === true, 'Before Phase 3 the instrument offers no handle, only the turning the opening introduced');

  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1300);
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1200);
  const defined = await measure(page, 'phase3-defined');
  const dDefined = pixelDiff(`${out}/phase3-closed.png`, `${out}/phase3-defined.png`);
  results.defined = { diff: dDefined, state: JSON.parse(await state(page)) };
  assert(defined.box.count > 500 && dDefined.bbox === null, `Naming the gesture leaves the drawing untouched (${JSON.stringify(dDefined)})`);

  // --- 1. Room inside the name ----------------------------------------------
  const postsBefore = defined.st.stagePosts;
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1100);
  const opened = await measure(page, 'phase3-open');
  const openedFull = JSON.parse(await state(page));
  results.opened = { box: opened.box, state: openedFull };
  assert(openedFull.representation === 'parameterised', 'The definition opens to receive a length');
  assert(opened.box.count > 500 && pixelDiff(`${out}/phase3-defined.png`, `${out}/phase3-open.png`).bbox === null, 'The drawing is still the same square, pixel for pixel');
  assert(openedFull.stagePosts === postsBefore, `No program was sent: the change is a description, not an execution (${postsBefore} posts)`);
  assert(openedFull.rows.some((r) => r.code === 'def square len do') && openedFull.rows.some((r) => r.code === 'forward len') && openedFull.rows.some((r) => r.code === 'square 250'), 'The length is a name in the body and an argument in the call');
  assert(openedFull.argument === '250' && openedFull.values.len === 250, 'The authored length is still the one the study has always drawn');
  assert(openedFull.active === 'len' && openedFull.instrument.hidden === false && openedFull.instrument.rail > 0, 'The instrument appears with the phase: a rail and a grip');
  assert(openedFull.gripHidden === false && openedFull.instrument.grip.width === 44 && openedFull.instrument.grip.height === 44, `The grip has a 44 px target (${openedFull.instrument.grip.width}x${openedFull.instrument.grip.height})`);
  assert(openedFull.reading === 'length 250 · the turn stays 90°', `The readout names the condition and the fixed turn: "${openedFull.reading}"`);

  // The room must not hurry the visitor past the thing that just became theirs:
  // while the instrument is untouched the next transformation is a quiet line, and
  // the instrument's own readout is the loudest thing beside it.
  const emphasisReader = `JSON.stringify((() => {
    const verb = document.querySelector('#verb');
    const style = getComputedStyle(verb);
    return {
      state: document.documentElement.dataset.instrument ?? null,
      fontSize: parseFloat(style.fontSize),
      color: style.color,
      opacity: Number(style.opacity),
      text: verb.textContent,
      advanceResting: document.querySelector('#advance').getAttribute('aria-disabled') === 'true',
      replayVisible: document.querySelector('#replay').checkVisibility(),
      reading: document.querySelector('#reading').textContent,
      readingOpacity: Number(getComputedStyle(document.querySelector('#reading')).opacity),
    };
  })())`;
  const untouched = JSON.parse(await page.evaluate(emphasisReader));
  results.emphasis = { untouched };
  const quietContrast = contrast(blend(parseRgb(untouched.color), [0x12, 0x0d, 0x17], untouched.opacity), [0x12, 0x0d, 0x17]);
  results.emphasis.quietContrast = Math.round(quietContrast * 100) / 100;
  assert(/^play with the length\.$/.test(untouched.text), `The act's own sentence names the play that is available ("${untouched.text}")`);
  assert(quietContrast >= 4.5, `And still legible: ${results.emphasis.quietContrast}:1 against the ground`);
  // The loud/quiet ember invitation is retired: the words are two, and the sentence under
  // the thesis carries them (see fourth-turn-refinement.md).
  assert(untouched.reading.startsWith('length 250') && untouched.readingOpacity >= .8, `The instrument's own readout is the steady voice (${untouched.reading}, opacity ${untouched.readingOpacity})`);

  // The grip is placed from the model; the model is validated against the ink.
  const predicted = predictedVertex(openedFull);
  const corner = { x: openedFull.figure.x + opened.box.box[0], y: openedFull.figure.y + opened.box.box[3] };
  const cornerError = Math.hypot(corner.x - predicted.x, corner.y - predicted.y);
  results.vertex = { predicted, corner, error: Math.round(cornerError * 10) / 10 };
  assert(cornerError < 8, `The modelled first vertex lands on the drawn corner (${results.vertex.error} px)`);
  const gripCentre = { x: openedFull.instrument.grip.x + 22, y: openedFull.instrument.grip.y + 22 };
  const gripError = Math.hypot(gripCentre.x - predicted.x, gripCentre.y - predicted.y);
  results.grip = { centre: gripCentre, error: Math.round(gripError * 10) / 10 };
  assert(gripError < 2, `The grip is held on that vertex (${results.grip.error} px)`);

  // The instrument is visible ink on a real frame, not only a DOM node.
  await shot(page, 'phase3-room');
  const roomBox = goldBox('phase3-room.png');
  results.room = roomBox;
  await hideInstrument(page, true);
  await shot(page, 'phase3-room-hidden');
  await hideInstrument(page, false);
  const instrumentInk = JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
import sys, json
A = Image.open(sys.argv[1]).convert('RGB'); B = Image.open(sys.argv[2]).convert('RGB')
d = ImageChops.difference(A, B).convert('L')
m = d.point(lambda v: 255 if v > 10 else 0)
print(json.dumps({'bbox': m.getbbox(), 'n': m.histogram()[255]}))
`, `${out}/phase3-room.png`, `${out}/phase3-room-hidden.png`], { encoding: 'utf8' }));
  results.instrumentInk = instrumentInk;
  assert(instrumentInk.n > 200, `The instrument is drawn on the page (${instrumentInk.n} px of rail, spoke, grip and thread)`);

  // --- 1b. Contrast, measured, not assumed -----------------------------------
  // Every token class in the state it is actually in (a future row, a past row, a
  // lit row), blended with the ground the page really uses.
  const groundRgb = [0x12, 0x0d, 0x17];
  const tokens = JSON.parse(await page.evaluate(`JSON.stringify((() => {
    const ground = getComputedStyle(document.body).backgroundColor;
    const rows = [...document.querySelectorAll('.source-row')];
    const seen = [];
    for (const row of rows) {
      const rowOpacity = Number(getComputedStyle(row).opacity);
      const cls = row.classList.contains('is-lit') ? 'lit' : row.classList.contains('is-past') ? 'past' : 'future';
      // Only the spans that paint text: the wrapper's own colour is never seen,
      // and counting it would flatter or damn the wrong thing.
      for (const token of [...row.querySelectorAll('span')].filter((el) => !el.querySelector('span'))) {
        seen.push({ row: row.dataset.id, state: cls, rowOpacity, tokenClass: token.className, color: getComputedStyle(token).color, text: token.textContent });
      }
    }
    return { ground, seen };
  })())`));
  const measured = {};
  let worst = { ratio: 99 };
  for (const token of tokens.seen) {
    const ratio = contrast(blend(parseRgb(token.color), groundRgb, token.rowOpacity), groundRgb);
    const key = `${token.tokenClass}@${token.state}`;
    if (!measured[key] || ratio < measured[key]) measured[key] = Math.round(ratio * 100) / 100;
    if (ratio < worst.ratio) worst = { ratio: Math.round(ratio * 100) / 100, key, text: token.text };
  }
  results.tokenContrast = measured;
  results.worstToken = worst;
  assert(worst.ratio >= 4.5, `Every source token in every row state meets AA against the ground (worst ${worst.ratio}:1, ${worst.key} "${worst.text}")`);
  const changed = ['def', 'loop', 'end', 'cmd', 'num', 'param', 'arg'];
  results.changedTokenClasses = changed;

  // The instrument's marks are controls, not decoration: the rail, the notches,
  // the ring and the arc are measured from the rendered frame at the source of
  // each mark, so antialiasing is included rather than argued away.
  const st = openedFull;
  const instrumentPoints = {
    ring: [Math.round(st.instrument.grip.x + 22 - 9), Math.round(st.instrument.grip.y + 22)],
    notch: [Math.round(st.figure.x + Number(st.instrument.railPoints[1][0])), Math.round(st.figure.y + Number(st.instrument.railPoints[1][1]))],
    spoke: [Math.round(st.figure.x + Number(st.instrument.spoke[2]) / 2 + Number(st.instrument.spoke[0]) / 2), Math.round(st.figure.y + Number(st.instrument.spoke[3]) / 2 + Number(st.instrument.spoke[1]) / 2)],
  };
  const groundPoint = [Math.round(st.figure.x - 40), Math.round(st.figure.y + 40)];
  const marks = markContrast('phase3-room.png', groundPoint, instrumentPoints);
  results.markContrast = marks;
  assert((marks.ring?.ratio ?? 0) >= 3 && (marks.notch?.ratio ?? 0) >= 3 && (marks.spoke?.ratio ?? 0) >= 3,
    `The ring, a notch and the spoke each clear 3:1 as rendered (${marks.ring?.ratio}, ${marks.notch?.ratio}, ${marks.spoke?.ratio})`);

  // --- 2. The hand changes one condition ------------------------------------
  const grip = openedFull.instrument.grip;
  const gripPoint = { x: Math.round(grip.x + grip.width / 2), y: Math.round(grip.y + grip.height / 2) };
  // The rail runs from the vertex of length 250 toward the centre: the hand
  // travels the same line the first vertex travels.
  const railFar = predictedVertex({ ...openedFull, values: { len: 150, side: 4 } });
  const stepCount = 18;
  await page.s('Page.startScreencast', { format: 'jpeg', quality: 72, everyNthFrame: 1, maxWidth: 900, maxHeight: 560 });
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: gripPoint.x, y: gripPoint.y, button: 'left', buttons: 1, clickCount: 1 });
  const samples = [];
  for (let i = 1; i <= stepCount; i += 1) {
    const t = i / stepCount;
    const x = Math.round(gripPoint.x + (railFar.x - gripPoint.x) * t);
    const y = Math.round(gripPoint.y + (railFar.y - gripPoint.y) * t);
    await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
    await sleep(55);
    if (i % 6 === 0) samples.push(JSON.parse(await state(page)));
  }
  results.midDrag = samples;
  const midState = samples[samples.length - 1];
  assert(samples.every((s) => s.active === 'len' && s.handRuns > 0), 'The hand\'s moves are executed as real native runs');
  assert(midState.values.len < 250 && midState.values.len >= 150, `The length followed the hand (${midState.values.len} at the last sample)`);
  assert(samples.some((s) => s.values.len !== 250 && s.values.len !== midState.values.len), 'The length moved through intermediate values, not one jump');
  const argued = samples.every((s) => s.argument === String(s.values.len));
  assert(argued, `The argument in the call carries the value the hand set (${samples.map((s) => s.argument).join(', ')})`);
  const gripHeld = samples.every((s) => {
    const p = predictedVertex({ ...s });
    const centre = { x: s.instrument.grip.x + 22, y: s.instrument.grip.y + 22 };
    return Math.hypot(centre.x - p.x, centre.y - p.y) < 2;
  });
  assert(gripHeld, 'The grip stayed on the figure\'s own first vertex through the drag');
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: gripPoint.x, y: gripPoint.y, button: 'left', buttons: 0 });
  await page.s('Page.stopScreencast');
  await sleep(500);
  const afterDrag = JSON.parse(await state(page));
  results.afterDrag = afterDrag;
  assert(afterDrag.handRuns > midState.handRuns - 2, `The hand ran ${afterDrag.handRuns} native runs for the gesture`);

  // Once the visitor has handled it, the instrument is inhabited and the onward
  // invitation may speak again.
  const inhabited = JSON.parse(await page.evaluate(emphasisReader));
  results.emphasis.inhabited = inhabited;
  assert(inhabited.state === 'inhabited' && /^play with the length\.$/.test(inhabited.text), `And the act's sentence still names the play after the first manipulation ("${inhabited.text}")`);

  // --- growth is visible, and the camera did not follow ---------------------
  const sizes = {};
  for (const len of [150, 200, 250]) {
    await page.evaluate(`window.fourthTurn.setValue('len', ${len})`);
    await waitFor(page, `window.fourthTurn.values.len === ${len}`, 2000);
    await sleep(450);
    const m = await measure(page, `phase3-len-${len}`);
    sizes[len] = { ink: m.box.count, w: m.box.w, h: m.box.h, cx: m.box.cx, cy: m.box.cy, figure: m.st.figure };
    await hideInstrument(page, true);
    await shot(page, `phase3-small-default-large-${len}`, figClip(m.st));
    await hideInstrument(page, false);
    await shot(page, `phase3-len-page-${len}`);
  }
  results.sizes = sizes;
  const scale = sizes[250].figure.h / WORLD;
  for (const len of [150, 200, 250]) {
    const expected = len * scale;
    const drawn = sizes[len].w;
    assert(Math.abs(drawn - expected) <= 6, `At length ${len} the square is drawn ${drawn} px wide, its own length (${Math.round(expected)} px expected)`);
    assert(Math.abs(sizes[len].cx) <= 3 && Math.abs(sizes[len].cy) <= 3, `At length ${len} the figure stays about the same centre (offset ${sizes[len].cx},${sizes[len].cy} px)`);
  }
  assert(sizes[250].w - sizes[150].w > 60, `Growth is visible: ${sizes[250].w - sizes[150].w} px between the small and the large square`);
  assert(sizes[250].figure.w === openedFull.figure.w && sizes[250].figure.h === openedFull.figure.h, 'The stage never changes size: no fit, no re-framing');

  // --- 3. keyboard, and the argument as the instrument's voice --------------
  await page.evaluate('document.querySelector("#grip").focus()');
  await page.evaluate('window.fourthTurn.setValue("len", 200)');
  await sleep(300);
  await key(page, 'ArrowLeft', 'ArrowLeft', KEYS.ArrowLeft);
  const afterLeft = JSON.parse(await state(page));
  assert(afterLeft.values.len === 195, `Arrow moves one step of the domain (${afterLeft.values.len})`);
  await key(page, 'ArrowLeft', 'ArrowLeft', KEYS.ArrowLeft, 8);
  const afterShift = JSON.parse(await state(page));
  assert(afterShift.values.len === 170, `Shift takes a larger step (${afterShift.values.len})`);
  await key(page, 'Home', 'Home', KEYS.Home);
  const afterHome = JSON.parse(await state(page));
  assert(afterHome.values.len === afterHome.domain.len.min, `Home goes to the domain's end (${afterHome.values.len})`);
  await key(page, 'End', 'End', KEYS.End);
  const afterEnd = JSON.parse(await state(page));
  assert(afterEnd.values.len === afterEnd.domain.len.max, `End goes to the domain's other end (${afterEnd.values.len})`);
  const aria = JSON.parse(await page.evaluate(`JSON.stringify((() => { const g = document.querySelector('#grip'); return { role: g.getAttribute('role'), label: g.getAttribute('aria-label'), now: g.getAttribute('aria-valuenow'), text: g.getAttribute('aria-valuetext'), min: g.getAttribute('aria-valuemin'), max: g.getAttribute('aria-valuemax') }; })())`));
  results.aria = aria;
  assert(aria.role === 'slider' && aria.label === 'Side length' && aria.min === '150' && aria.max === '250', `Keyboard users get the parameter and its domain (${JSON.stringify(aria)})`);

  // --- 3b. What the arrows mean ----------------------------------------------
  // Increasing the length moves the figure's first vertex down and to the left, so
  // Down is the spatial arrow and Right is the numeric pair. Both are measured so
  // the claim in the documentation is a fact rather than a turn of phrase.
  await page.evaluate('window.fourthTurn.setValue("len", 200)');
  await settle(page);
  const beforeArrows = JSON.parse(await state(page));
  const gripBefore = { x: beforeArrows.instrument.grip.x, y: beforeArrows.instrument.grip.y };
  await key(page, 'ArrowDown', 'ArrowDown', KEYS.ArrowDown);
  const afterDown = JSON.parse(await state(page));
  await key(page, 'ArrowRight', 'ArrowRight', KEYS.ArrowRight);
  const afterRight = JSON.parse(await state(page));
  results.arrows = {
    down: { len: afterDown.values.len, dGripY: Math.round((afterDown.instrument.grip.y - gripBefore.y) * 10) / 10 },
    right: { len: afterRight.values.len, dGripX: Math.round((afterRight.instrument.grip.x - afterDown.instrument.grip.x) * 10) / 10 },
  };
  assert(afterDown.values.len === 205 && afterRight.values.len === 210, `Down and Right both increase the value (${afterDown.values.len}, ${afterRight.values.len})`);
  assert(results.arrows.down.dGripY > 2, `Down is the spatial arrow: the grip travels down its own rail (${results.arrows.down.dGripY} px)`);
  assert(results.arrows.right.dGripX < -2, `Right is the numeric pair only: the grip travels back up the rail (${results.arrows.right.dGripX} px)`);

  // --- 3c. The keyboard belongs to the grip ---------------------------------
  // A press on the grip, then an arrow: the arrow must reach the thing that was
  // pressed, not the button that happened to have focus.
  const gripBox = JSON.parse(await page.evaluate(`JSON.stringify((() => { const r = document.querySelector('#grip').getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })())`));
  await page.evaluate('window.fourthTurn.setValue("len", 200)');
  await settle(page);
  const beforePress = JSON.parse(await page.evaluate('JSON.stringify({ values: window.fourthTurn.values, active: document.activeElement?.id ?? null })'));
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: gripBox.x, y: gripBox.y, button: 'left', buttons: 1, clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: gripBox.x, y: gripBox.y, button: 'left', buttons: 0 });
  await sleep(150);
  const afterPress = JSON.parse(await page.evaluate('JSON.stringify({ active: document.activeElement?.id ?? null })'));
  await key(page, 'ArrowDown', 'ArrowDown', KEYS.ArrowDown);
  const afterPressArrow = JSON.parse(await page.evaluate('JSON.stringify({ values: window.fourthTurn.values, active: document.activeElement?.id ?? null })'));
  results.focusHandoff = { before: beforePress, afterPress, afterArrow: afterPressArrow };
  assert(afterPress.active === 'grip', `Pressing the grip hands it the keyboard (focus is on ${afterPress.active})`);
  assert(afterPressArrow.values.len === beforePress.values.len + 5, `And the next arrow belongs to it (${beforePress.values.len} → ${afterPressArrow.values.len})`);

  // The argument is not a second control, but an attempt on it is answered by
  // handing over the grip rather than by doing nothing.
  const tokenBox = JSON.parse(await page.evaluate(`JSON.stringify((() => { const t = document.querySelector('.tok-argument.is-active'); const r = t.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; })())`));
  const beforeScrub = JSON.parse(await page.evaluate('JSON.stringify(window.fourthTurn.values)'));
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: tokenBox.x, y: tokenBox.y, button: 'left', buttons: 1, clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tokenBox.x + 44, y: tokenBox.y, button: 'left', buttons: 1 });
  await sleep(140);
  const scrub = JSON.parse(await page.evaluate(`JSON.stringify({ values: window.fourthTurn.values, active: document.activeElement?.id ?? null, held: document.documentElement.dataset.argument ?? null, status: document.querySelector('#status').textContent })`));
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tokenBox.x + 44, y: tokenBox.y, button: 'left', buttons: 0 });
  results.argumentAttempt = scrub;
  assert(scrub.values.len === beforeScrub.len, `Scrubbing the argument changes nothing — it is not a second control (length stays ${scrub.values.len})`);
  assert(scrub.active === 'grip' && scrub.held === 'held', `But the attempt is answered: the grip takes it (focus ${scrub.active}, the instrument answers)`);
  assert(/held by the grip/.test(scrub.status), `And the page says so: "${scrub.status}"`);

  // --- 4. cancellation restores the previous state -------------------------
  const beforeEscape = JSON.parse(await state(page));
  const here = { x: Math.round(beforeEscape.instrument.grip.x + 22), y: Math.round(beforeEscape.instrument.grip.y + 22) };
  const shortTarget = predictedVertex({ ...beforeEscape, values: { ...beforeEscape.values, len: 160 } });
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: here.x, y: here.y, button: 'left', buttons: 1, clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(shortTarget.x), y: Math.round(shortTarget.y), button: 'left', buttons: 1 });
  await sleep(200);
  const duringEscape = JSON.parse(await state(page));
  await key(page, 'Escape', 'Escape', KEYS.Escape);
  await sleep(350);
  const afterEscape = JSON.parse(await state(page));
  results.cancel = { before: beforeEscape.values, during: duringEscape.values, after: afterEscape.values, runs: afterEscape.handRuns - beforeEscape.handRuns };
  assert(duringEscape.values.len !== beforeEscape.values.len, `The gesture moved the length (${duringEscape.values.len})`);
  assert(afterEscape.values.len === beforeEscape.values.len, `Escape restores the length before the gesture (${afterEscape.values.len})`);
  assert(afterEscape.argument === String(beforeEscape.values.len), 'The argument is restored with it');
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(shortTarget.x), y: Math.round(shortTarget.y), button: 'left', buttons: 0 });

  // A lost capture is a cancellation too.
  const hereAgain = { x: Math.round(afterEscape.instrument.grip.x + 22), y: Math.round(afterEscape.instrument.grip.y + 22) };
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: hereAgain.x, y: hereAgain.y, button: 'left', buttons: 1, clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hereAgain.x, y: hereAgain.y + 24, button: 'left', buttons: 1 });
  await sleep(200);
  const duringLost = JSON.parse(await state(page));
  await page.evaluate(`document.querySelector('#grip').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1, bubbles: true }))`);
  await sleep(350);
  const afterLost = JSON.parse(await state(page));
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: railFar.x, y: railFar.y, button: 'left', buttons: 0 });
  results.lost = { during: duringLost.values, after: afterLost.values };
  assert(afterLost.values.len === afterEscape.values.len || afterLost.values.len === beforeEscape.values.len, `A lost pointer capture restores the pre-gesture length (${afterLost.values.len})`);

  // Off-control input is left alone: the page still scrolls.
  const scrollBefore = await page.evaluate('window.scrollY');
  const figureCentre = await page.evaluate(`JSON.stringify((() => { const r = document.querySelector('.figure').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })())`);
  const centre = JSON.parse(figureCentre);
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(centre.x + 150), y: Math.round(centre.y - 100), button: 'left', buttons: 1, clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(centre.x + 120), y: Math.round(centre.y - 160), button: 'left', buttons: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(centre.x + 120), y: Math.round(centre.y - 160), button: 'left', buttons: 0 });
  await sleep(200);
  const offControl = JSON.parse(await state(page));
  assert(offControl.values.len === afterLost.values.len || offControl.values.len === afterEscape.values.len, 'Away from the grip, a drag on the figure changes nothing');
  assert(await page.evaluate('window.scrollY') === scrollBefore, 'Off-control input does not disturb the page');

  // --- 5. the inspector tells the truth about what ran ----------------------
  const finalState = JSON.parse(await state(page));
  results.final = finalState;
  assert(finalState.lastExecuted.hand === true, 'The inspector reports the hand\'s own run as the last execution');
  assert(finalState.execText.includes('def square len do') && finalState.execText.includes(`square ${finalState.values.len}`), 'The executed source is the parameterised recipe at the value the hand set');
  assert(!finalState.execText.includes('wait '), 'The hand\'s run really is the wait-free body');

  // A replay executes the composed recipe, rests and all.
  await page.evaluate('document.querySelector("#replay").click()');
  assert(await waitFor(page, 'window.fourthTurn.finished === true', 8000), 'A replay settles');
  await sleep(200);
  const replayed = JSON.parse(await state(page));
  results.replayed = replayed;
  assert(replayed.lastExecuted.hand === false && replayed.execText.includes('wait '), 'A replay walks the rested recipe and lights the lines that ran');
  const replayedBox = await measure(page, 'phase3-replayed');
  assert(Math.abs(replayedBox.box.w - sizes[250].figure.h / WORLD * replayed.values.len) <= 6, 'The replayed square is the current length');

  // --- 5b. Advancing faster than the transformations -------------------------
  // Four presses in under half a second. The presses are the visitor's own, so the
  // intent is kept — but a transformation must land before the next one overlays it.
  // The measure is against this page's own baseline: one transformation, sampled the
  // same way, so "no pile-up" is a comparison and not a guessed number.
  const sampler = async () => {
    const m = JSON.parse(await page.evaluate(`JSON.stringify({ animations: document.getAnimations().length, flying: document.querySelectorAll('#flying > *').length })`));
    return m;
  };
  const watch = async (peak, ms) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      const m = await sampler();
      peak.animations = Math.max(peak.animations, m.animations);
      peak.flying = Math.max(peak.flying, m.flying);
      await sleep(35);
    }
  };
  await page.evaluate('window.fourthTurn.stepBack(); window.fourthTurn.stepBack();');
  await settle(page);
  const atLoop = JSON.parse(await state(page));
  const single = { animations: 0, flying: 0 };
  await page.evaluate('document.querySelector("#advance").click()');
  await watch(single, 900);
  await settle(page);
  await sleep(400);
  await page.evaluate('window.fourthTurn.stepBack()');
  await settle(page);
  await sleep(500);
  const beforeBurst = JSON.parse(await state(page));
  const peak = { animations: 0, flying: 0 };
  const burstStart = Date.now();
  for (let i = 0; i < 4; i += 1) {
    await page.evaluate('document.querySelector("#advance").click()');
    await watch(peak, 105);
  }
  const afterBurst = JSON.parse(await page.evaluate('JSON.stringify({ representation: window.fourthTurn.representation })'));
  await shot(page, 'phase3-rapid-transition');
  const burstSettled = await settle(page);
  await sleep(900);
  const rapid = JSON.parse(await page.evaluate(`JSON.stringify({
    representation: window.fourthTurn.representation,
    rows: document.querySelectorAll('.source-row').length,
    flying: document.querySelectorAll('#flying > *').length,
    clones: document.querySelectorAll('.flying-token').length,
    animations: document.getAnimations().length,
    active: window.fourthTurn.active,
    advanceResting: document.querySelector('#advance').getAttribute('aria-disabled') === 'true',
    replayVisible: document.querySelector('#replay').checkVisibility(),
  })`));
  await shot(page, 'phase3-rapid-settled');
  const chainIndex = { explicit: 0, loop: 1, defined: 2, parameterised: 3, ngon: 4 };
  results.rapid = { from: beforeBurst.representation, afterBurst: afterBurst.representation, single, peak, settled: rapid, ms: Date.now() - burstStart };
  assert(atLoop.representation === 'loop' && beforeBurst.representation === 'loop', `The baseline and the burst both start from the same place (${beforeBurst.representation})`);
  assert(afterBurst.representation !== beforeBurst.representation, `Four quick presses are not dropped (${beforeBurst.representation} → ${afterBurst.representation})`);
  assert(chainIndex[afterBurst.representation] - chainIndex[beforeBurst.representation] <= 2, `Nor do they stack: at most two transformations began in ${results.rapid.ms} ms`);
  assert(peak.animations <= single.animations + 2 && peak.flying <= 1,
    `Four quick presses carry no more than one transformation carries: peak ${peak.animations} animations against a single transformation's ${single.animations}, and ${peak.flying} token in flight`);
  assert(burstSettled && rapid.flying === 0 && rapid.clones === 0 && rapid.animations === 0, `Nothing is left running behind the definition (${rapid.flying} in the flying layer, ${rapid.animations} animations)`);

  // Spaced presses still walk the whole chain, and the last stop of it retires the
  // onward invitation: the small replay control is what serves the execution now.
  for (let i = 0; i < 4; i += 1) {
    await page.evaluate('document.querySelector("#advance").click()');
    await sleep(1000);
  }
  await settle(page);
  const retired = JSON.parse(await page.evaluate(`JSON.stringify({ advanceResting: document.querySelector('#advance').getAttribute('aria-disabled') === 'true', replayVisible: document.querySelector('#replay').checkVisibility(), advanceNotVisible: !document.querySelector('#advance').checkVisibility(), active: window.fourthTurn.active, representation: window.fourthTurn.representation, rows: [...document.querySelectorAll('.source-row')].map((r) => r.textContent.trim()) })`));
  await shot(page, 'phase3-ngon-stop');
  results.retired = retired;
  assert(retired.representation === 'ngon' && retired.rows.length === 7, `Spaced presses arrive at the polygon (${retired.rows.length} rows)`);
  assert(retired.advanceResting === true && retired.replayVisible === true, 'At the last stop the onward arrow rests and the replay is what remains');

  // Stepping back shows the description it returns to, not the one it left.
  await page.evaluate('document.querySelector("#reverse").click()');
  await settle(page);
  const back = JSON.parse(await page.evaluate(`JSON.stringify({ representation: window.fourthTurn.representation, rows: [...document.querySelectorAll('.source-row')].map((r) => r.textContent.trim()) })`));
  results.stepBackRows = back;
  assert(back.representation === 'parameterised' && back.rows.includes('def square len do') && back.rows.includes('forward len'), `Stepping back re-renders the description it returns to (${back.rows.join(' / ')})`);

  // --- 6. reduced motion keeps the instrument usable ------------------------
  const reduced = await newPage(cdp);
  await reduced.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await reduced.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await reduced.goto(page_url, 800);
  await reduced.evaluate('document.querySelector("#enable").click()');
  await waitFor(reduced, 'window.fourthTurn?.finished === true');
  await waitFor(reduced, 'window.fourthTurn?.settled === true');
  await reduced.evaluate('window.fourthTurn.gather(); window.fourthTurn.name(); window.fourthTurn.openRoom();');
  await sleep(250);
  await reduced.evaluate('window.fourthTurn.setValue("len", 175)');
  await sleep(400);
  const reducedState = JSON.parse(await state(reduced));
  results.reduced = reducedState;
  assert(reducedState.representation === 'parameterised' && reducedState.values.len === 175, 'Under reduced motion the hand still changes the condition');
  assert(reducedState.animations === 0, `Under reduced motion no rewrite animation runs (${reducedState.animations})`);
  await shot(reduced, 'phase3-reduced');

  // --- 7. the phone ---------------------------------------------------------
  const phone = await newPage(cdp);
  await phone.s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await phone.s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await phone.goto(page_url, 100);
  await waitFor(phone, 'window.fourthTurn?.finished === true');
  await waitFor(phone, 'window.fourthTurn?.settled === true');
  // The rewrites are walked one at a time, so a capture cannot mix a departing row
  // with a new definition.
  for (let i = 0; i < 3; i += 1) {
    await phone.evaluate('document.querySelector("#advance").click()');
    await sleep(i === 1 ? 200 : 1100);
    if (i === 1) await shot(phone, 'phase3-phone-transition');
  }
  const phoneSettled = await settle(phone);
  const phoneState = JSON.parse(await state(phone));
  const phonePredicted = predictedVertex(phoneState);
  const phoneGrip = { x: phoneState.instrument.grip.x + 22, y: phoneState.instrument.grip.y + 22 };
  const phoneError = Math.hypot(phoneGrip.x - phonePredicted.x, phoneGrip.y - phonePredicted.y);
  results.phone = { error: Math.round(phoneError * 10) / 10, figure: phoneState.figure, settled: phoneSettled };
  assert(phoneError < 2, `On a phone the grip is still on the vertex (${results.phone.error} px)`);
  assert(phoneSettled && phoneState.animations === 0, `The phone capture is a settled state, not a transition (${phoneState.animations} animations, no flying rows)`);
  const overflow = await phone.evaluate('JSON.stringify({ docW: document.documentElement.scrollWidth, winW: window.innerWidth })');
  results.phoneOverflow = JSON.parse(overflow);
  assert(results.phoneOverflow.docW <= results.phoneOverflow.winW + 1, `No horizontal overflow on a phone (${overflow})`);
  // The thread is routed down the notation's own left corridor: it must cross no
  // piece of the declaration it belongs to.
  const crossing = JSON.parse(await phone.evaluate(`JSON.stringify((() => {
    const line = document.querySelector('#thread-line');
    const pts = (line.getAttribute('points') || '').trim().split(' ').filter(Boolean).map((p) => p.split(',').map(Number)).filter((p) => p.length === 2);
    const svg = document.querySelector('#thread').getBoundingClientRect();
    const segs = [];
    for (let i = 0; i < pts.length - 1; i += 1) segs.push([{ x: svg.left + pts[i][0], y: svg.top + pts[i][1] }, { x: svg.left + pts[i + 1][0], y: svg.top + pts[i + 1][1] }]);
    const rects = [...document.querySelectorAll('#source .code')].map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    let hits = 0, pieces = 0;
    const inside = (p, r) => p.x > r.x + 1 && p.x < r.x + r.w - 1 && p.y > r.y + 1 && p.y < r.y + r.h - 1;
    for (const [a, b] of segs) {
      for (const r of rects) {
        pieces += 1;
        let crossed = false;
        for (let t = 0; t <= 1; t += 0.02) if (inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, r)) crossed = true;
        if (crossed) hits += 1;
      }
    }
    return { segments: segs.length, points: pts.length, pieces, hits,
             rows: document.querySelectorAll('#source .source-row').length,
             codes: document.querySelectorAll('#source .code').length,
             firstRect: rects[0] ?? null, box: [svg.left, svg.top, svg.width, svg.height] };
  })())`));
  results.phoneThread = crossing;
  assert(crossing.points === 4 && crossing.hits === 0, `On a phone the thread crosses no declaration (${crossing.hits} of ${crossing.pieces} line-in-box tests, routed through ${crossing.points} points)`);
  await shot(phone, 'phase3-phone');

  // Touch: hover cannot explain the instrument on a phone, so the gesture is
  // tested as touch, and off-control touch is left to the page.
  const phoneValues = JSON.parse(await phone.evaluate('JSON.stringify(window.fourthTurn.values)'));
  const tightGrip = { x: Math.round(phoneState.instrument.grip.x + 22), y: Math.round(phoneState.instrument.grip.y + 22) };
  const phoneTarget = predictedVertex({ ...phoneState, values: { ...phoneValues, len: 180 } });
  await phone.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tightGrip.x, y: tightGrip.y, id: 1 }] });
  await phone.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(phoneTarget.x), y: Math.round(phoneTarget.y), id: 1 }] });
  await sleep(180);
  const touched = JSON.parse(await state(phone));
  await phone.s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(350);
  results.touch = { from: phoneValues.len, during: touched.values.len };
  assert(touched.values.len !== phoneValues.len && touched.values.len <= 200, `A finger on the grip changes the length (${phoneValues.len} → ${touched.values.len})`);
  const beforeOff = JSON.parse(await phone.evaluate('JSON.stringify(window.fourthTurn.values)'));
  const figCentre = JSON.parse(await phone.evaluate(`JSON.stringify((() => { const r = document.querySelector('.figure').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })())`));
  await phone.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(figCentre.x), y: Math.round(figCentre.y), id: 2 }] });
  await phone.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(figCentre.x + 30), y: Math.round(figCentre.y + 60), id: 2 }] });
  await phone.s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(250);
  const afterOff = JSON.parse(await phone.evaluate('JSON.stringify(window.fourthTurn.values)'));
  assert(afterOff.len === beforeOff.len, 'Away from the grip a touch drag changes nothing and the page keeps its scroll');

  const errors = [...page.console, ...reduced.console, ...phone.console].filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  assert(errors.length === 0, `No console errors in the phase (${errors.length})`);

  // --- recording ------------------------------------------------------------
  const durations = [];
  for (let i = 0; i < frames.length; i += 1) {
    const next = frames[i + 1]?.ts ?? frames[i].ts + 0.08;
    durations.push(Math.max(30, Math.min(400, Math.round((next - frames[i].ts) * 1000))));
  }
  frames.forEach((f, i) => writeFileSync(`${rec}/${String(i).padStart(4, '0')}.jpg`, f.data));
  results.recording = { captured: frames.length, spanMs: frames.length ? Math.round((frames[frames.length - 1].ts - frames[0].ts) * 1000) : 0 };
  let blank = 0, drawn = 0;
  // The screencast frames are the whole page scaled to 900x560, so the crop is
  // carried into frame coordinates before the drawing is looked for.
  const scaledFigure = {
    x: Math.round(openedFull.figure.x * (900 / 1280)),
    y: Math.round(openedFull.figure.y * (560 / 800)),
    width: Math.round(openedFull.figure.w * (900 / 1280)),
    height: Math.round(openedFull.figure.h * (560 / 800)),
  };
  try {
    const report = JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image, ImageChops
import glob, sys, json
files = sorted(glob.glob(sys.argv[1] + '/*.jpg'))
crop = json.loads(sys.argv[4])
durations = json.loads(sys.argv[2])
ims, ds, blank, drawn = [], [], 0, 0
for f, d in zip(files, durations):
    im = Image.open(f).convert('RGB')
    if sum(im.resize((1, 1)).getpixel((0, 0))) / 3 > 200:
        continue
    fig = im.crop((crop['x'], crop['y'], crop['x'] + crop['width'], crop['y'] + crop['height']))
    g = fig.convert('L')
    lit = g.point(lambda v: 255 if v > 70 else 0).histogram()[255]
    if lit < 25:
        blank += 1
    else:
        drawn += 1
    ims.append(im.resize((900, 560))); ds.append(d)
if ims:
    ims[0].save(sys.argv[3], save_all=True, append_images=ims[1:], duration=ds, loop=0, format='WEBP', quality=74, minimize_size=True)
print(json.dumps({'frames': len(ims), 'drawn': drawn, 'blankDuringDrag': blank}))
`, rec, JSON.stringify(durations), `${out}/phase3-recording.webp`, JSON.stringify(scaledFigure)], { encoding: 'utf8' }));
    results.recording = { ...results.recording, ...report };
    blank = report.blankDuringDrag; drawn = report.drawn;
  } catch (error) {
    evidence.push('recording assembly failed: ' + error.message);
  }
  assert(drawn > 10, `The recording holds ${drawn} frames of the answering figure`);
  assert(blank <= 1, `No blank frame was ever presented during the drag (${blank} of ${frames.length})`);

  results.evidence = evidence;
  results.errors = errors;
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ evidence, failures: results.failures || [], vertex: results.vertex, grip: results.grip, sizes: Object.fromEntries(Object.entries(results.sizes).map(([k, v]) => [k, { w: v.w, cx: v.cx, cy: v.cy }])), cancel: results.cancel, recording: results.recording, runs: results.final.handRuns, errors, out }, null, 2));
} finally { cdp.close(); }
