import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { drawArcs } from '../../assets/js/experiences/arcs.mjs';

// Run the shipped stage module, not a second implementation of its lifecycle.
// Only its one renderer import is supplied by the harness. No timing/FPS claims.
function harness({ hidden = false, reduced = false, forced = false, saveData = false,
  width = 1440, height = 750, dpr = 2, contextAvailable = true } = {}) {
  const queue = new Map(), events = new Map(), queries = new Map();
  const counts = { draws: 0, measures: 0, transforms: 0, states: 0, sizes: 0, activations: 0 };
  let serial = 0, intersection, resize, transform = '';
  const target = () => {
    const listeners = new Map();
    return {
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(fn); },
      emit(type) { for (const fn of listeners.get(type) || []) fn(); },
    };
  };
  const window = target(), document = { ...target(), hidden };
  const connection = { ...target(), saveData };
  for (const [name, matches] of [['prefers-reduced-motion: reduce', reduced], ['forced-colors: active', forced]]) {
    queries.set(`(${name})`, { ...target(), matches });
  }
  const context = { setTransform() {}, clearRect() {}, setLineDash() {}, beginPath() {}, arc() {}, stroke() {}, fillRect() {} };
  const canvas = { parentElement: { classList: { add() { counts.activations++; } } }, getContext: () => contextAvailable ? context : null };
  for (const property of ['width', 'height']) {
    let value = 0;
    Object.defineProperty(canvas, property, { get: () => value, set(n) { value = n; counts.sizes++; } });
  }
  const torus = { style: {} };
  Object.defineProperty(torus.style, 'transform', { get: () => transform, set(value) { transform = value; counts.transforms++; } });
  const dataset = {};
  Object.defineProperty(dataset, 'stageState', { get: () => events.get('state'), set(value) { events.set('state', value); counts.states++; } });
  const root = { dataset,
    querySelector: selector => selector === '[data-stage-arcs]' ? canvas : torus,
    getBoundingClientRect() { counts.measures++; return { top: -sandbox.scrollY, width, height }; },
  };
  const sandbox = {
    document: Object.assign(document, { querySelector: () => root }),
    navigator: { connection }, matchMedia: name => queries.get(name),
    addEventListener: window.addEventListener,
    scrollY: 0, devicePixelRatio: dpr,
    requestAnimationFrame(fn) { queue.set(++serial, fn); return serial; },
    cancelAnimationFrame(id) { queue.delete(id); },
    IntersectionObserver: class { constructor(fn) { intersection = fn; } observe() {} },
    ResizeObserver: class { constructor(fn) { resize = fn; } observe() {} },
    drawArcs(...args) { counts.draws++; drawArcs(...args); },
  };
  const path = process.env.STAGE_SOURCE || new URL('../../assets/js/experiences/stage.mjs', import.meta.url);
  const source = readFileSync(path, 'utf8');
  assert.deepEqual([...source.matchAll(/^import .+ from '(.+)';$/gm)].map(m => m[1]), ['./arcs.mjs']);
  runInNewContext(source.replace(/^import .+ from '.+';$/m, ''), sandbox);
  return { queue, counts, canvas, torus, dataset, sandbox,
    emit: type => window.emit(type),
    visibility(value) { document.hidden = value; document.emit('visibilitychange'); },
    preference(name, value) { const query = queries.get(`(${name})`); query.matches = value; query.emit('change'); },
    connection(value) { connection.saveData = value; connection.emit('change'); },
    intersect(value) { intersection([{ isIntersecting: value }]); },
    resize(nextWidth = width, nextHeight = height) { width = nextWidth; height = nextHeight; resize(); },
    flush(now = 16) { const batch = [...queue.values()]; queue.clear(); for (const fn of batch) fn(now); },
  };
}

test('visible motion owns one frame and no steady geometry reads', () => {
  const h = harness();
  assert.equal(h.queue.size, 1);
  const reads = h.counts.measures;
  for (let i = 1; i <= 10; i++) { h.flush(i * 16); assert.equal(h.queue.size, 1); }
  assert.equal(h.counts.measures, reads);
});

test('an affordable frame presents even when the arcs barely moved', () => {
  const h = harness();
  h.flush(16);
  const draws = h.counts.draws;
  for (let i = 2; i <= 6; i++) h.flush(i * 16);
  assert.equal(h.counts.draws, draws + 5, '60Hz keeps presenting the breathing arcs');
});

test('a resting slow cadence coalesces to visible steps', () => {
  const h = harness();
  h.flush(16);
  const draws = h.counts.draws;
  const wound = h.torus.style.transform;
  h.flush(49);
  h.flush(82);
  assert.equal(h.counts.draws, draws, '33 ms frames do not clear for sub-visible motion');
  assert.notEqual(h.torus.style.transform, wound, 'the torus keeps winding between presents');
  h.flush(115);
  assert.equal(h.counts.draws, draws + 1, 'the third 33 ms frame owes a visible step');
  assert.equal(h.queue.size, 1);
});

test('a scroll presents on its own frame', () => {
  const h = harness();
  h.flush(16);
  const draws = h.counts.draws;
  h.sandbox.scrollY = 80;
  h.flush(32);
  assert.equal(h.counts.draws, draws + 1);
});

test('a 30Hz scroll presents both the torus and the arcs', () => {
  // A browser-selected 30 Hz cadence is not overload. The frame is slow, so the
  // step, not the clock, must decide: neither the unwind nor the arcs may freeze.
  const h = harness();
  h.flush(16);
  h.sandbox.scrollY = 200;
  h.flush(49);
  const drawn = h.counts.draws;
  const wound = h.torus.style.transform;
  h.sandbox.scrollY = 320;
  h.flush(82);
  assert.ok(h.counts.draws > drawn, 'a slow frame does not drop the arc it moved');
  assert.notEqual(h.torus.style.transform, wound);
  assert.equal(h.dataset.stageState, 'moving');
  assert.equal(h.queue.size, 1);
});

test('a fling presents every frame it moves', () => {
  const h = harness();
  h.flush(16);
  h.sandbox.scrollY = 400;
  h.flush(32);
  const draws = h.counts.draws;
  for (let i = 3; i <= 6; i++) h.flush(i * 16);
  assert.equal(h.counts.draws, draws + 4);
});

test('sustained 30Hz frames keep the wind instead of latching a still', () => {
  // Wall-clock misses cannot tell a 30 Hz cadence or a long task from incapable
  // hardware, so they must never buy a permanent still.
  const h = harness();
  h.flush(16);
  const drawn = h.counts.draws;
  let now = 16;
  for (let i = 0; i < 12; i++) h.flush(now += 33);
  assert.equal(h.queue.size, 1, 'the clock is never abandoned for a slow cadence');
  assert.equal(h.dataset.stageState, 'moving');
  assert.notEqual(h.torus.style.transform, '');
  assert.ok(h.counts.draws > drawn, 'the arcs still reach the canvas');
});

test('stable motion does not rewrite its diagnostic state every frame', () => {
  const h = harness(), writes = h.counts.states;
  for (let i = 1; i <= 10; i++) h.flush(i * 16);
  assert.equal(h.counts.states, writes);
});

test('the canvas live class is activated once, not rewritten every frame', () => {
  const h = harness();
  for (let i = 1; i <= 10; i++) h.flush(i * 16);
  h.preference('prefers-reduced-motion: reduce', true);
  assert.equal(h.counts.activations, 1);
});

test('a still returning from offscreen measures the current responsive frame', () => {
  const h = harness({ width: 1440, height: 750, dpr: 1 });
  h.intersect(false);
  h.preference('prefers-reduced-motion: reduce', true);
  h.resize(390, 640);
  h.intersect(true);
  assert.equal(h.queue.size, 0);
  assert.equal(h.canvas.width, 390);
  assert.equal(h.canvas.height, 640);
});

test('offscreen motion stops and arrival resumes one clock', () => {
  const h = harness();
  h.intersect(false);
  assert.equal(h.queue.size, 0);
  const draws = h.counts.draws;
  h.resize(); h.flush();
  assert.equal(h.counts.draws, draws);
  h.intersect(true); h.emit('pageshow');
  assert.equal(h.queue.size, 1);
  h.flush(); assert.equal(h.queue.size, 1);
});

test('hidden tab stays silent through resize and preference callbacks', () => {
  const h = harness(); h.visibility(true);
  const before = { ...h.counts };
  h.resize(); h.preference('prefers-reduced-motion: reduce', true); h.connection(true);
  assert.equal(h.queue.size, 0);
  assert.equal(h.counts.draws, before.draws);
  assert.equal(h.counts.measures, before.measures);
  h.visibility(false);
  assert.ok(h.counts.draws > before.draws, 'restore paints the complete still');
  assert.equal(h.queue.size, 0);
});

test('initially hidden document defers drawing and geometry until restoration', () => {
  const h = harness({ hidden: true });
  assert.equal(h.queue.size, 0);
  assert.equal(h.counts.draws, 0);
  assert.equal(h.counts.measures, 0);
  h.visibility(false);
  assert.equal(h.queue.size, 1);
  assert.ok(h.counts.draws > 0);
});

test('pagehide latches suspension despite observer, connection and visibility callbacks', () => {
  const h = harness(); h.emit('pagehide');
  const before = { ...h.counts };
  h.intersect(false); h.intersect(true); h.resize(); h.connection(false); h.visibility(false);
  assert.equal(h.queue.size, 0);
  assert.equal(h.counts.draws, before.draws);
  assert.equal(h.counts.measures, before.measures);
  h.emit('pageshow');
  assert.equal(h.queue.size, 1);
  h.flush(); assert.ok(h.counts.draws > before.draws);
});

for (const gate of ['reduced', 'saveData', 'forced']) {
  test(`${gate} starts without a continuous animation clock`, () => {
    const h = harness({ [gate]: true });
    assert.equal(h.queue.size, 0);
    assert.equal(h.torus.style.transform, '');
    if (gate !== 'forced') assert.equal(h.counts.draws, 1);
  });
}

test('live motion preferences settle the pose, then restore one clock', () => {
  const h = harness(); h.flush(16); h.flush(32);
  assert.notEqual(h.torus.style.transform, '');
  h.preference('prefers-reduced-motion: reduce', true);
  assert.equal(h.queue.size, 0); assert.equal(h.torus.style.transform, '');
  const draws = h.counts.draws;
  h.sandbox.scrollY = 200; h.flush(48);
  assert.equal(h.counts.draws, draws);
  h.preference('prefers-reduced-motion: reduce', false);
  assert.equal(h.queue.size, 1);
});

test('canvas storage stays bounded on wide and high-density viewports', () => {
  for (const [width, height, dpr] of [[390, 844, 3], [1440, 750, 2], [3840, 2160, 3]]) {
    const h = harness({ width, height, dpr });
    // Independent integer rounding of width/height may exceed the continuous cap slightly.
    assert.ok(h.canvas.width * h.canvas.height <= 2_003_000);
    const sizes = h.counts.sizes;
    h.flush(16); h.flush(32);
    assert.equal(h.counts.sizes, sizes, 'steady animation does not reallocate its backing store');
  }
});

test('a missing canvas context retains the picture and torus without throwing', () => {
  const h = harness({ contextAvailable: false });
  h.flush(16); h.flush(32);
  assert.equal(h.counts.draws, 0);
  assert.notEqual(h.torus.style.transform, '');
  h.intersect(false); assert.equal(h.queue.size, 0);
});
