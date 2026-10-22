// Real pinned-runtime and page interactions. Requires Chromium and Dojo's locked browser tooling.
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const dojo = process.env.DOJO ?? join(homedir(), 'dojo');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE ?? join(dojo, 'scripts/vendor/node_modules/@playwright/test/index.mjs')));
const base = process.env.BASE ?? 'http://localhost:4002';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const contexts = [];
async function open(options = {}, savedata = false, blocked = false) {
  const context = await browser.newContext(options); contexts.push(context);
  if (blocked) await context.route('**/assets/lib/hatch/*.mjs', route => route.abort());
  if (savedata) await context.addInitScript(() => {
    if (navigator.connection) Object.defineProperty(navigator.connection, 'saveData', { get: () => true });
  });
  const page = await context.newPage();
  const errors = [], modules = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/assets\/lib\/hatch\/[^/]+\.mjs(?:\?|$)/.test(request.url())) modules.push(request.url()); });
  await page.goto(base);
  const root = page.locator('[data-fourth-turn]');
  await root.scrollIntoViewIfNeeded();
  return { context, page, root, errors, modules };
}
async function ready(page, text = '90° turn') {
  await page.waitForFunction(text => document.querySelector('#reading')?.textContent === text, text);
  await page.waitForFunction(() => document.querySelector('[data-fourth-turn]')?.dataset.drawing === 'finished');
  await page.waitForTimeout(100);
}
async function proposal(page, position) {
  if (!(await page.locator('#underneath').evaluate(element => element.open))) await page.locator('#underneath summary').click();
  for (let index = 0; index < 3; index++) await page.locator(`[data-coordinate="${index}"]`).fill(String(position[index]));
  await page.locator('[data-coordinate="2"]').press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-fourth-turn]').dataset.proposal === 'accept');
  await page.locator('#underneath summary').click();
}
async function drawingPixels(page) {
  await page.locator('[data-fourth-turn]').evaluate(root => {
    root.querySelector('.turn-room').style.visibility = 'hidden';
    root.querySelector('.turn-controller-layer').style.visibility = 'hidden';
  });
  try {
    const box = await page.locator('[data-turn-drawing]').boundingBox(), viewport = page.viewportSize();
    const x = Math.max(0, box.x), y = Math.max(0, box.y);
    return await page.screenshot({ clip: { x, y, width: Math.min(viewport.width, box.x + box.width) - x, height: Math.min(viewport.height, box.y + box.height) - y } });
  } finally {
    await page.locator('[data-fourth-turn]').evaluate(root => {
      root.querySelector('.turn-room').style.visibility = '';
      root.querySelector('.turn-controller-layer').style.visibility = '';
    });
  }
}
try {
  const desktop = await open({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
  const { page, root } = desktop;
  await ready(page);
  assert.equal(await root.locator('iframe').count(), 0, 'the section composes native canvases, not an iframe');
  await page.evaluate(() => { window.retainedControl = document.querySelector('[data-turn-control]'); });
  await page.locator('[data-step="3"]').click(); await ready(page);
  const before = await drawingPixels(page);
  await proposal(page, [50, 0, 0]); await ready(page, '0° turn');
  const after = await drawingPixels(page);
  assert.notDeepEqual(after, before, 'semantic acceptance must also change pixels inside the drawing canvas');
  assert.match(await page.locator('#recipe').textContent(), /lt turn[\s\S]*polygon 4 0/);
  await page.locator('[data-control="slider"]').click(); await ready(page, '100 steps');
  await proposal(page, [140, 20, 9]); await ready(page, '140 steps');
  assert.equal(await page.locator('[data-coordinate="1"]').inputValue(), '0', 'keyboard UI reads the native projected y, not the proposal');
  assert.match(await page.locator('#recipe').textContent(), /fw 140/);
  await page.evaluate(() => { for (let i = 0; i < 12; i++) document.querySelector(`[data-control="${i % 2 ? 'rotator' : 'slider'}"]`).click(); document.querySelector('[data-control="slider"]').click(); });
  await ready(page, '140 steps');
  assert.ok(await page.evaluate(() => window.retainedControl === document.querySelector('[data-turn-control]')));
  await page.locator('#replay').click(); await ready(page, '140 steps');
  const boxes = await root.evaluate(element => [...element.querySelectorAll('.turn-canvas-layer,.turn-controller-layer')].map(surface => {
    const canvas = surface.querySelector('canvas[id]'), layer = surface.querySelector('canvas[aria-hidden]');
    const box = canvas.getBoundingClientRect(), overlay = layer.getBoundingClientRect();
    return { width: box.width, height: box.height, overlay: { left: overlay.left - box.left, top: overlay.top - box.top, width: overlay.width, height: overlay.height }, bitmap: [canvas.width, canvas.height] };
  }));
  for (const box of boxes) {
    assert.ok(box.width > 300 && box.height > 150, 'surfaces must not retain intrinsic canvas dimensions');
    assert.ok(Math.abs(box.overlay.width - box.width) < 1 && Math.abs(box.overlay.height - box.height) < 1, 'each overlay covers its own content box');
    assert.ok(Math.abs(box.overlay.left) < 1 && Math.abs(box.overlay.top) < 1);
    assert.ok(Math.abs(box.bitmap[0] - box.width * 2) < 3, 'DPR sizes the bitmap, not layout');
  }
  assert.equal(new Set(desktop.modules).size, 1, 'one same-origin content-addressed runtime');
  assert.ok(desktop.modules.every(url => new URL(url).origin === new URL(base).origin));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await root.locator('canvas[aria-hidden]').count(), 0, 'pagehide releases every owned overlay');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await ready(page, '140 steps');
  assert.equal(await root.locator('canvas[aria-hidden]').count(), 2, 'persisted pageshow acquires exactly two new owners');

  const runtime = await page.evaluate(async () => {
    const { createHatch } = await import(document.querySelector('[data-fourth-turn]').dataset.hatch);
    const surface = document.createElement('div'); surface.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:120px';
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:100%;height:100%'; surface.append(canvas); document.body.append(surface);
    const hatch = createHatch(canvas), result = {};
    try {
      const delayed = await hatch.play('wait 0.25\nlet s = 7');
      const availability = []; hatch.interaction.subscribe('s', answer => availability.push(answer));
      await delayed.finished; result.availability = availability;
      const motion = await hatch.play('as A do\nwait 0.25\njmp 10\nwait 0.25\nend\nlet p = A.position');
      const positions = [], coherent = [];
      hatch.interaction.subscribe('A', 'position', answer => { positions.push(answer.value); coherent.push(JSON.stringify(answer) === JSON.stringify(hatch.interaction.read('p'))); });
      await motion.finished; result.positions = positions; result.coherent = coherent;
      const cancelled = await hatch.play('wait 0.25\nlet s = 9');
      const cancelledSamples = []; const stop = hatch.interaction.subscribe('s', answer => cancelledSamples.push(answer)); stop(); stop();
      await cancelled.finished; result.cancelled = cancelledSamples;
      const old = await hatch.play('wait 0.25\nlet s = 1'); const replaced = old.finished.catch(error => error.reason);
      const oldSamples = []; hatch.interaction.subscribe('s', answer => oldSamples.push(answer));
      const next = await hatch.play('let s = 2'); await next.finished;
      result.replacement = { reason: await replaced, samples: oldSamples, current: hatch.interaction.read('s') };
      await (await hatch.play('let A\nlet A.y = 0\nlet A.z = 0\nlet p = A.position')).finished;
      const samples = [], reentrant = [];
      hatch.interaction.subscribe('p', answer => { samples.push(answer.value); reentrant.push(hatch.interaction.propose('A', [8, 0, 0]).kind); throw new Error('observer is not an authority'); });
      result.proposal = hatch.interaction.propose('A', [7, 20, 9]);
      result.accepted = hatch.interaction.read('A', 'position'); result.reentrant = reentrant;
      result.snapshot = { first: samples[0], frozen: Object.isFrozen(samples[0]) };
      const fatal = await hatch.play('fw 1\nwait 0.25\nnope');
      result.fatal = await fatal.finished.then(() => null, error => ({ reason: error.reason, line: error.wound?.span?.line }));
      const beats = []; hatch.onBeat(beat => beats.push(beat));
      await (await hatch.play('loop 3 do\nfw 1\nwait 0.05\nend')).finished;
      result.occurrences = beats.flatMap(beat => beat.lines).filter(line => line === 2).length;
      const abandoned = await hatch.play('wait 1\nlet s = 8'); const disposed = abandoned.finished.catch(error => error.reason);
      hatch.dispose(); result.disposed = await disposed; result.retired = hatch.interaction.read('s');
      const capCanvas = document.createElement('canvas'); capCanvas.style.cssText = canvas.style.cssText; surface.append(capCanvas);
      const capped = createHatch(capCanvas, { caps: { maxCommands: 4 } });
      try {
        const limited = await capped.play('fw 1\nwait 0.25\nlimitCommand 100\nfw 1\nfw 1\nfw 1');
        result.ceiling = await limited.finished.then(() => null, error => ({ reason: error.reason, message: error.wound?.message ?? error.message }));
      } finally { capped.dispose(); capCanvas.remove(); }
    } finally { hatch.dispose(); surface.remove(); }
    return result;
  });
  assert.deepEqual(runtime.availability, [{ kind: 'missing' }, { kind: 'value', value: 7 }]);
  assert.deepEqual(runtime.positions, [[0, 0, 0], [10, 0, 0]]); assert.ok(runtime.coherent.every(Boolean));
  assert.deepEqual(runtime.cancelled, [{ kind: 'missing' }]);
  assert.deepEqual(runtime.replacement, { reason: 'superseded', samples: [{ kind: 'missing' }], current: { kind: 'value', value: 2 } });
  assert.equal(runtime.proposal.kind, 'accept'); assert.deepEqual(runtime.accepted.value, [7, 0, 0]);
  assert.ok(runtime.reentrant.every(kind => kind === 'busy')); assert.deepEqual(runtime.snapshot, { first: [0, 0, 0], frozen: true });
  assert.deepEqual(runtime.fatal, { reason: 'fatal', line: 3 }); assert.equal(runtime.occurrences, 3);
  assert.equal(runtime.disposed, 'disposed'); assert.equal(runtime.retired.kind, 'retired');
  assert.equal(runtime.ceiling.reason, 'fatal'); assert.match(runtime.ceiling.message, /Maximum command limit of 4/);
  console.log('desktop: proposal acceptance + canvas pixels, native projection, rapid replacement, recipes, overlays, DPR, lifecycle reacquisition, and real runtime subscription/completion contracts passed');
  await page.goto(base);
  for (const name of ['inquiry', 'leaders', 'creators']) {
    const chapter = page.locator(`[data-chapter="${name}"]`);
    if (!(await chapter.evaluate(element => element.open))) await chapter.locator('summary').click();
    await page.waitForFunction(name => document.querySelector(`[data-chapter="${name}"]`).hasAttribute('data-drawing-ready'), name);
    const canvas = page.locator(`[data-life="${name}"] .helios-possibility__ink`);
    assert.equal(await canvas.count(), 1);
    assert.ok((await canvas.boundingBox()).width > 100);
  }
  await page.goto(new URL('/helios-interval', base).href);
  await page.waitForURL(url => url.hash === '#fourth-turn');
  await ready(page);
  assert.equal(await page.locator('[data-helios-interval]').count(), 0, 'the retired interval no longer boots');
  console.log('existing consumers: all three possibilities finish; the interval redirects to Fourth Turn');

  const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ready(mobile.page);
  const box = await mobile.page.locator('[data-turn-control]').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2 + 120 * box.height / (1000 * Math.tan(Math.PI / 6));
  const touch = await mobile.context.newCDPSession(mobile.page);
  for (const [type, dx, dy] of [['touchStart', 0, 0], ['touchMove', 25, -8], ['touchMove', 40, -20], ['touchEnd', 0, 0]]) {
    await touch.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: x + dx, y: y + dy }] });
  }
  await mobile.page.waitForFunction(() => document.querySelector('[data-fourth-turn]').dataset.reading !== '90');
  const coordinates = await mobile.page.locator('[data-coordinate]').evaluateAll(inputs => inputs.map(input => Number(input.value)));
  assert.ok(Math.abs(Math.hypot(...coordinates) - 120) < 0.001, 'native drag stays on the authored circle');
  console.log('mobile: real touch drag changes native reading and stays law-bound');

  for (const [options, savedata, name] of [[{ reducedMotion: 'reduce' }, false, 'reduced motion'], [{}, true, 'Save-Data']]) {
    const choice = await open(options, savedata);
    await choice.page.locator('#enable-runtime').waitFor({ state: 'visible' });
    assert.equal(choice.modules.length, 0, `${name} must not fetch runtime code before consent`);
    await choice.page.locator('#enable-runtime').click(); await ready(choice.page);
    assert.ok(choice.modules.length > 0, 'explicit enable actually opens the runtime');
    assert.deepEqual(choice.errors, []);
    console.log(`${name}: no runtime fetch until explicit enable, then accepted native controls`);
  }
  const retry = await open({ reducedMotion: 'reduce' }, false, true);
  await retry.page.locator('#enable-runtime').waitFor({ state: 'visible' });
  await retry.page.locator('#enable-runtime').click();
  await retry.page.waitForFunction(() => document.querySelector('[data-fourth-turn]').dataset.state === 'fault');
  assert.match(await retry.page.locator('#fault').textContent(), /PaperLang could not continue/);
  await retry.context.unroute('**/assets/lib/hatch/*.mjs');
  await retry.page.locator('#enable-runtime').click(); await ready(retry.page);
  assert.deepEqual(retry.errors, []);
  console.log('load failure: visible refusal and retry preserve explicit reduced-motion consent');
  const nojs = await open({ javaScriptEnabled: false });
  assert.equal((await nojs.page.locator('#recipe').textContent()).split('\n').length, 8);
  assert.match(await nojs.root.locator('noscript').textContent(), /Enable JavaScript/);
  assert.equal(nojs.modules.length, 0, 'no-JS still offers the recipe without fetching the runtime');
  console.log('no JavaScript: readable recipe and explicit runtime limitation');
  assert.deepEqual(desktop.errors, []); assert.deepEqual(mobile.errors, []);
  console.log('hatch parity passed — no uncaught browser exceptions');
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
