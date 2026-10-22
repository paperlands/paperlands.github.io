import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the actual browser module, with a deterministic event loop and DOM.
function harness({ nativeErrors = true } = {}) {
  let hidden = false, next = 0;
  const queue = new Map(), events = new Map(), observed = new Set(), errors = [], timers = [];
  const observations = new Map(), releases = new Map(), reads = {};
  const viewport = { scrollY: 0, innerHeight: 900, innerWidth: 1440 };
  const root = {};
  const listen = (type, fn) => {
    if (!events.has(type)) events.set(type, []);
    events.get(type).push(fn);
  };
  const fonts = { ready: new Promise(() => {}), addEventListener: listen };
  const context = {
    document: { get hidden() { return hidden; }, fonts, body: root,
      querySelector: () => root, addEventListener: listen },
    addEventListener: listen,
    requestAnimationFrame: fn => { queue.set(++next, fn); return next; },
    cancelAnimationFrame: id => queue.delete(id),
    setTimeout: fn => timers.push(fn),
    ...(nativeErrors ? { reportError: error => errors.push(error) } : {}),
    ResizeObserver: class {
      constructor(fn) { context.resize = fn; }
      observe(el) { observed.add(el); observations.set(el, (observations.get(el) || 0) + 1); }
      unobserve(el) { observed.delete(el); releases.set(el, (releases.get(el) || 0) + 1); }
      disconnect() { observed.clear(); }
    },
  };
  for (const key of Object.keys(viewport)) Object.defineProperty(context, key, {
    get() { reads[key] = (reads[key] || 0) + 1; return viewport[key]; },
    set(value) { viewport[key] = value; },
  });
  const path = process.env.SCROLL_CLOCK_SOURCE || new URL('../../assets/js/home/scroll-clock.mjs', import.meta.url);
  const source = readFileSync(path, 'utf8');
  assert.doesNotMatch(source, /^\s*import\b/m, 'the vm harness requires an import-free clock');
  assert.deepEqual([...source.matchAll(/^export function (\w+)/gm)].map(match => match[1]).sort(), ['invalidate', 'schedule', 'subscribe']);
  runInNewContext(source.replace(/^export /gm, '') + '\nglobalThis.api = { subscribe, schedule, invalidate };', context);
  for (const key of Object.keys(reads)) reads[key] = 0;
  return { ...context.api, queue, observed, observations, releases, reads, root, errors, timers, context,
    emit(type) { for (const fn of events.get(type) || []) fn(); },
    visibility(value) { hidden = value; this.emit('visibilitychange'); },
    flush() { const batch = [...queue.values()]; queue.clear(); for (const fn of batch) fn(); },
  };
}

test('bursts coalesce; every measurement precedes every paint; idle is silent', () => {
  const h = harness(), calls = [];
  for (const key of ['a', 'b']) h.subscribe({
    measure: (...state) => calls.push(['measure', key, ...state]),
    paint: (...state) => calls.push(['paint', key, ...state]),
  });
  for (let n = 0; n < 100; n++) h.invalidate();
  assert.equal(h.queue.size, 1); h.flush();
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [['measure', 'a'], ['measure', 'b'], ['paint', 'a'], ['paint', 'b']]);
  assert.equal(h.queue.size, 0);
  calls.length = 0;
  h.context.scrollY = 123; h.emit('scroll'); h.emit('scroll'); h.flush();
  assert.deepEqual(calls.map(call => call.slice(0, 2)), [['paint', 'a'], ['paint', 'b']]);
  assert.ok(calls.every(call => call[2] === 123));
  assert.equal(h.queue.size, 0);
});

test('invalidation during measurement survives into a second measured frame', () => {
  const h = harness(); let measures = 0;
  h.subscribe({ measure() { if (++measures === 1) h.invalidate(); }, paint() {} });
  h.flush(); assert.equal(h.queue.size, 1); h.flush();
  assert.equal(measures, 2);
  assert.equal(h.queue.size, 0);
});

test('a client added during paint cannot measure after another client wrote', () => {
  const h = harness(), calls = []; let added = false;
  h.subscribe({ measure: () => calls.push('measure a'), paint() {
    calls.push('paint a');
    if (!added) { added = true; h.subscribe({ measure: () => calls.push('measure b'), paint: () => calls.push('paint b') }); }
  } });
  h.flush(); assert.deepEqual(calls, ['measure a', 'paint a']);
  calls.length = 0; h.flush();
  assert.deepEqual(calls, ['measure a', 'measure b', 'paint a', 'paint b']);
});

test('unsubscribe before a turn prevents callbacks and releases only owned targets', () => {
  const h = harness(), shared = {}, a = {}, b = {}, calls = [];
  const disposeA = h.subscribe({ paint: () => calls.push('a') }, [a, shared, shared]);
  const disposeB = h.subscribe({ paint: () => calls.push('b') }, [b, shared]);
  disposeA(); disposeA();
  assert.ok(!h.observed.has(a));
  assert.ok(h.observed.has(b) && h.observed.has(shared) && h.observed.has(h.root));
  h.flush(); assert.deepEqual(calls, ['b']);
  h.invalidate(); disposeB();
  assert.equal(h.queue.size, 0); assert.equal(h.observed.size, 0);
  h.emit('scroll'); h.emit('resize'); h.schedule();
  assert.equal(h.queue.size, 0, 'no callbacks without subscribers');
});

test('removal during measurement prevents the removed client from painting', () => {
  const h = harness(), calls = []; let dispose;
  h.subscribe({ measure: () => dispose(), paint: () => calls.push('a') });
  dispose = h.subscribe({ measure: () => calls.push('measure b'), paint: () => calls.push('paint b') });
  h.flush(); assert.deepEqual(calls, ['a']);
});

test('hidden and page-hidden documents stay dormant until an explicit restore', () => {
  const h = harness(); let paints = 0, measures = 0;
  h.subscribe({ measure: () => measures++, paint: () => paints++ });
  h.visibility(true); h.invalidate(); h.emit('scroll');
  assert.equal(h.queue.size, 0);
  h.visibility(false); assert.equal(h.queue.size, 1); h.flush();
  assert.equal(paints, 1); assert.equal(measures, 1);
  h.emit('pagehide'); h.schedule(); h.invalidate();
  assert.equal(h.queue.size, 0, 'pagehide also blocks async completions');
  h.emit('pageshow'); h.flush();
  assert.equal(paints, 2); assert.equal(measures, 2);
});

test('one broken subscriber is reported without starving independent clients', () => {
  const h = harness(), calls = [];
  h.subscribe({ measure() { throw new Error('broken measure'); }, paint: () => calls.push('unsafe paint') });
  h.subscribe({ paint() { throw new Error('broken paint'); } });
  h.subscribe({ measure: () => calls.push('measure good'), paint: () => calls.push('paint good') });
  h.flush();
  assert.deepEqual(calls, ['measure good', 'paint good']);
  assert.equal(h.errors.length, 2);
  assert.equal(h.queue.size, 0, 'errors do not create a retry loop');
});

test('measure-only and paint-only subscriptions work independently', () => {
  const h = harness(), calls = [];
  h.subscribe({ measure: () => calls.push('measure') });
  h.subscribe({ paint: () => calls.push('paint') });
  h.flush(); assert.deepEqual(calls, ['measure', 'paint']);
  calls.length = 0; h.schedule(); h.flush(); assert.deepEqual(calls, ['paint']);
});

test('removal wins even after the removed client was measured', () => {
  for (const phase of ['measure', 'paint']) {
    const h = harness(), calls = []; let dispose;
    const first = { measure: () => calls.push('measure first'), paint: () => calls.push('paint first') };
    const second = { [phase]: () => dispose(), paint: phase === 'paint' ? () => dispose() : () => calls.push('paint second') };
    dispose = h.subscribe(first); h.subscribe(second); h.flush();
    assert.ok(calls.includes('measure first'));
    assert.equal(calls.includes('paint first'), phase === 'paint');
  }
  const h = harness(), calls = []; let dispose;
  h.subscribe({ paint: () => dispose() });
  dispose = h.subscribe({ measure: () => calls.push('measure'), paint: () => calls.push('paint') });
  h.flush(); assert.deepEqual(calls, ['measure']);
});

test('failed measurements skip paint until invalidation recovers; errors report once', () => {
  const h = harness(), calls = []; let broken = true;
  h.subscribe({ measure() { if (broken) throw new Error('measure'); }, paint: () => calls.push('recovered') });
  h.subscribe({ paint() { calls.push('throws'); throw new Error('paint'); } });
  h.subscribe({ paint: () => calls.push('good') });
  h.flush(); h.schedule(); h.flush(); h.invalidate(); h.flush();
  assert.equal(h.errors.length, 2);
  assert.deepEqual(calls, ['throws','good','throws','good','throws','good']);
  broken = false; calls.length = 0; h.invalidate(); h.flush();
  assert.deepEqual(calls, ['recovered','throws','good']);
  assert.equal(h.errors.length, 2);
  assert.equal(h.queue.size, 0);
});

test('the async error fallback preserves peers without native reportError', () => {
  const h = harness({ nativeErrors: false }); let painted = 0;
  h.subscribe({ paint() { throw new Error('expected async report'); } });
  h.subscribe({ paint: () => painted++ }); h.flush();
  assert.equal(painted, 1); assert.equal(h.timers.length, 1);
  assert.throws(h.timers[0], /expected async report/);
});

test('viewport state is captured once, never re-read in a paint-only frame', () => {
  const h = harness(), states = []; let first = true;
  h.subscribe({ measure(y) { if (first) { first = false; h.context.scrollY = 50; h.emit('scroll'); } },
    paint: (...state) => states.push(state) });
  h.subscribe({ paint: (...state) => states.push(state) });
  h.flush();
  assert.deepEqual(states, [[0,900,1440],[0,900,1440]]);
  assert.deepEqual(h.reads, { scrollY: 2, innerHeight: 1, innerWidth: 1 }); // frame capture + native scroll event
  for (const key of Object.keys(h.reads)) h.reads[key] = 0;
  h.flush(); assert.deepEqual(states.slice(-2), [[50,900,1440],[50,900,1440]]);
  assert.deepEqual(h.reads, { scrollY: 0, innerHeight: 0, innerWidth: 0 });
});

test('cancel pending work on pagehide or hidden; restore uses latest native position', () => {
  for (const kind of ['page', 'visibility']) {
    const h = harness(), positions = [];
    h.subscribe({ paint: y => positions.push(y) }); assert.equal(h.queue.size, 1);
    if (kind === 'page') h.emit('pagehide'); else h.visibility(true);
    assert.equal(h.queue.size, 0);
    h.context.scrollY = 500; h.emit('scroll'); h.schedule(); assert.equal(h.queue.size, 0);
    if (kind === 'page') h.emit('pageshow'); else h.visibility(false);
    assert.equal(h.queue.size, 1); h.flush(); assert.deepEqual(positions, [500]);
  }
});

test('reentrant demand from both phases coalesces into one next frame', () => {
  for (const request of ['schedule', 'invalidate']) {
    const h = harness(); let measures = 0, paints = 0;
    h.subscribe({ measure() { measures++; }, paint() { if (++paints === 1) for (let n = 0; n < 100; n++) h[request](); } });
    h.flush(); assert.equal(h.queue.size, 1); h.flush();
    assert.equal(paints, 2); assert.equal(measures, request === 'invalidate' ? 2 : 1);
    assert.equal(h.queue.size, 0);
  }
});

test('subscribe during measurement defers the entire new client to the next frame', () => {
  const h = harness(), calls = []; let added = false;
  h.subscribe({ measure() { calls.push('measure a'); if (!added) { added = true;
    h.subscribe({ measure: () => calls.push('measure b'), paint: () => calls.push('paint b') });
    for (let n = 0; n < 100; n++) h.invalidate();
  } }, paint: () => calls.push('paint a') });
  h.flush(); assert.deepEqual(calls, ['measure a', 'paint a']); assert.equal(h.queue.size, 1);
  calls.length = 0; h.flush();
  assert.deepEqual(calls, ['measure a','measure b','paint a','paint b']); assert.equal(h.queue.size, 0);
});

test('duplicate subscriptions have independent lifetimes and shared observation ownership', () => {
  const h = harness(), element = {}; let paints = 0;
  const client = { paint: () => paints++ };
  const a = h.subscribe(client, [element, element]), b = h.subscribe(client, [element]);
  assert.equal(h.observations.get(element), 1); assert.equal(h.observations.get(h.root), 1);
  h.flush(); assert.equal(paints, 2); a(); a();
  assert.equal(h.releases.get(element), undefined);
  h.schedule(); h.flush(); assert.equal(paints, 3); b();
  assert.equal(h.releases.get(element), 1); assert.equal(h.releases.get(h.root), 1);
  const c = h.subscribe(client, [element]); h.flush(); assert.equal(paints, 4);
  assert.equal(h.observations.get(element), 2); c();
});

test('geometry signals measure once; ordinary scroll and completion demand only paint', () => {
  const h = harness(); let measures = 0, paints = 0;
  h.subscribe({ measure: () => measures++, paint: () => paints++ }); h.flush();
  for (const signal of ['resize', 'load', 'pageshow', 'loadingdone']) {
    const before = measures;
    h.emit(signal); h.emit(signal); assert.equal(h.queue.size, 1); h.flush();
    assert.equal(measures, before + 1);
  }
  h.context.resize(); h.flush(); assert.equal(measures, 6);
  h.emit('scroll'); h.schedule(); h.flush(); assert.equal(measures, 6); assert.equal(paints, 7);
});
