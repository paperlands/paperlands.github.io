import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeTurn } from '../../assets/js/home/fourth-turn/native.mjs';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function rig({ slowControls = false, slowDrawings = false } = {}) {
  const events = [], plays = [], subscriptions = new Set(), controlRuns = [], drawingRuns = [], factories = [];
  let disposed = 0, delivering = false, available = true;
  let facts = { position: [0, -50, 0], bearing: 90, x: 100 };
  const read = (_place, property) => available ? { kind: 'value', value: facts[property] } : { kind: 'missing' };
  const deliver = subscriber => { delivering = true; try { subscriber.fn(read('A', subscriber.property)); } finally { delivering = false; } };
  const notify = () => { for (const subscriber of subscriptions) deliver(subscriber); };
  const control = {
    play(source) {
      subscriptions.clear();
      const seat = deferred(), completion = deferred();
      controlRuns.push({ seat, completion, source });
      if (!slowControls) { seat.resolve({ finished: completion.promise, commandCount: 3 }); completion.resolve({ commandCount: 3 }); }
      return seat.promise;
    },
    interaction: {
      read,
      subscribe(_place, property, fn) {
        const entry = { property, fn }; subscriptions.add(entry); deliver(entry);
        return () => subscriptions.delete(entry);
      },
      propose(_place, position) {
        assert.equal(delivering, false, 'proposals cannot be made inside reading callbacks');
        if (position[0] === 999) facts = { position: [123, 0, 0], bearing: 73, x: 123 };
        else facts = { ...facts, position, x: position[0] };
        notify(); return { kind: 'accept' };
      },
    },
    dispose() { disposed++; subscriptions.clear(); },
  };
  const drawing = {
    play(source) {
      const completion = deferred(); drawingRuns.push(completion); plays.push(source);
      if (!slowDrawings) completion.resolve({ commandCount: 8 });
      return Promise.resolve({ finished: completion.promise, commandCount: 1 });
    },
    dispose() { disposed++; },
  };
  const turn = createNativeTurn({ createHatch: (canvas, options) => { factories.push({ canvas, options }); return factories.length === 1 ? control : drawing; }, controlCanvas: 'control', drawingCanvas: 'drawing', send: (kind, detail) => events.push({ kind, ...detail }) });
  return { turn, events, plays, subscriptions, controlRuns, drawingRuns, factories, notify,
    get disposed() { return disposed; },
    change(next, exists = true) { facts = { ...facts, ...next }; available = exists; notify(); },
  };
}

test('initial subscriptions and one geometry acceptance produce one coherent redraw', async () => {
  const r = rig();
  await r.turn.setMode('rotator'); await tick();
  assert.equal(r.plays.length, 1);
  assert.equal(r.factories[0].options.interactive, true);
  assert.equal(r.factories[1].options.interactive, undefined);
  assert.equal(r.factories[1].options.caps.maxCommands, 500000);
  assert.equal(r.turn.propose([999, 9, 9]).kind, 'accept'); await tick();
  const answer = r.events.filter(e => e.kind === 'reading').at(-1);
  assert.deepEqual(answer.position, [123, 0, 0]);
  assert.equal(answer.bearing, 73);
  assert.match(r.plays.at(-1), /lt 73/);
  assert.equal(r.plays.length, 2, 'position and bearing callbacks are coalesced');
  r.turn.setStep(3); r.turn.replay(); await tick();
  assert.equal(r.factories.length, 2, 'the control is not re-created on redraw');
  assert.match(r.plays.at(-1), /lt turn/);
  r.turn.dispose();
});

test('availability is not converted to zero; later declarations and motion refresh the drawing', async () => {
  const r = rig(); await r.turn.setMode('slider'); await tick();
  const before = r.plays.length;
  r.change({}, false); await tick();
  assert.equal(r.events.filter(e => e.kind === 'reading').at(-1).available, false);
  assert.equal(r.plays.length, before);
  r.turn.setStep(1); await tick(); assert.equal(r.plays.length, before);
  r.change({ x: 140, position: [140, 0, 0] }); await tick();
  assert.match(r.plays.at(-1), /fw 140/);
  assert.equal(r.events.filter(e => e.kind === 'reading').at(-1).value, 140);
  r.turn.dispose();
});

test('rapid modes consume obsolete completion and install only the newest subscriptions', async () => {
  const r = rig({ slowControls: true });
  const old = r.turn.setMode('rotator'), next = r.turn.setMode('slider');
  assert.equal(r.turn.propose([1, 2, 3]).kind, 'busy');
  for (const run of r.controlRuns) run.seat.resolve({ finished: run.completion.promise, commandCount: 3 });
  await Promise.all([old, next]);
  r.controlRuns[0].completion.reject(Object.assign(new Error('old'), { reason: 'superseded' }));
  r.controlRuns[1].completion.resolve({ commandCount: 3 }); await tick();
  assert.equal(r.subscriptions.size, 2);
  assert.equal(r.events.filter(e => e.kind === 'reading').at(-1).mode, 'slider');
  assert.equal(r.events.filter(e => e.kind === 'fault').length, 0);
  r.turn.dispose();
});

test('a drawing finishes only when run.finished does; obsolete failures cannot poison its replacement', async () => {
  const r = rig({ slowDrawings: true }); await r.turn.setMode('rotator'); await tick();
  assert.equal(r.events.filter(e => e.kind === 'drawn').length, 0);
  r.turn.setStep(1); await tick();
  r.drawingRuns[0].reject(Object.assign(new Error('replaced'), { reason: 'superseded' }));
  r.drawingRuns[1].resolve({ commandCount: 8 }); await tick();
  assert.equal(r.events.filter(e => e.kind === 'fault').length, 0);
  assert.equal(r.events.filter(e => e.kind === 'drawn').length, 1);
  assert.match(r.events.find(e => e.kind === 'drawn').source, /loop 4/);
  r.turn.dispose();
});

test('current late wounds retain structured provenance, and disposal silences callbacks and queued redraws', async () => {
  const r = rig({ slowDrawings: true }); await r.turn.setMode('rotator'); await tick();
  const wound = { kind: 'walk', message: 'bad step', span: { line: 4 } };
  r.drawingRuns[0].reject(Object.assign(new Error('bad step'), { reason: 'fatal', wound })); await tick();
  assert.deepEqual(r.events.find(e => e.kind === 'fault').wound, wound);
  r.change({ bearing: 17 }); r.turn.dispose(); r.turn.dispose(); await tick();
  const count = r.events.length;
  r.change({ bearing: 19 }); r.turn.replay(); await tick();
  assert.equal(r.events.length, count);
  assert.equal(r.disposed, 2);
  assert.equal(r.subscriptions.size, 0);
  assert.equal(r.turn.propose([1, 2, 3]).kind, 'retired');
});

test('a late control wound stops observations and can be retried without ghost subscriptions', async () => {
  const r = rig({ slowControls: true });
  const started = r.turn.setMode('rotator');
  r.controlRuns[0].seat.resolve({ finished: r.controlRuns[0].completion.promise, commandCount: 3 });
  await started; await tick();
  r.controlRuns[0].completion.reject(Object.assign(new Error('late control wound'), { reason: 'fatal' })); await tick();
  assert.equal(r.subscriptions.size, 0);
  assert.equal(r.turn.propose([1, 2, 3]).kind, 'busy');
  const retried = r.turn.setMode('rotator');
  assert.equal(r.controlRuns.length, 2);
  r.controlRuns[1].seat.resolve({ finished: r.controlRuns[1].completion.promise, commandCount: 3 });
  r.controlRuns[1].completion.resolve({ commandCount: 3 });
  await retried; await tick();
  assert.equal(r.subscriptions.size, 2);
  r.turn.dispose();
});

test('responsive composition redraws only the drawing and retains the native control owner', async () => {
  const r = rig(); await r.turn.setMode('rotator'); await tick();
  r.turn.propose([999, 9, 9]); await tick();
  const controls = r.controlRuns.length, observers = [...r.subscriptions];
  r.turn.setCompact(true); await tick();
  assert.equal(r.controlRuns.length, controls);
  assert.deepEqual([...r.subscriptions], observers);
  assert.equal(r.factories.length, 2);
  assert.match(r.plays.at(-1), /jmpto -50 -50 120/);
  assert.match(r.plays.at(-1), /lt 73/);
  r.turn.widen(); await tick();
  assert.match(r.plays.at(-1), /jmpto -50 -50 -280/);
  r.turn.dispose();
});

test('switching tools restores their accepted native points rather than guessed angles', async () => {
  const r = rig(); await r.turn.setMode('rotator'); await tick();
  r.change({ position: [40, -90, 0], bearing: 73 }); await tick();
  await r.turn.setMode('slider'); await tick();
  r.turn.propose([140, 0, 0]); await tick();
  await r.turn.setMode('rotator'); await tick();
  assert.deepEqual(r.events.filter(e => e.kind === 'reading').at(-1).position, [40, -90, 0]);
  await r.turn.setMode('slider'); await tick();
  assert.equal(r.events.filter(e => e.kind === 'reading').at(-1).value, 140);
  r.turn.dispose();
});
