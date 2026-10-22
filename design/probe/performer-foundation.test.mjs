import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirectPerformer } from '../../assets/js/home/paperlang/performer.mjs';
import { createFramePerformer } from '../../assets/js/home/paperlang/frame.mjs';
import { createRunController } from '../../assets/js/home/fourth-turn/run.mjs';
import { faultOf } from '../../assets/js/home/paperlang/record.mjs';

const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const canvas = () => ({ getContext: () => ({ clearColor() {}, clear() {}, COLOR_BUFFER_BIT: 1 }) });
function directFactory(methods = ['onLine']) {
  const made = [], subscriptions = [];
  const factory = () => {
    let beat, yes, no;
    const hatch = {
      play: async () => ({ commandCount: 1, finished: new Promise((a, b) => { yes = a; no = b; }) }),
      dispose() {},
      emit: (value) => beat?.(value), resolve: value => yes(value), reject: error => no(error),
    };
    for (const method of methods) hatch[method] = (fn) => { beat = fn; if (fn) subscriptions.push(method); };
    made.push(hatch); return hatch;
  };
  return { factory, made, subscriptions };
}

test('atomic commit is refused before a single canvas is cleared', async () => {
  let clears = 0;
  const surface = { getContext: () => ({ clearColor() {}, clear() { clears += 1; }, COLOR_BUFFER_BIT: 1 }) };
  const { factory, made } = directFactory();
  const performer = createDirectPerformer(surface, { path: '/pin.mjs', createHatch: factory });
  const first = performer.perform({ pin: '/pin.mjs', source: 'kept', presentation: 'progressive' });
  await tick();
  made[0].resolve({ commandCount: 1 });
  await first.finished;
  assert.equal(clears, 1);
  assert.throws(() => performer.perform({ pin: '/pin.mjs', source: 'proposal', presentation: 'commit' }), (error) => {
    assert.equal(error.reason, 'unsupported');
    assert.deepEqual(error.visibility, { presented: false, beatSent: false });
    return true;
  });
  assert.equal(clears, 1);
  assert.equal(made.length, 1);
  assert.equal(typeof made[0].dispose, 'function');
  const again = performer.perform({ pin: '/pin.mjs', source: 'drawn', presentation: 'progressive' });
  await tick();
  assert.equal(clears, 2);
  assert.equal(made.length, 1, 'a progressive pass reuses the resident host');
  made[0].resolve({ commandCount: 2 });
  await again.finished;
  performer.dispose();
});

test('direct pin adapts the old onBeat and current onLine names for the same beat channel', async () => {
  for (const methods of [['onBeat'], ['onLine'], []]) {
    const { factory, made, subscriptions } = directFactory(methods);
    const performer = createDirectPerformer(canvas(), { path: '/pin.mjs', createHatch: factory });
    const beats = [], accepted = [];
    const run = performer.perform({ pin: '/pin.mjs', source: 'fw 1', onBeat: beat => beats.push(beat), onAccepted: value => accepted.push(value) });
    await tick();
    made[0].emit({ time: .2, line: 1, lines: [1] }); made[0].resolve({ commandCount: 4 });
    const result = await run.finished;
    const method = methods.includes('onBeat') ? 'onBeat' : methods.includes('onLine') ? 'onLine' : null;
    const listens = method !== null;
    assert.deepEqual(subscriptions, method ? [method] : []);
    assert.equal(accepted[0].capabilities.beats, listens);
    assert.equal(accepted[0].commands, 1); assert.equal(result.completion.commandCount, 4);
    assert.equal(beats.length, listens ? 1 : 0);
    if (beats.length) assert.equal(beats[0].time, .2);
    performer.dispose();
  }
});

test('old pin fault remains a message, never parsed provenance', async () => {
  const { factory, made } = directFactory();
  const performer = createDirectPerformer(canvas(), { path: '/old.mjs', createHatch: factory });
  const run = performer.perform({ pin: '/old.mjs', source: 'fw 1' });
  const refused = run.finished.catch(error => error);
  await tick(); made[0].reject(new Error('bad step (line 7)'));
  const error = await refused;
  assert.deepEqual(faultOf(error), { message: 'bad step (line 7)' });
  assert.equal(error.visibility.presented, true);
  assert.equal(error.visibility.beatSent, false);
  performer.dispose();
});

test('new pin preserves structured fields and an absent span stays absent', async () => {
  const { factory, made } = directFactory(['onBeat']);
  const performer = createDirectPerformer(canvas(), { path: '/new.mjs', createHatch: factory });
  const run = performer.perform({ pin: '/new.mjs', source: 'fw 1' });
  const refused = run.finished.catch(error => error);
  await tick();
  const wound = { kind: 'walk', message: 'bad step' };
  made[0].reject(Object.assign(new Error('bad step'), { reason: 'fatal', wound }));
  const error = await refused;
  assert.deepEqual(faultOf(error), { message: 'bad step', reason: 'fatal', wound });
  assert.equal('span' in error.wound, false);
  performer.dispose();
});

function frameRig() {
  const sent = [], pageEvents = [], bootFaults = [], clock = { ms: 0 };
  let controller;
  const adapter = createFramePerformer({
    send: message => sent.push(message),
    isCurrent: id => controller.isCurrent(id),
    onBootFault: fault => bootFaults.push(fault),
  });
  controller = createRunController({ pin: '/pin.mjs', now: () => clock.ms, perform: adapter.perform,
    onState: (state, event) => pageEvents.push({ state, event }) });
  adapter.receive({ kind: 'ready', artifact: '/pin.mjs' });
  return { adapter, controller, sent, pageEvents, bootFaults, clock };
}

test('frame fault delivery rejects before microtask, does not cancel, and keeps queued desire', async () => {
  const { adapter, controller, sent, pageEvents, bootFaults } = frameRig();
  controller.want({ source: 'previous' });
  adapter.receive({ kind: 'finished', id: 1, completion: { commandCount: 1 } }); await tick();
  controller.want({ source: 'bad' }); controller.want({ source: 'newest' });
  adapter.receive({ kind: 'fault', id: 2, fault: { message: 'bad', kind: 'walk', span: { line: 2 } }, visibility: { presented: false, beatSent: false } });
  assert.equal(controller.isCurrent(2), true, 'rejecting schedules the controller microtask; no page cancel writes over it');
  await tick();
  assert.equal(controller.isCurrent(3), true);
  assert.equal(controller.presented.source, 'previous');
  assert.equal(sent.filter(message => message.kind === 'halt').length, 0);
  assert.equal(bootFaults.length, 0);
  const failure = pageEvents.find(({ event }) => event.kind === 'fault');
  assert.equal(failure.state.outcome.fault.span.line, 2);
  assert.equal(failure.state.desired.source, 'newest');
});

test('obsolete fault arriving before halt is handled cannot stop the following request', async () => {
  const { adapter, controller, bootFaults, pageEvents } = frameRig();
  controller.want({ source: 'old' });
  controller.cancel();
  controller.want({ source: 'new' });
  assert.equal(adapter.receive({ kind: 'fault', id: 1, fault: { message: 'old failed' } }), false);
  assert.equal(controller.isCurrent(2), true);
  await tick();
  assert.equal(controller.isCurrent(2), true);
  assert.equal(bootFaults.length, 0);
  assert.equal(pageEvents.filter(({ event }) => event.kind === 'fault').length, 0);
});

test('frame retains artifact, time, acceptance count, completion and observed duration', async () => {
  const { adapter, controller, clock } = frameRig();
  controller.want({ source: 'fw 1' });
  adapter.receive({ kind: 'accepted', id: 1, accepted: { commands: 1 } });
  adapter.receive({ kind: 'beat', id: 1, beat: { time: .4, line: 2, lines: [1, 2] } });
  clock.ms = 123;
  adapter.receive({ kind: 'finished', id: 1, completion: { commandCount: 5 } });
  await tick();
  const state = controller.snapshot();
  assert.equal(adapter.pin, '/pin.mjs');
  assert.equal(state.presented.pin, '/pin.mjs');
  assert.equal(state.outcome.accepted.commands, 1);
  assert.equal(state.outcome.completion.commandCount, 5);
  assert.equal(state.outcome.observedEndToEndMs, 123);
  assert.equal('executionMs' in state.outcome, false);
});

test('boot fault alone is allowed to take down the frame', async () => {
  const { adapter, controller, bootFaults } = frameRig();
  controller.want({ source: 'fw 1' });
  adapter.receive({ kind: 'fault', id: null, fault: { message: 'pin unavailable' } });
  await tick();
  assert.equal(bootFaults.length, 1);
  assert.equal(controller.snapshot().outcome.fault.message, 'pin unavailable');
  assert.equal(controller.disposition, 'idle');
});

test('a play send that throws rejects the run and frees the adapter', async () => {
  let calls = 0;
  const adapter = createFramePerformer({
    send() { calls += 1; if (calls === 1) throw new Error('parent is gone'); },
    isCurrent: () => true,
  });
  adapter.receive({ kind: 'ready', artifact: '/pin.mjs' });
  const failed = adapter.perform({ id: 1, pin: '/pin.mjs', source: 'fw 1', presentation: 'commit' });
  const error = await failed.finished.catch((fault) => fault);
  assert.equal(error.reason, 'transport');
  assert.equal(error.message, 'parent is gone');
  assert.deepEqual(error.visibility, { presented: false, beatSent: false });
  assert.equal('span' in error, false);
  const next = adapter.perform({ id: 2, pin: '/pin.mjs', source: 'fw 1', presentation: 'commit' });
  adapter.receive({ kind: 'finished', id: 2 });
  assert.equal((await next.finished).ok, true);
});

test('a halt send that throws still cancels the local run', async () => {
  const adapter = createFramePerformer({
    send(message) { if (message.kind === 'halt') throw new Error('parent is gone'); },
    isCurrent: () => true,
  });
  adapter.receive({ kind: 'ready', artifact: '/pin.mjs' });
  const run = adapter.perform({ id: 1, pin: '/pin.mjs', source: 'fw 1', presentation: 'commit' });
  assert.doesNotThrow(() => run.cancel());
  const error = await run.finished.catch((fault) => fault);
  assert.equal(error.reason, 'cancelled');
  assert.equal(adapter.receive({ kind: 'finished', id: 1 }), false);
});

test('dispose cancels the direct run even when the hatch throws, and a late result cannot resolve it', async () => {
  const { factory, made } = directFactory();
  const performer = createDirectPerformer(canvas(), { path: '/pin.mjs', createHatch: factory });
  const run = performer.perform({ pin: '/pin.mjs', source: 'fw 1' });
  await tick();
  made[0].dispose = () => { throw new Error('context is lost'); };
  assert.doesNotThrow(() => performer.dispose());
  made[0].resolve({ commandCount: 9 });
  const error = await run.finished.catch((fault) => fault);
  assert.equal(error.reason, 'cancelled');
  assert.doesNotThrow(() => performer.dispose());
});

test('two direct performers and two frame adapters are independent', async () => {
  const { factory, made } = directFactory();
  const a = createDirectPerformer(canvas(), { path: '/pin.mjs', createHatch: factory });
  const b = createDirectPerformer(canvas(), { path: '/pin.mjs', createHatch: factory });
  const ra = a.perform({ pin: '/pin.mjs', source: 'A' });
  const rb = b.perform({ pin: '/pin.mjs', source: 'B' });
  await tick(); made[0].resolve({ commandCount: 1 }); made[1].resolve({ commandCount: 2 });
  assert.equal((await ra.finished).completion.commandCount, 1);
  assert.equal((await rb.finished).completion.commandCount, 2);
  const fa = frameRig(), fb = frameRig();
  fa.controller.want({ source: 'A' }); fb.controller.want({ source: 'B' });
  fa.adapter.receive({ kind: 'fault', id: 1, fault: { message: 'A' } }); await tick();
  assert.equal(fb.controller.isCurrent(1), true);
  a.dispose(); b.dispose();
});
