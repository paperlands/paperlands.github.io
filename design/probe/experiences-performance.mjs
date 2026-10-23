// /experiences performance probe: frozen build + minimal ablations.
// Owner: paired experimentalist. Reads the built site, never edits production.
//
// BASE        frozen build root (serve an immutable /tmp snapshot, never a mutable _site)
// PROBE_OUTPUT raw rows + traces; the durable summary is evidence/experiences-performance.json
// REPEATS     cold navigations per arm (default 2); arm order reverses on even repeats
// ARMS_ONLY   comma list, narrows the matrix for one bounded spike
// DEVICES     comma list of desktop|phone
// NET=4g      modelled 1.5 Mbps / 150 ms bound on the same cold load
// TRACE=1     traces desktop arms into trace-<arm>.json for compositor attribution
// TRACE_ARMS  comma list of arms to trace (default shipped)
// PIXEL_GATE=strict fails a candidate arm on a pixel mismatch; the default records
// the mismatch and its PNGs, because a changed representation is a finding, not a crash
//
// CDP_PORT=9251 BASE=http://127.0.0.1:4051 REPEATS=3 TRACE=1 \
//   node design/probe/experiences-performance.mjs
//
// Arms: shipped, still, no-stage, no-focus, no-clocks are the attribution matrix.
// no-arcs, no-mask, no-transform and the will-change variants are desktop-only
// single-factor arms; every hook asserts its own arm identity, so a silently
// unapplied hook fails that arm instead of biasing the comparison.
//
// What this is: cold-load LCP and network arrival, plus stationary and
// native-gesture frame attribution on the headless software compositor.
// What this is not: a device FPS claim, a field measurement, or a Lighthouse
// score. `--disable-gpu` headless is stated in the environment block; the GPU
// renderer string is recorded so a software compositor is never mistaken for
// hardware. Cache is disabled and the service worker bypassed, so every rep is
// a cold localhost load; localhost arrival is a server-speed bound, not 4G.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';

const base = (process.env.BASE || 'http://127.0.0.1:4051').replace(/\/$/, '');
const out = process.env.PROBE_OUTPUT || '/tmp/experiences-perf/raw';
const repeats = Number(process.env.REPEATS || 2);
const traced = Boolean(process.env.TRACE);
// Optional narrowing, so a bounded spike does not re-run the whole matrix.
const armOnly = process.env.ARMS_ONLY ? new Set(process.env.ARMS_ONLY.split(',')) : null;
const deviceOnly = process.env.DEVICES ? new Set(process.env.DEVICES.split(',')) : null;
const traceArms = (process.env.TRACE_ARMS || 'shipped').split(',');
// NET=4g is the pessimistic view: a 1.5 Mbps phone on 150 ms RTT, applied to the
// same cold, cache-disabled load. It is a modelled bound, not a field claim.
const net = process.env.NET === '4g' ? { latency: 150, downloadThroughput: 1.5e6 / 8, uploadThroughput: 750e3 / 8 } : null;
mkdirSync(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const STAGE = '/assets/js/experiences/stage.mjs';
const FOCUS = '/assets/js/experiences/focus.mjs';
const ARCS = '/assets/js/experiences/arcs.mjs';
// A drawArcs that does nothing keeps the overture clock and the torus transform
// alive with no canvas raster work. It is response substitution for one arm,
// never a production representation.
const NO_ARCS = 'export function arcShapes() { return []; }\nexport function drawArcs() {}\n';
// Same clearRect cadence and same DOM, one stroke instead of eight: drawing cost
// with invalidation held constant.
const ONE_ARC = `export function arcShapes() { return []; }
export function drawArcs(c, w, h, t) {
  c.clearRect(0, 0, w, h);
  c.lineWidth = 1;
  c.strokeStyle = 'rgba(240,168,61,0.4)';
  c.beginPath();
  c.arc(w * .7, h * .89, h * .45, Math.PI, Math.PI * 1.6);
  c.stroke();
}
`;
// The authored drawing, executed in full, but into a detached canvas: the JS and
// raster work stay, the visible surface never invalidates. Copied from the frozen
// arcs.mjs so the stroke work is comparable.
const DETACHED_ARCS = `const lerp = (a, b, t) => a + (b - a) * t;
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
export function arcShapes(w, h, t, { x = .5, y = .95 } = {}) {
  return Array.from({ length: 8 }, (_, k) => {
    const radius = lerp(h * .15, h * .95, k / 7) * (1 + .03 * Math.sin(t * .7 + k));
    const sweep = lerp(.4, 1, hash(k, 7)) * Math.PI * (.7 + .3 * Math.sin(t * .5 + k * 1.7));
    const start = Math.PI + (Math.PI - sweep) / 2 + Math.sin(t * .2 + k) * .25;
    const traveller = start + sweep * ((t * .12 + k * .13) % 1);
    return { x: w * x, y: h * y, radius, start, sweep, traveller, alpha: lerp(.4, .1, k / 7), dashed: k % 3 === 2 };
  });
}
let scratch = null;
export function drawArcs(c, w, h, t, origin) {
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = Math.max(1, Math.round(w));
    scratch.height = Math.max(1, Math.round(h)); }
  const s = scratch.getContext('2d');
  s.clearRect(0, 0, scratch.width, scratch.height);
  s.lineWidth = 1;
  for (const arc of arcShapes(scratch.width, scratch.height, t, origin)) {
    s.strokeStyle = \`rgba(240,168,61,\${arc.alpha.toFixed(3)})\`;
    s.setLineDash(arc.dashed ? [3, 5] : []);
    s.beginPath();
    s.arc(arc.x, arc.y, arc.radius, arc.start, arc.start + arc.sweep);
    s.stroke();
    s.fillStyle = 'rgba(241,219,164,0.8)';
    s.fillRect(arc.x + Math.cos(arc.traveller) * arc.radius - 1,
      arc.y + Math.sin(arc.traveller) * arc.radius - 1, 2, 2);
  }
  s.setLineDash([]);
}
`;

// Same HTML, CSS, fonts, images and posters in every arm. Only the two
// progressive-motion modules change, and each ablation keeps the authored
// fallback that ships for reduced motion / no JavaScript: the SVG arcs still
// and the CSS resting ink. An arm is attribution, not a proposed replacement.
const ARMS = [
  { id: 'shipped', blank: [], note: 'authored page as built' },
  { id: 'still', blank: [], media: 'reduce', note: 'same build under prefers-reduced-motion: reduce' },
  { id: 'no-stage', blank: [STAGE], note: 'overture clock ablated; authored SVG arcs remain visible' },
  { id: 'no-focus', blank: [FOCUS], note: 'reading clock ablated; CSS resting ink remains' },
  { id: 'no-clocks', blank: [STAGE, FOCUS], note: 'both clocks ablated; nav and media remain; complete authored still' },
  // Isolation arms: only on the desktop matrix, one factor at a time.
  { id: 'no-arcs', replace: { [ARCS]: NO_ARCS }, devices: ['desktop'],
    note: 'clock and torus transform kept, canvas raster removed' },
  { id: 'no-mask', css: '.experiences-arcs{mask-image:none !important}', devices: ['desktop'],
    note: 'clock, transform and canvas kept, authored mask removed' },
  { id: 'no-transform', swallowTransform: true, devices: ['desktop'],
    note: 'clock and canvas kept, torus transform writes suppressed after load' },
  // Faithful-representation spike: the same geometry, grade, mask and assets,
  // with one compositor hint. Nothing is baked, promoted permanently or slowed.
  // Candidate 1 decomposition: drawing, canvas area and compositing, one factor
  // at a time. These arms change pixels by design, so they are diagnostic only
  // and are never pixel-gated.
  { id: 'draw-1', replace: { [ARCS]: ONE_ARC }, devices: ['desktop'],
    note: 'same clearRect cadence, one stroke instead of eight' },
  { id: 'draw-detached', replace: { [ARCS]: DETACHED_ARCS }, devices: ['desktop'],
    note: 'authored stroke work kept, drawn into a detached canvas so the visible surface never invalidates' },
  { id: 'canvas-hidden', devices: ['desktop'], css: '[data-stage-arcs]{visibility:hidden !important}',
    note: 'clock, drawing and canvas calls kept, canvas compositing suppressed' },
  { id: 'canvas-half', devices: ['desktop'],
    replace: () => ({ [STAGE]: bodies['stage.mjs'].replace(
      'dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)));',
      'dpr = Math.max(.25, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height))) * .5);') }),
    note: 'same code path and cadence, canvas backing store halved in each axis (quarter the pixels)' },
  { id: 'will-change', pixelGate: true, devices: ['desktop'],
    css: '.experiences-gathering-thought{will-change:transform}',
    note: 'authored page plus a resident will-change:transform hint' },
  { id: 'will-change-visible', pixelGate: true, devices: ['desktop'], visibleHint: true,
    note: 'hint owned by actual motion lifetime: present while the overture is visible, removed offscreen' },
  { id: 'will-change-transient', pixelGate: true, devices: ['desktop'], transientHint: true,
    note: 'rejected ownership, kept as a control: hint only while a gesture scrolls, because the overture moves at rest too' },
];

const cdp = await connect();
const page = await newPage(cdp);
await page.s('Network.setCacheDisabled', { cacheDisabled: true });
await page.s('Network.setBypassServiceWorker', { bypass: true });
await page.s('Performance.enable');

// Ablation is a byte-identical page with an empty module body, so layout,
// requests and LCP candidates stay comparable across arms.
let blanked = new Set();
let overrides = new Map();
cdp.on(message => {
  if (message.sessionId !== page.sessionId || message.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = message.params;
  const path = new URL(request.url).pathname;
  if (overrides.has(path) || blanked.has(path)) {
    page.s('Fetch.fulfillRequest', {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Cache-Control', value: 'no-store' }],
      body: Buffer.from(overrides.get(path) ?? '').toString('base64'),
    }).catch(error => console.error(error));
    return;
  }
  page.s('Fetch.continueRequest', { requestId }).catch(error => console.error(error));
});
await page.s('Fetch.enable', {
  patterns: [STAGE, FOCUS, ARCS].map(path => ({ urlPattern: '*' + path })),
});

// Pin what was measured. Hashes come from the served bytes, not from the tree.
const frozen = {};
const served = {};
const bodies = {};
for (const path of ['/experiences.html', STAGE, FOCUS, '/assets/js/experiences/arcs.mjs']) {
  const response = await fetch(base + path);
  assert.ok(response.ok, `frozen build is missing ${path}`);
  served[path.split('/').pop()] = {
    encoding: response.headers.get('content-encoding') || 'identity',
    contentLength: Number(response.headers.get('content-length')) || null,
  };
  const bytes = Buffer.from(await response.arrayBuffer());
  bodies[path.split('/').pop()] = bytes.toString('utf8');
  frozen[path.split('/').pop()] = createHash('sha256').update(bytes).digest('hex');
}

// Cold-load and per-frame instrumentation. No DOM writes, no layout reads in
// the sampling path: the observers only read the entries the browser emits.
await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
  const x = window.__xp = { recording: false, frames: [], draws: 0, customPropertyWrites: 0,
    lcp: [], lcpEl: null, fcp: null, loaf: [], longTasks: [], loads: 0 };
  const raf = requestAnimationFrame.bind(window);
  let previous = 0;
  function monitor(t) { if (x.recording && previous) x.frames.push(t - previous); previous = t; raf(monitor); }
  raf(monitor);
  const clear = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function (...args) {
    if (x.recording && this.canvas && this.canvas.matches('[data-stage-arcs]')) x.draws++;
    return clear.apply(this, args);
  };
  // Custom-property writes only. The overture's torus uses a direct
  // style.transform assignment, which this counter deliberately does not
  // claim to see; canvas draws are attributed by canvas identity instead.
  const set = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (...args) {
    if (x.recording) x.customPropertyWrites++;
    return set.apply(this, args);
  };
  new PerformanceObserver(list => {
    x.fcp = list.getEntries().find(e => e.name === 'first-contentful-paint')?.startTime ?? x.fcp;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      x.lcp.push({ time: entry.startTime, size: entry.size, url: entry.url || '' });
      if (entry.element) x.lcpEl = entry.element;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => { if (x.recording) x.longTasks.push(...list.getEntries().map(e => e.duration)); })
    .observe({ type: 'longtask' });
  if (PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
    new PerformanceObserver(list => {
      if (!x.recording) return;
      for (const e of list.getEntries()) x.loaf.push({
        duration: e.duration,
        script: e.scripts.reduce((sum, s) => sum + (s.duration || 0), 0),
        render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
        styleLayout: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
      });
    }).observe({ type: 'long-animation-frame' });
  }
  addEventListener('load', () => { x.loads++; });
` });

const readSnapshot = kind => page.evaluate(`(() => {
  const x = window.__xp;
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const resources = performance.getEntriesByType('resource');
  const lcp = x.lcp.length ? x.lcp[x.lcp.length - 1] : null;
  const element = x.lcpEl;
  const elementUrl = element && (element.currentSrc || element.src || '');
  const match = elementUrl && resources.filter(r => r.name === elementUrl).pop();
  const bytes = resources.reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize || 0), 0);
  const frames = x.frames; x.frames = [];
  const draws = x.draws; x.draws = 0;
  const customPropertyWrites = x.customPropertyWrites; x.customPropertyWrites = 0;
  const loaf = x.loaf; x.loaf = [];
  const longTasks = x.longTasks; x.longTasks = [];
  const seam = document.querySelector('.experiences-seam-field');
  const arcs = document.querySelector('.experiences-arcs');
  const svg = arcs && arcs.querySelector('svg');
  const canvas = arcs && arcs.querySelector('canvas');
  return {
    kind: ${JSON.stringify(kind)},
    frames, draws, customPropertyWrites, longTasks, loaf,
    lcp: lcp ? {
      time: lcp.time, size: lcp.size,
      tag: element ? element.tagName : null,
      className: element ? (element.className || '').toString().slice(0, 80) : null,
      src: elementUrl ? elementUrl.split('/').pop() : null,
      rect: element ? (r => ({ width: Math.round(r.width), height: Math.round(r.height) }))(element.getBoundingClientRect()) : null,
    } : null,
    arrival: match ? { start: match.startTime, request: match.requestStart, end: match.responseEnd,
      bytes: match.transferSize || match.encodedBodySize } : null,
    fcp: x.fcp,
    ttfb: nav.responseStart ?? null, domContentLoaded: nav.domContentLoadedEventEnd ?? null,
    load: nav.loadEventEnd ?? null, bytes, requests: resources.length,
    fonts: (document.fonts && document.fonts.status) || 'unknown',
    arcState: {
      live: Boolean(arcs && arcs.classList.contains('is-live')),
      stageState: document.querySelector('.experiences-overture')?.dataset.stageState ?? null,
      svgVisible: svg ? getComputedStyle(svg).visibility : null,
      canvasVisible: canvas ? getComputedStyle(canvas).visibility : null,
      canvasPixels: canvas ? [canvas.width, canvas.height] : null,
    },
    tree: seam ? {
      growth: getComputedStyle(seam).getPropertyValue('--tree-growth').trim(),
      canopy: getComputedStyle(seam).getPropertyValue('--tree-canopy').trim(),
    } : null,
    y: scrollY, height: document.documentElement.scrollHeight,
  };
})()`);

// Deterministic-pose pixel gate. Reduced motion stops every clock, so the same
// viewport and the same explicitly assigned transform must produce byte-identical
// pixels with and without a compositor hint. The still alone is not enough: a hint
// may change rasterisation only at non-zero transforms.
const POSE_TRANSFORMS = [
  'translate3d(-12px,6px,0) rotate(-12deg)',
  'translate3d(-5px,2px,0) rotate(-25.5deg)',
  'translate3d(0px,0px,0) rotate(-40deg)',
];
// A pixel mismatch is a finding, not a crash: record it and save the images so a
// rejection can be inspected. PIXEL_GATE=strict fails a candidate arm instead.
const pixelGateStrict = process.env.PIXEL_GATE === 'strict';
const stillHash = async armId => {
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.evaluate('scrollTo({ top: 0, behavior: "instant" })');
  await wait(260);
  const hash = async name => {
    const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
    if (!pixelGateStrict) writeFileSync(`${out}/gate-${armId}-${name}.png`, Buffer.from(data, 'base64'));
    return createHash('sha256').update(Buffer.from(data, 'base64')).digest('hex');
  };
  const still = await hash('still');
  const poses = [];
  let pose = 0;
  for (const transform of POSE_TRANSFORMS) {
    await page.evaluate(`(() => { const torus = document.querySelector('[data-stage-torus]');
      if (torus) torus.style.transform = ${JSON.stringify(transform)}; })()`);
    await wait(120);
    poses.push(await hash(`pose${pose++}`));
  }
  await page.evaluate(`(() => { const torus = document.querySelector('[data-stage-torus]');
    if (torus) torus.style.transform = ''; })()`);
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  return { still, poses, transforms: POSE_TRANSFORMS };
};
const stillReferences = new Map();

const stats = values => {
  if (!values.length) return { n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    n: sorted.length,
    p50: +at(.5).toFixed(1), p95: +at(.95).toFixed(1),
    max: +Math.max(...sorted).toFixed(1),
    secondFrames: sorted.filter(v => v > 25).length,
  };
};

const loadPage = async () => {
  // A load that never fires is a failed measurement, not a short page.
  const loaded = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('load event never fired within 12s')), 12000);
    const listener = message => {
      if (message.method === 'Page.loadEventFired' && message.sessionId === page.sessionId) {
        clearTimeout(timer);
        resolve();
      }
    };
    cdp.on(listener);
  });
  await page.s('Page.navigate', { url: base + '/experiences.html' });
  await loaded;
  await page.evaluate('document.fonts.ready.then(() => true)');
  await wait(150);
};

const devices = [
  { id: 'desktop', width: 1440, height: 900, factor: 1, cpu: 1 },
  { id: 'phone', width: 390, height: 844, factor: 3, cpu: 4 },
].filter(device => !deviceOnly || deviceOnly.has(device.id));

const gpu = await cdp.send('SystemInfo.getInfo').then(info => ({
  renderer: info.gpu?.devices?.[0]?.deviceString ?? null,
  vendor: info.gpu?.devices?.[0]?.vendorString ?? null,
  aux: info.gpu?.auxAttributes ?? {},
})).catch(() => null);
const browser = await cdp.send('Browser.getVersion');

const rows = [];
try {
  for (const device of devices) {
    await page.s('Emulation.setDeviceMetricsOverride', {
      width: device.width, height: device.height,
      deviceScaleFactor: device.factor, mobile: device.id === 'phone',
    });
    await page.s('Emulation.setCPUThrottlingRate', { rate: device.cpu });
    await page.s('Emulation.setTouchEmulationEnabled', { enabled: device.id === 'phone', maxTouchPoints: 1 });
    await page.s('Network.emulateNetworkConditions', {
      offline: false,
      latency: net ? net.latency : 0,
      downloadThroughput: net ? net.downloadThroughput : -1,
      uploadThroughput: net ? net.uploadThroughput : -1,
    });

    for (let rep = 1; rep <= repeats; rep++) {
      // Reversed arm order on even repeats, so a drift in machine state is not
      // baked into one arm.
      const ordered = (rep % 2 === 0 ? [...ARMS].reverse() : ARMS)
        .filter(arm => !armOnly || armOnly.has(arm.id))
        .filter(arm => !arm.devices || arm.devices.includes(device.id));
      for (const arm of ordered) {
        blanked = new Set(arm.blank ?? []);
        overrides = new Map(Object.entries(typeof arm.replace === 'function' ? arm.replace() : arm.replace ?? {}));
        let hook = null;
        if (arm.css || arm.swallowTransform || arm.transientHint || arm.visibleHint) {
          // Probe-side page hook: an arm may drop the authored mask, freeze the
          // torus transform or own a hint by motion lifetime. Nothing here is
          // written into the built page.
          const { identifier } = await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
            document.addEventListener('DOMContentLoaded', () => {
              ${arm.css ? `{ const style = document.createElement('style');
                style.textContent = ${JSON.stringify(arm.css)}; document.head.append(style); }` : ''}
              ${arm.swallowTransform ? `{ const torus = document.querySelector('[data-stage-torus]');
                if (torus) Object.defineProperty(torus.style, 'transform', { configurable: true, get: () => '', set() {} }); }` : ''}
              ${arm.transientHint ? `{ const target = document.querySelector('.experiences-gathering-thought');
                let timer = 0;
                if (target) addEventListener('scroll', () => {
                  target.style.willChange = 'transform';
                  clearTimeout(timer);
                  timer = setTimeout(() => { target.style.willChange = ''; }, 200);
                }, { passive: true }); }` : ''}
              ${arm.visibleHint ? `{ const target = document.querySelector('.experiences-gathering-thought');
                const overture = document.querySelector('.experiences-overture');
                if (target && overture) {
                  // The page loads with the overture on screen, so the hint starts
                  // present; intersection only has to remove it when it scrolls away.
                  target.style.willChange = 'transform';
                  new IntersectionObserver(entries => {
                    target.style.willChange = entries.some(entry => entry.isIntersecting) ? 'transform' : '';
                  }, { threshold: 0 }).observe(overture);
                } }` : ''}
            });
          ` });
          hook = identifier;
        }
        await page.s('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-motion', value: arm.media ?? 'no-preference' }],
        });
        const errorOffset = page.console.length;
        await loadPage();

        // Correctness of the arm itself: an ablation must keep the authored still.
        const stationaryStart = performance.now();
        await page.evaluate('window.__xp.recording = true');
        await wait(2200);
        // LCP entries keep arriving until a trusted input ends the window, so
        // end it explicitly instead of reading a timeout-truncated maximum.
        // A bare Shift keydown finalises LCP and has no page effect.
        await page.s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
        await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft', windowsVirtualKeyCode: 16 });
        await wait(60);
        const stationaryMs = performance.now() - stationaryStart;
        const stationary = await readSnapshot('stationary');
        if (arm.id === 'shipped') {
          assert.ok(stationary.arcState.live && stationary.arcState.canvasVisible === 'visible',
            'shipped overture canvas must be live');
          assert.equal(stationary.arcState.stageState, 'moving', 'shipped overture clock is running');
        }
        if (arm.id === 'still') {
          // Reduced motion still reaches the authored resting frame, but through
          // one draw on arrival, not a clock: no per-frame canvas work, no ink writes.
          assert.equal(stationary.arcState.stageState, 'still', 'still arm latches the resting state');
          assert.equal(stationary.draws, 0, 'still arm draws no per-frame canvas');
          assert.equal(stationary.customPropertyWrites, 0, 'still arm writes no per-frame ink');
        }
        if (arm.id === 'no-clocks') {
          // Not a no-JavaScript arm: navigation and media scripts still run.
          assert.ok(!stationary.arcState.live, 'no-clocks leaves the authored SVG arcs, not a canvas');
          assert.equal(stationary.arcState.svgVisible, 'visible', 'no-clocks keeps the authored SVG arcs visible');
        }
        if (arm.id === 'no-stage') {
          assert.ok(!stationary.arcState.live, 'no-stage leaves the authored arcs still');
          assert.equal(stationary.arcState.svgVisible, 'visible', 'no-stage still shows the authored arcs');
        }
        // Hint identity is checked here, while the hero is still on screen: the
        // later seam scroll takes the overture offscreen, so an intersection-owned
        // hint is legitimately absent by then.
        if (arm.id === 'will-change' || arm.id === 'will-change-visible') {
          assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.experiences-gathering-thought')).willChange`),
            'transform', `${arm.id} hint is applied while the overture is visible`);
        }
        if (arm.transientHint) {
          assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.experiences-gathering-thought')).willChange`),
            'auto', 'scroll-only hint is absent at rest, by design');
        }
        assert.ok(stationary.lcp, `${device.id}/${arm.id} produced an LCP entry`);
        assert.ok(stationary.lcp.time > 0);

        // Native gestures, not scrollTo: two trusted wheel gestures drive the
        // reading clock back and forth through the seam and its tree.
        const startY = await page.evaluate('scrollY');
        const seamTop = await page.evaluate(`(() => { const e = document.querySelector('.experiences-seam-field');
          return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; })()`);
        const distance = Math.max(300, Math.min(1400, Math.round((seamTop ?? 2000) - startY - (device.height * .5))));
        // A phone claim needs a touch stream: synthesizeScrollGesture's touch
        // source does not scroll this page, so the phone arm dispatches real
        // touch points. Desktop stays on the trusted wheel gesture.
        const gestureSourceType = device.id === 'phone' ? 'touch' : 'mouse';
        const gestureMechanism = device.id === 'phone' ? 'Input.dispatchTouchEvent' : 'Input.synthesizeScrollGesture';
        const x = Math.round(device.width * .5);
        const swipe = async dy => {
          if (device.id === 'phone') {
            const travel = Math.min(Math.abs(dy), Math.round(device.height * .6));
            const start = dy < 0 ? Math.round(device.height * .8) : Math.round(device.height * .2);
            const end = dy < 0 ? start - travel : start + travel;
            const steps = 14;
            await page.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] });
            for (let step = 1; step <= steps; step++) {
              await page.s('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: Math.round(start + (end - start) * step / steps) }],
              });
              await wait(18);
            }
            await page.s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            return;
          }
          await page.s('Input.synthesizeScrollGesture', {
            x, y: Math.round(device.height * .6), yDistance: dy, speed: 700, gestureSourceType,
          });
        };
        await swipe(-distance);
        await wait(220);
        const downY = await page.evaluate('scrollY');
        await swipe(distance);
        await wait(220);
        const upY = await page.evaluate('scrollY');
        assert.ok(Math.abs(downY - startY) > 30, `${arm.id}: forward native gesture must move the page`);
        assert.ok(Math.abs(upY - downY) > 30, `${arm.id}: reverse native gesture must move the page`);
        const scrolled = await readSnapshot('scroll');

        // Reversal is a correctness claim, tested separately from frame cost:
        // park the seam at centre and above it with a direct scroll, which the
        // shared scroll clock serves exactly like a native one.
        const seamReached = await page.evaluate(`(() => {
          const seam = document.querySelector('.experiences-seam-field');
          // Growth and canopy are keyed to the "gathering" phrase's own centre,
          // not to the seam frame: park that phrase just above half screen.
          const gather = document.querySelector('[data-stage-focus="gather"]');
          if (!seam || !gather) return null;
          const box = gather.getBoundingClientRect();
          const y = box.top + scrollY + box.height * .5 - innerHeight * .45;
          scrollTo({ top: y, behavior: 'instant' });
          return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve({
            // Re-read after the scroll: the fraction that matters is the phrase's
            // position in the viewport in the frame that painted the tree.
            phraseAtFraction: +((gather.getBoundingClientRect().top + gather.getBoundingClientRect().height * .5) / innerHeight).toFixed(3),
            growth: getComputedStyle(seam).getPropertyValue('--tree-growth').trim(),
            canopy: getComputedStyle(seam).getPropertyValue('--tree-canopy').trim(),
          }))));
        })()`);
        const seamAbove = await page.evaluate(`(() => {
          const seam = document.querySelector('.experiences-seam-field');
          const gather = document.querySelector('[data-stage-focus="gather"]');
          if (!seam || !gather) return null;
          const box = gather.getBoundingClientRect();
          // Below the completion threshold the same phrase must read as bare wood
          // again, so a reverse scroll retraces instead of snapping to complete.
          const y = box.top + scrollY + box.height * .5 - innerHeight * .78;
          scrollTo({ top: y, behavior: 'instant' });
          return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve({
            growth: getComputedStyle(seam).getPropertyValue('--tree-growth').trim(),
            canopy: getComputedStyle(seam).getPropertyValue('--tree-canopy').trim(),
          }))));
        })()`);
        if (arm.visibleHint) {
          // Offscreen is the other half of motion-lifetime ownership. Park the
          // reader well past the hero, not merely past the seam phrase: the seam
          // sits at the viewport edge while the overture is still on screen.
          await page.evaluate(`(() => { const hero = document.querySelector('.experiences-overture');
            scrollTo({ top: hero.getBoundingClientRect().height + 400, behavior: 'instant' }); })()`);
          await wait(220);
          assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.experiences-gathering-thought')).willChange`),
            'auto', 'visible-lifetime hint is removed while the overture is offscreen');
        }
        await page.evaluate('scrollTo({ top: 0, behavior: "instant" })');
        await wait(80);

        if (arm.swallowTransform) {
          // The hook must be installed, or the arm is silently the shipped page.
          assert.ok(await page.evaluate(`(() => { const torus = document.querySelector('[data-stage-torus]');
            return Boolean(torus && Object.getOwnPropertyDescriptor(torus.style, 'transform')); })()`),
            'no-transform hook is installed on the torus style object');
        }
        if (arm.id === 'canvas-hidden') {
          assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('[data-stage-arcs]')).visibility`),
            'hidden', 'canvas-hidden suppresses the canvas surface');
        }
        if (arm.id === 'canvas-half') {
          // Prove the substitution landed: backing store halved, clock still running.
          assert.equal(stationary.arcState.stageState, 'moving', 'canvas-half keeps the clock');
          assert.ok(stationary.arcState.canvasPixels[0] < device.width * .6,
            `canvas-half halves the canvas backing store (${stationary.arcState.canvasPixels})`);
        }
        if (arm.id === 'draw-detached') {
          assert.equal(stationary.arcState.stageState, 'moving', 'draw-detached keeps the clock');
          assert.equal(stationary.draws, 0, 'draw-detached never touches the visible canvas');
        }
        if (arm.id === 'draw-1' || arm.id === 'canvas-hidden') {
          assert.ok(stationary.draws > 0, `${arm.id} keeps the per-frame clearRect cadence`);
        }
        if (arm.id === 'no-arcs') {
          assert.equal(stationary.arcState.stageState, 'moving', 'no-arcs keeps the overture clock');
          assert.equal(stationary.draws, 0, 'no-arcs removes the canvas raster, not the clock');
        }
        if (arm.id === 'no-mask' || arm.id === 'no-transform') {
          assert.equal(stationary.arcState.stageState, 'moving', `${arm.id} keeps the overture clock`);
          assert.ok(stationary.draws > 0, `${arm.id} still draws the canvas`);
        }
        // Byte-identical still, or the hint changed the representation.
        let still = null;
        if (arm.pixelGate || arm.id === 'shipped') {
          still = await stillHash(arm.id);
          const reference = stillReferences.get(device.id);
          if (reference === undefined) stillReferences.set(device.id, still);
          else {
            const mismatched = [];
            if (still.still !== reference.still) mismatched.push('still');
            for (let pose = 0; pose < POSE_TRANSFORMS.length; pose++) {
              if (still.poses[pose] !== reference.poses[pose]) mismatched.push(`pose${pose}:${POSE_TRANSFORMS[pose]}`);
            }
            if (mismatched.length && pixelGateStrict) {
              assert.deepEqual(mismatched, [], `${device.id}/${arm.id} changed pixels at ${mismatched.join(', ')}`);
            }
            still.mismatched = mismatched;
          }
        }
        if (hook) await page.s('Page.removeScriptToEvaluateOnNewDocument', { identifier: hook }).catch(() => {});
        const exceptions = page.console.slice(errorOffset).filter(e => e.type === 'exception');
        assert.deepEqual(exceptions, [], `${device.id}/${arm.id}: no runtime exceptions`);

        if (arm.id === 'shipped' && seamReached) {
          assert.equal(Number(seamReached.growth), 1, 'tree completes when the phrase is at centre');
          assert.equal(Number(seamReached.canopy), 1, 'canopy completes with the wood');
          assert.ok(Number(seamAbove.growth) < 1, 'above the seam the tree is still partial, so reversal retraces');
          assert.ok(scrolled.customPropertyWrites > 0, 'native gesture drives demand-driven ink writes');
        }
        if ((arm.id === 'still' || arm.id === 'no-clocks' || arm.id === 'no-focus') && seamReached) {
          // Nothing writes the property, so it is unset and the authored CSS
          // fallback `var(--tree-growth, 1)` / `var(--tree-canopy, 1)` renders
          // the complete still. The custom-property value itself cannot show 1.
          assert.equal(seamReached.growth, '', `${arm.id} leaves --tree-growth unset (CSS fallback 1)`);
          assert.equal(seamReached.canopy, '', `${arm.id} leaves --tree-canopy unset (CSS fallback 1)`);
          assert.equal(scrolled.customPropertyWrites, 0, `${arm.id} writes nothing while scrolling`);
        }

        const row = {
          device: device.id, arm: arm.id, rep,
          load: {
            ttfb: stationary.ttfb, fcp: stationary.fcp, lcp: stationary.lcp.time,
            domContentLoaded: stationary.domContentLoaded, load: stationary.load,
            bytes: stationary.bytes, requests: stationary.requests, fonts: stationary.fonts,
          },
          lcp: stationary.lcp,
          arrival: stationary.arrival,
          renderAfterArrival: stationary.arrival && stationary.lcp
            ? +(stationary.lcp.time - stationary.arrival.end).toFixed(1) : null,
          stationary: {
            frames: stats(stationary.frames), draws: stationary.draws, elapsedMs: Math.round(stationaryMs),
            drawsPerSecond: +(stationary.draws / (stationaryMs / 1000)).toFixed(1),
            customPropertyWrites: stationary.customPropertyWrites,
            loaf: {
              count: stationary.loaf.length,
              script: +stationary.loaf.reduce((s, e) => s + e.script, 0).toFixed(1),
              render: +stationary.loaf.reduce((s, e) => s + e.render, 0).toFixed(1),
              styleLayout: +stationary.loaf.reduce((s, e) => s + e.styleLayout, 0).toFixed(1),
            },
            longTasks: stationary.longTasks.length,
          },
          scroll: {
            frames: stats(scrolled.frames), customPropertyWrites: scrolled.customPropertyWrites,
            gestureSourceType, gestureMechanism,
            displacement: [Math.round(downY - startY), Math.round(upY - downY)],
            loaf: {
              count: scrolled.loaf.length,
              script: +scrolled.loaf.reduce((s, e) => s + e.script, 0).toFixed(1),
              render: +scrolled.loaf.reduce((s, e) => s + e.render, 0).toFixed(1),
              styleLayout: +scrolled.loaf.reduce((s, e) => s + e.styleLayout, 0).toFixed(1),
            },
            longTasks: scrolled.longTasks.length,
          },
          seam: seamReached && { reached: seamReached, above: seamAbove },
          arcState: stationary.arcState,
          stillHash: still,
          note: arm.note,
        };
        rows.push(row);
        writeFileSync(`${out}/rows.json`, JSON.stringify({ base, frozen, rows }, null, 2));
        console.log(`${device.id} ${arm.id} #${rep} lcp ${row.load.lcp.toFixed(0)}ms ` +
          `frame p50 ${row.stationary.frames.p50} draws ${row.stationary.drawsPerSecond}/s ` +
          `scroll p50 ${row.scroll.frames.p50} ink writes ${row.scroll.customPropertyWrites}`);
      }
    }
  }

  // Probe overhead and compositor attribution: the tracer is a probe cost,
  // never a shipped cost. Trace one or more desktop arms into separate files.
  if (traced && devices.some(device => device.id === 'desktop')) {
    const device = devices.find(d => d.id === 'desktop');
    await page.s('Emulation.setDeviceMetricsOverride', {
      width: device.width, height: device.height, deviceScaleFactor: device.factor, mobile: false,
    });
    await page.s('Emulation.setCPUThrottlingRate', { rate: device.cpu });
    await page.s('Emulation.setTouchEmulationEnabled', { enabled: false });
    for (const id of traceArms) {
      const arm = ARMS.find(candidate => candidate.id === id);
      if (!arm) continue;
      blanked = new Set(arm.blank ?? []);
      overrides = new Map(Object.entries(arm.replace ?? {}));
      let hook = null;
      if (arm.css || arm.transientHint || arm.visibleHint || arm.swallowTransform) {
        const { identifier } = await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
          document.addEventListener('DOMContentLoaded', () => {
            ${arm.css ? `{ const style = document.createElement('style');
              style.textContent = ${JSON.stringify(arm.css)}; document.head.append(style); }` : ''}
            ${arm.transientHint ? `{ const target = document.querySelector('.experiences-gathering-thought');
              let timer = 0;
              if (target) addEventListener('scroll', () => {
                target.style.willChange = 'transform';
                clearTimeout(timer);
                timer = setTimeout(() => { target.style.willChange = ''; }, 200);
              }, { passive: true }); }` : ''}
            ${arm.visibleHint ? `{ const target = document.querySelector('.experiences-gathering-thought');
              const overture = document.querySelector('.experiences-overture');
              if (target && overture) {
                target.style.willChange = 'transform';
                new IntersectionObserver(entries => {
                  target.style.willChange = entries.some(entry => entry.isIntersecting) ? 'transform' : '';
                }, { threshold: 0 }).observe(overture);
              } }` : ''}
            ${arm.swallowTransform ? `{ const torus = document.querySelector('[data-stage-torus]');
              if (torus) Object.defineProperty(torus.style, 'transform', { configurable: true, get: () => '', set() {} }); }` : ''}
          });
        ` });
        hook = identifier;
      }
      await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
      await loadPage();
      const start = performance.now();
      await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink,cc,gpu,viz', transferMode: 'ReturnAsStream' });
      await page.evaluate('window.__xp.recording = true');
      await wait(2200);
      const stationary = await readSnapshot('stationary');
      const elapsed = performance.now() - start;
      const done = new Promise(resolve => cdp.on(m => { if (m.method === 'Tracing.tracingComplete') resolve(m.params.stream); }));
      await cdp.send('Tracing.end');
      const handle = await done;
      let data = '', part;
      do { part = await cdp.send('IO.read', { handle }); data += part.base64Encoded ? Buffer.from(part.data, 'base64').toString() : part.data; } while (!part.eof);
      await cdp.send('IO.close', { handle });
      writeFileSync(`${out}/trace-${id}.json`, data);
      if (hook) await page.s('Page.removeScriptToEvaluateOnNewDocument', { identifier: hook }).catch(() => {});
      rows.push({
        device: 'desktop', arm: `${id}+traced`, rep: 0, traced: true,
        stationary: { frames: stats(stationary.frames), draws: stationary.draws,
          elapsedMs: Math.round(elapsed),
          drawsPerSecond: +(stationary.draws / (elapsed / 1000)).toFixed(1),
          loaf: { count: stationary.loaf.length } },
        note: `stationary window with the tracer attached; compare with desktop/${id}`,
      });
    }
  }
} finally {
  await page.s('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  // Close the target, not just the socket: a live target keeps a renderer and
  // its compositor around and skews the next run.
  await cdp.send('Target.closeTarget', { targetId: page.targetId }).catch(() => {});
  cdp.close();
}

const median = values => {
  const sorted = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
};
const summary = [];
for (const device of devices) {
  for (const arm of ARMS) {
    const group = rows.filter(r => r.device === device.id && r.arm === arm.id && !r.traced);
    if (!group.length) continue;
    summary.push({
      device: device.id, arm: arm.id, reps: group.length,
      lcpMs: median(group.map(r => r.load.lcp)),
      lcpElement: group[0].lcp,
      lcpSource: group[0].lcp?.src ?? null,
      arrivalMs: median(group.map(r => r.arrival?.end ?? NaN)),
      renderAfterArrivalMs: median(group.map(r => r.renderAfterArrival ?? NaN)),
      bytes: median(group.map(r => r.load.bytes)),
      ttfbMs: median(group.map(r => r.load.ttfb)),
      fcpMs: median(group.map(r => r.load.fcp)),
      stationaryFrameP50: median(group.map(r => r.stationary.frames.p50)),
      stationaryFrameP95: median(group.map(r => r.stationary.frames.p95)),
      stationarySecondFrames: median(group.map(r => r.stationary.frames.secondFrames)),
      stationaryDrawsPerSecond: median(group.map(r => r.stationary.drawsPerSecond)),
      stationaryLongTasks: median(group.map(r => r.stationary.longTasks)),
      stationaryScriptMs: median(group.map(r => r.stationary.loaf.script)),
      scrollFrameP50: median(group.map(r => r.scroll.frames.p50)),
      scrollFrameP95: median(group.map(r => r.scroll.frames.p95)),
      scrollCustomPropertyWrites: median(group.map(r => r.scroll.customPropertyWrites)),
      scrollLongTasks: median(group.map(r => r.scroll.longTasks)),
    });
  }
}

const report = {
  base, frozen, repeats, traced,
  served_encoding: served,
  network_model: net ? { model: '4g', latencyMs: net.latency, downloadBps: net.downloadThroughput } : 'unthrottled localhost',
  environment: { browser,
    gpu,
    headlessSoftwareCompositor: true,
    note: 'headless Chromium with --disable-gpu; frame distributions are diagnostics, not device FPS. ' +
      'localhost with cache disabled is a cold server-speed bound, not a field network measurement. ' +
      'A permanent rAF monitor is part of the sampling path, so no arm can prove zero idle page work; ' +
      'the monitor sets the cadence floor and the counters are attribution only. ' +
      'customPropertyWrites counts CSSStyleDeclaration.setProperty, not direct style.transform assignments. ' +
      'Fetch interception is scoped to the two module URLs, so media Range responses are never paused.',
  },
  summary, rows,
};

// The report's browser provenance is fetched before the CDP socket closes.
console.log(JSON.stringify({ summary }, null, 2));
writeFileSync(`${out}/experiences-performance.json`, JSON.stringify(report, null, 2));
console.log(`raw rows: ${out}/experiences-performance.json`);
