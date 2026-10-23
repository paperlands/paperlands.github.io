// Phase 1 — the first square. Milestone frames, a timestamp-true recording, and
// the vet measurements (including rendered seed visibility and measured token
// contrast, not existence).
//   PROBE=fourth-turn-phase1.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-phase1';
const rec = `${out}/recording`;
rmSync(out, { recursive: true, force: true });
mkdirSync(rec, { recursive: true });
const page_url = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const evidence = [], results = {};
const assert = (ok, label) => { evidence.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) results.failures = [...(results.failures || []), label]; };

const relLum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const l1 = relLum(a), l2 = relLum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const parseRgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const blend = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

async function shot(page, name, clip) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
  return data;
}
function goldBox(file) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys
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
print(__import__('json').dumps({'count': count, 'box': None if count < 20 else [minx, miny, maxx, maxy], 'width': maxx - minx, 'height': maxy - miny}))
`, `${out}/${file}`], { encoding: 'utf8' }));
}
const seedVisible = `(() => { const s = document.querySelector('.seed'); const st = getComputedStyle(s); const r = s.getBoundingClientRect(); return { visible: s.checkVisibility(), opacity: Number(st.opacity), area: Math.round(r.width * r.height) }; })()`;

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
  await page.s('Page.startScreencast', { format: 'jpeg', quality: 74, everyNthFrame: 2, maxWidth: 800, maxHeight: 500 });
  await page.goto(page_url, 100);
  const earlySeed = await page.evaluate(seedVisible);
  // The default (future) row opacity, read before any beat has run.
  let earlyOpacity = -1;
  for (let i = 0; i < 60; i++) {
    earlyOpacity = await page.evaluate(`(() => { const r = document.querySelector('.source-row'); return r ? Number(getComputedStyle(r).opacity) : -1; })()`);
    if (earlyOpacity >= 0) break;
    await sleep(50);
  }
  for (let i = 0; i < 120; i++) { const r = await page.evaluate('window.fourthTurn?.ready === true'); if (r) break; await sleep(100); }
  results.seedWhileLoading = earlySeed;
  assert(earlySeed.visible === true && earlySeed.opacity > 0 && earlySeed.area > 0, 'The still is rendered while the runtime is loading');
  await page.evaluate(`new Promise(resolve => { const check = () => (window.fourthTurn.beatCount >= 5 || window.fourthTurn.finished) ? resolve(1) : setTimeout(check, 20); check(); })`);
  results.unfinished = JSON.parse(await page.evaluate('JSON.stringify({ beatCount: window.fourthTurn.beatCount, lit: window.fourthTurn.lit, currentLit: [...document.querySelectorAll(".source-row.is-lit")].map((r) => r.textContent.trim()) })'));
  const figure = await page.evaluate(`(() => { const r = document.querySelector('.figure').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
  await shot(page, 'phase1-unfinished', figure);
  await shot(page, 'phase1-unfinished-page');
  await page.evaluate(`new Promise(resolve => { const check = () => window.fourthTurn.finished ? resolve(1) : setTimeout(check, 20); check(); })`);
  await sleep(400);
  results.completed = JSON.parse(await page.evaluate('JSON.stringify({ beatCount: window.fourthTurn.beatCount, finished: window.fourthTurn.finished, state: document.documentElement.dataset.state })'));
  await shot(page, 'phase1-complete', figure);
  await shot(page, 'phase1-page');
  await page.s('Page.stopScreencast');

  const vet = JSON.parse(await page.evaluate(`JSON.stringify({
    noAir: document.querySelector('.garden-air') === null && !document.querySelector('[class*=air]'),
    grainOpacity: getComputedStyle(document.body, '::after').opacity,
    sourceFont: getComputedStyle(document.querySelector('#source')).fontSize,
    rowCount: document.querySelectorAll('.source-row').length,
    futureOpacity: getComputedStyle(document.querySelector('.source-row')).opacity,
    pastOpacity: getComputedStyle(document.querySelector('.source-row.is-past')).opacity,
    commandColor: getComputedStyle(document.querySelector('.source-row .tok-command')).color,
    numberColor: getComputedStyle(document.querySelector('.source-row .tok-number')).color,
    ground: getComputedStyle(document.body).backgroundColor,
    executedHasRests: document.querySelector('#executed').textContent.includes('wait '),
    executedHasPreamble: document.querySelector('#executed').textContent.includes('jmpto'),
    seedAfter: (() => { const s = document.querySelector('.seed'); return { visible: s.checkVisibility(), opacity: Number(getComputedStyle(s).opacity) }; })(),
    overflow: document.documentElement.scrollWidth <= innerWidth,
    drawingWidth: Math.round(document.querySelector('.figure').getBoundingClientRect().width),
    source: window.fourthTurn.source,
  })`));
  results.vet = vet;
  const ground = parseRgb(vet.ground);
  const alpha = Number(earlyOpacity);
  results.contrast = {
    future: +contrast(blend(parseRgb(vet.commandColor), ground, alpha), ground).toFixed(2),
    futureNumber: +contrast(blend(parseRgb(vet.numberColor), ground, alpha), ground).toFixed(2),
    past: +contrast(blend(parseRgb(vet.commandColor), ground, Number(vet.pastOpacity)), ground).toFixed(2),
    alpha,
  };
  const unfinished = goldBox('phase1-unfinished.png');
  const complete = goldBox('phase1-complete.png');
  results.square = { unfinished, complete, viewportFraction: +(complete.width / 1280).toFixed(3) };

  assert(results.completed.finished === true, 'The bounded square run finishes');
  assert(results.completed.beatCount === 8, `Eight instructions, eight beats (got ${results.completed.beatCount})`);
  assert(vet.rowCount === 8, 'Four instruction pairs are visible as eight rows');
  assert(vet.source.includes('forward 250') && vet.source.includes('left 90'), 'The executed source uses the long words forward / left');
  assert(vet.executedHasRests && vet.executedHasPreamble, 'The executed source discloses rests and optical placement');
  assert(vet.noAir === true, 'No broad atmospheric light element exists');
  assert(Number(vet.grainOpacity) <= 0.02, 'Grain stays imperceptible');
  assert(parseFloat(vet.sourceFont) >= 12, `Source is readable (${vet.sourceFont})`);
  assert(results.contrast.future >= 4.5, `Future instruction rows meet AA contrast (${results.contrast.future}:1 at opacity ${alpha})`);
  assert(vet.seedAfter.visible === false || Number(vet.seedAfter.opacity) === 0, 'The still withdraws once the real drawing runs');
  assert(vet.overflow === true, 'No horizontal overflow at 1280x800');
  assert(unfinished.count > 40 && unfinished.count < complete.count, `The unfinished frame draws fewer pixels than the closed square (${unfinished.count} < ${complete.count})`);
  assert(results.square.viewportFraction >= 0.05 && results.square.viewportFraction <= 0.34, `The square is intimate, not monumental (${(results.square.viewportFraction * 100).toFixed(1)}% of 1280)`);

  // Reduced motion: still rendered, no runtime fetched, opt-in works.
  const reduced = await newPage(cdp);
  await reduced.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await reduced.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await reduced.goto(page_url, 1200);
  results.reduced = JSON.parse(await reduced.evaluate(`JSON.stringify({ enabled: window.fourthTurn.enabled, pref: !document.querySelector('#preference').hidden, src: !!document.querySelector('#runtime').getAttribute('src'), seed: ${seedVisible} })`));
  assert(results.reduced.enabled === false && results.reduced.pref === true && results.reduced.src === false, 'Reduced motion does not auto-load the runtime');
  assert(results.reduced.seed.visible === true && results.reduced.seed.opacity > 0 && results.reduced.seed.area > 0, 'Reduced motion renders the still');
  assert(!reduced.requests.some((u) => u.includes('/assets/lib/hatch/')), 'Reduced motion fetches no hatch bytes before opt-in');
  await shot(reduced, 'phase1-reduced-still');
  await reduced.evaluate('document.querySelector("#enable").click()');
  for (let i = 0; i < 120; i++) { const r = await reduced.evaluate('window.fourthTurn?.ready === true'); if (r) break; await sleep(100); }
  assert(await reduced.evaluate('window.fourthTurn.enabled === true'), 'Explicit opt-in brings the square to life under reduced motion');

  // A blocked runtime leaves the still and an honest fault.
  const blocked = await newPage(cdp);
  await blocked.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await blocked.s('Network.setBlockedURLs', { urls: ['*assets/lib/hatch/*'] });
  await blocked.goto(page_url, 1200);
  results.blocked = JSON.parse(await blocked.evaluate(`JSON.stringify({ fault: !document.querySelector('#fault').hidden, seed: ${seedVisible} })`));
  assert(results.blocked.fault === true, 'A blocked runtime gives an honest fault');
  assert(results.blocked.seed.visible === true && results.blocked.seed.opacity > 0, 'A blocked runtime keeps the still rendered');
  await shot(blocked, 'phase1-blocked');

  // No JavaScript: recipe, still, honest note.
  const nojs = await newPage(cdp);
  await nojs.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await nojs.s('Emulation.setScriptExecutionDisabled', { value: true });
  await nojs.goto(page_url, 900);
  results.nojs = JSON.parse(await nojs.evaluate(`JSON.stringify({ lines: document.querySelector('#source').textContent.trim().split('\\n').length, fallback: document.querySelector('#source').textContent.includes('forward 250'), seed: ${seedVisible}, note: !!document.querySelector('.no-script') })`));
  assert(results.nojs.lines === 8 && results.nojs.fallback, 'Without JavaScript the fallback recipe is the long-word eight-line source');
  assert(results.nojs.seed.visible === true && results.nojs.seed.opacity > 0 && results.nojs.seed.area > 0, 'Without JavaScript the still is rendered');
  assert(results.nojs.note === true, 'Without JavaScript an honest note remains');
  await shot(nojs, 'phase1-nojs');

  // Phone.
  const phone = await newPage(cdp);
  await phone.s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await phone.goto(page_url, 100);
  for (let i = 0; i < 120; i++) { const r = await phone.evaluate('window.fourthTurn?.ready === true'); if (r) break; await sleep(100); }
  await sleep(1200);
  results.phone = JSON.parse(await phone.evaluate('JSON.stringify({ overflow: document.documentElement.scrollWidth <= innerWidth, sourceFont: getComputedStyle(document.querySelector("#source")).fontSize, drawingAboveSource: document.querySelector(".drawing").getBoundingClientRect().top < document.querySelector(".manuscript").getBoundingClientRect().top })'));
  await shot(phone, 'phase1-phone');
  assert(results.phone.overflow === true, 'The phone layout does not overflow horizontally');
  assert(results.phone.drawingAboveSource === true, 'On a phone the drawing precedes the manuscript');

  const errors = [...page.console, ...reduced.console, ...blocked.console, ...nojs.console, ...phone.console].filter((m) => ['exception', 'error', 'log-error'].includes(m.type));
  assert(errors.length === 0, 'No console errors across the phase');

  // Timestamp-true recording: each frame keeps its real capture duration.
  const durations = [];
  for (let i = 0; i < frames.length; i++) {
    const next = frames[i + 1]?.ts ?? frames[i].ts + 0.08;
    durations.push(Math.max(30, Math.min(400, Math.round((next - frames[i].ts) * 1000))));
  }
  frames.forEach((f, i) => writeFileSync(`${rec}/${String(i).padStart(4, '0')}.jpg`, f.data));
  results.recording = { captured: frames.length, spanMs: Math.round((frames[frames.length - 1].ts - frames[0].ts) * 1000) };
  try {
    const built = execFileSync('python3', ['-c', `
from PIL import Image
import glob, sys, json
files = sorted(glob.glob(sys.argv[1] + '/*.jpg'))
durations = json.loads(sys.argv[2])
ims, ds = [], []
for f, d in zip(files, durations):
    im = Image.open(f).convert('RGB')
    if sum(im.resize((1, 1)).getpixel((0, 0))) / 3 > 200:
        continue  # a navigation flash, not a captured frame
    ims.append(im.resize((800, 500)))
    ds.append(d)
if ims:
    ims[0].save(sys.argv[3], save_all=True, append_images=ims[1:], duration=ds, loop=0, format='WEBP', quality=72, minimize_size=True)
    print(len(ims))
`, rec, JSON.stringify(durations), `${out}/phase1-recording.webp`], { encoding: 'utf8' });
    results.recording.kept = Number(String(built).trim());
  } catch (error) { evidence.push('recording assembly failed: ' + error.message); }

  results.evidence = evidence;
  results.errors = errors;
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ evidence, failures: results.failures || [], contrast: results.contrast, square: results.square, recording: results.recording, out }, null, 2));
} finally { cdp.close(); }

