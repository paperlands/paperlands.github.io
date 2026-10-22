// Attribution, not a synthetic speed score. Isolated CDP browser, warmed native
// gestures, page-wide read-after-write diagnostics and media/ink ablations.
// CDP_PORT=9247 BASE=http://127.0.0.1:4001 TRACE=1 node design/probe/front-page-performance.mjs
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
const base = process.env.BASE || 'http://127.0.0.1:4001';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-front-page-performance';
mkdirSync(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cdp = await connect(), page = await newPage(cdp), reports = [];
let variant = 'normal';
// Keep the authored fallback picture, but do not run its scrubber. The independent
// focus subscriber remains. This removes both image churn and its pose writes.
cdp.on(message => {
  if (message.sessionId !== page.sessionId || message.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = message.params;
  const skip = (variant === 'static-ink' && request.url.endsWith('/scroll-scrub.mjs')) ||
    (variant === 'posters' && request.url.endsWith('/media-video.js')) ||
    (variant === 'static-banner' && request.url.endsWith('/helios.js'));
  page.s(skip ? 'Fetch.fulfillRequest' : 'Fetch.continueRequest', skip
    ? { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: '' }
    : { requestId }).catch(error => console.error(error));
});
await page.s('Fetch.enable', { patterns: ['*scroll-scrub.mjs', '*media-video.js', '*helios.js'].map(urlPattern => ({ urlPattern })) });
await page.s('Network.setCacheDisabled', { cacheDisabled: true });
await page.s('Network.setBypassServiceWorker', { bypass: true });
const categories = 'devtools.timeline,blink,cc,gpu,viz';
writeFileSync(out + '/environment.json', JSON.stringify({ base, browser: await cdp.send('Browser.getVersion'), categories,
  note: 'Instrumented diagnostics; distributions include gesture waits. Not an FPS benchmark.' }, null, 2));
await page.s('Performance.enable');
await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
  const b = window.__frontBudget = { recording: false, frames: [], callbacks: [], reads: {}, lateReads: {}, outsideRafReads: {}, loaf: [], longTasks: [], maxDecodes: 0, decodes: 0 };
  const raf = requestAnimationFrame.bind(window); let previous = 0, stamp = -1, wrote = false, inflight = 0, inRaf = false;
  function monitor(t) { if (t !== stamp) { stamp = t; wrote = false; } if (b.recording && previous) b.frames.push(t - previous); previous = t; raf(monitor); } raf(monitor);
  window.requestAnimationFrame = cb => raf(t => {
    if (t !== stamp) { stamp = t; wrote = false; }
    const start = performance.now(); inRaf = true;
    try { cb(t); } finally { inRaf = false; if (b.recording) b.callbacks.push({ name: cb.name, ms: performance.now() - start }); }
  });
  function read(name) {
    if (!b.recording) return;
    b.reads[name] = (b.reads[name] || 0) + 1;
    if (wrote) {
      const key = name + ':' + new Error().stack.split('\\n').slice(3, 6).join(' | ');
      const reads = inRaf ? b.lateReads : b.outsideRafReads;
      reads[key] = (reads[key] || 0) + 1;
    }
  }
  function wrap(proto, name, before) { const fn = proto[name]; proto[name] = function(...args) { before(name); return fn.apply(this, args); }; }
  wrap(Element.prototype, 'getBoundingClientRect', read);
  wrap(window, 'getComputedStyle', read);
  for (const [proto, names] of [[HTMLElement.prototype, ['offsetWidth','offsetHeight']], [Element.prototype, ['clientHeight','clientWidth']]]) {
    for (const name of names) { const d = Object.getOwnPropertyDescriptor(proto, name); if (d?.get && d.configurable) Object.defineProperty(proto, name, { ...d, get() { read(name); return d.get.call(this); } }); }
  }
  const write = () => { if (b.recording) wrote = true; };
  for (const name of ['setAttribute','removeAttribute','replaceChildren']) wrap(Element.prototype, name, write);
  wrap(CSSStyleDeclaration.prototype, 'setProperty', write);
  // Inline CSS named properties are exotic setters, not portable prototype
  // descriptors. Proxy the inline-style getter so assignments are recorded too.
  const styles = new WeakMap();
  for (const proto of [HTMLElement.prototype, SVGElement.prototype]) {
    const d = Object.getOwnPropertyDescriptor(proto, 'style');
    if (d?.get && d.configurable) Object.defineProperty(proto, 'style', { ...d, get() {
      const target = d.get.call(this);
      if (!styles.has(target)) styles.set(target, new Proxy(target, {
        get(t, key) { const value = Reflect.get(t, key, t); return typeof value === 'function' ? value.bind(t) : value; },
        set(t, key, value) { write(); return Reflect.set(t, key, value, t); },
      }));
      return styles.get(target);
    } });
  }
  const decode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function() { b.decodes++; b.maxDecodes = Math.max(b.maxDecodes, ++inflight); return decode.call(this).finally(() => inflight--); };
  new PerformanceObserver(list => { if (b.recording) b.longTasks.push(...list.getEntries().map(e => e.duration)); }).observe({ type: 'longtask' });
  if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) new PerformanceObserver(list => {
    if (b.recording) b.loaf.push(...list.getEntries().map(e => ({ duration: e.duration, blocking: e.blockingDuration,
      render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0, styleAndLayout: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0 })));
  }).observe({ type: 'long-animation-frame' });
` });
const metrics = async () => Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
try {
  for (const [device, width, height, rate] of [['desktop',1440,900,1], ['phone-4x',390,844,4]]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 850 });
    await page.s('Emulation.setCPUThrottlingRate', { rate });
    for (const scene of ['hero', 'create']) for (variant of scene === 'hero' ? ['normal', 'posters', 'static-banner'] : ['normal', 'static-ink']) {
      const errorOffset = page.console.length;
      await page.goto(base, 2400); await page.evaluate('document.fonts.ready');
      assert.equal(await page.evaluate('document.querySelectorAll("[data-scrub-ink]").length'), 2, 'probe the actual compiled front page, not a stale build');
      if (variant === 'posters') await page.evaluate(`document.querySelectorAll('video').forEach(video => {
        video.pause(); video.removeAttribute('src'); video.querySelectorAll('source').forEach(source => source.remove()); video.load();
      })`);
      if (scene === 'create') await page.evaluate(`(() => { const e = document.querySelector('.helios-create'), r = e.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + r.height * .25 - innerHeight * .72, behavior: 'instant' }); })()`);
      await wait(1000);
      assert.equal(await page.evaluate('document.visibilityState'), 'visible');
      assert.ok(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'no horizontal overflow');
      if (variant === 'posters') assert.ok(await page.evaluate('!window.paperlandMedia && Array.from(document.querySelectorAll("video")).every(v => v.paused && v.readyState === 0 && !v.hasAttribute("src") && !v.querySelector("source"))'), 'posters ablation attaches no media');
      const positions = [];
      const before = await metrics();
      const trace = process.env.TRACE && device === 'desktop' && variant === 'normal';
      if (trace) await cdp.send('Tracing.start', { categories, transferMode: 'ReturnAsStream' });
      await page.evaluate('window.__frontBudget.recording = true');
      for (const distance of scene === 'hero' ? [-650,650] : [-250,250]) {
        const yBefore = await page.evaluate('scrollY');
        await page.s('Input.synthesizeScrollGesture', { x: Math.round(width * .7), y: Math.round(height * .55), yDistance: distance, speed: 400, gestureSourceType: 'mouse' });
        await wait(200);
        const yAfter = await page.evaluate('scrollY');
        assert.ok(Math.abs(yAfter - yBefore) > 30, 'native gesture must actually move the page');
        positions.push([yBefore, yAfter]);
      }
      await wait(100);
      const samples = await page.evaluate('window.__frontBudget.recording = false; window.__frontBudget');
      const after = await metrics();
      assert.deepEqual(page.console.slice(errorOffset).filter(e => e.type === 'exception'), [], 'no runtime exceptions');
      if (scene === 'create' && variant === 'normal') assert.ok(await page.evaluate('!!document.querySelector(".helios-create").dataset.inkFrame'), 'scrub runtime committed a decoded frame');
      if (variant === 'static-ink') assert.equal(samples.decodes, 0, 'static fallback ablation does not decode a catalogue');
      if (trace) {
        const done = new Promise(resolve => cdp.on(m => { if (m.method === 'Tracing.tracingComplete') resolve(m.params.stream); }));
        await cdp.send('Tracing.end'); const handle = await done; let data = '', part;
        do { part = await cdp.send('IO.read', { handle }); data += part.base64Encoded ? Buffer.from(part.data, 'base64').toString() : part.data; } while (!part.eof);
        await cdp.send('IO.close', { handle }); writeFileSync(out + '/trace-' + scene + '.json', data);
      }
      const values = [...samples.frames].sort((a,b) => a-b), pct = p => values[Math.floor(values.length*p)] || 0;
      const report = { device, scene, variant, positions, frames: values.length, p50: pct(.5), p95: pct(.95), max: Math.max(0, ...values),
        totals: Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration'].map(k => [k, (after[k]-before[k])*1000])),
        reads: samples.reads, lateReads: samples.lateReads, outsideRafReads: samples.outsideRafReads, decodes: samples.decodes, maxConcurrentDecodes: samples.maxDecodes, longTasks: samples.longTasks, loaf: samples.loaf };
      reports.push(report); console.log(JSON.stringify({ ...report, lateReads: Object.values(report.lateReads).reduce((a,b) => a+b, 0), outsideRafReads: Object.values(report.outsideRafReads).reduce((a,b) => a+b, 0), loaf: report.loaf.length }));
      writeFileSync(out + '/' + device + '-' + scene + '-' + variant + '.json', JSON.stringify(samples, null, 2));
    }
  }
  writeFileSync(out + '/report.json', JSON.stringify(reports, null, 2));
} finally {
  await cdp.send('Target.closeTarget', { targetId: (await page.s('Target.getTargetInfo')).targetInfo.targetId }).catch(() => {});
  cdp.close();
}
