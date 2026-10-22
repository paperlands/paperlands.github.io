// The run controller's own measurements: one run in flight, paced submissions, two presentation
// policies, cancellation, and stale results and beats that may never illuminate a newer recipe.
//
//   node --test design/probe/fourth-turn-run.test.mjs
//
// No DOM and no runtime: the native performer below is a stand-in with the pin's own shape —
// `perform` answers with a handle whose `finished` promise settles, and whose `cancel` is how a run
// is stopped — and the clock is the test's, so "paced against the run" is a claim with numbers
// under it rather than a sleep.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunController, PRESENTATION } from '../../assets/js/home/fourth-turn/run.mjs';

const start = () => {
  const clock = { ms: 0 };
  const timers = [];
  const runs = [];
  const events = [];
  const controller = createRunController({
    pin: '/test-pin.mjs',
    now: () => clock.ms,
    setTimer: (fn, ms) => { const timer = { fn, at: clock.ms + ms }; timers.push(timer); return timer; },
    clearTimer: (timer) => { const i = timers.indexOf(timer); if (i >= 0) timers.splice(i, 1); },
    onState: (snapshot, event) => events.push(event.kind),
    floor: 100,
    perform: ({ id, program, presentation, onBeat, onVisibility }) => {
      if (presentation === PRESENTATION.progressive) onVisibility({ presented: true, beatSent: false });
      const run = { id, program, presentation, onBeat, cancelled: false };
      run.finished = new Promise((resolve, reject) => { run.resolve = resolve; run.reject = reject; });
      run.cancelHandle = () => { run.cancelled = true; run.reject(new Error('hatch disposed')); };
      runs.push(run);
      return { finished: run.finished, cancel: run.cancelHandle };
    },
  });
  const advance = (ms) => {
    clock.ms += ms;
    for (const timer of [...timers]) {
      if (timer.at <= clock.ms) { timers.splice(timers.indexOf(timer), 1); timer.fn(); }
    }
  };
  const tick = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  return { controller, runs, events, clock, advance, tick };
};

test('One run at a time, and the newest desire is what is submitted next', async () => {
  const { controller, runs, tick } = start();
  controller.want({ program: 'A' });
  assert.equal(runs.length, 1, 'the first desire is submitted at once');
  assert.equal(runs[0].program, 'A');
  controller.want({ program: 'B' });
  assert.equal(runs.length, 1, 'a second desire does not start a second run');
  assert.equal(controller.desired.program, 'B', 'and it is kept as the desire');
  runs[0].resolve({ ok: true });
  await tick();
  assert.equal(runs.length, 2, 'the newest desire runs when the first finishes');
  assert.equal(runs[1].program, 'B');
  assert.equal(controller.presented.program, 'A', 'what is presented is the run that finished');
});

test('A committing run presents nothing until its result is whole', async () => {
  const { controller, runs, tick } = start();
  controller.want({ program: 'square' });
  assert.equal(controller.presented, null, 'no result is presented while it runs');
  assert.equal(controller.running, true);
  runs[0].resolve({ ok: true, commands: 8 });
  await tick();
  assert.equal(controller.presented.program, 'square');
  assert.equal(controller.presented.done, true);
  assert.deepEqual(controller.presented.result, { ok: true, commands: 8 });
  assert.equal(controller.running, false);
});

test('A progressive run is presented while it performs, and its beats move it', async () => {
  const { controller, runs, clock, tick } = start();
  controller.want({ program: 'pursuit', presentation: PRESENTATION.progressive });
  assert.equal(controller.presented.program, 'pursuit', 'the run itself is what is visible');
  assert.equal(controller.presented.done, false);
  clock.ms = 400;
  runs[0].onBeat({ line: 12 });
  assert.equal(controller.presented.beat.line, 12, 'a beat of the run in flight moves what is presented');
  runs[0].resolve({ ok: true });
  await tick();
  assert.equal(controller.presented.done, true);
});

test('A result or a beat that is not the run in flight is stale, and never presented', async () => {
  const { controller, runs, tick } = start();
  controller.want({ program: 'live', presentation: PRESENTATION.progressive });
  const cancelled = runs[0];
  controller.cancel();
  assert.equal(cancelled.cancelled, true, 'cancelling asks the native handle to stop');
  assert.equal(controller.presented.cancelled, true, 'and records what remains on the canvas');
  await tick();
  assert.equal(controller.stale, 1, 'the rejected run is counted as stale, not presented');
  cancelled.onBeat({ line: 99 });
  assert.equal(controller.stale, 2, 'a beat from it afterwards is stale too');
  assert.notEqual(controller.presented.result?.ok, true, 'and it never becomes a presented result');
});

test('Stop is cancel, not pause: the desire ends with the run', async () => {
  const { controller, runs, tick } = start();
  controller.want({ program: 'pursuit', presentation: PRESENTATION.progressive });
  controller.cancel();
  await tick();
  controller.release();
  controller.want({ program: 'pursuit' });
  assert.equal(runs.length, 2, 'a new desire is a new performance, not a resumption');
  assert.equal(controller.desired.program, 'pursuit');
  assert.equal(controller.disposition, 'running');
});

test('Disposal is final: nothing further is submitted or presented', async () => {
  const { controller, runs, tick } = start();
  controller.want({ program: 'A' });
  controller.dispose();
  await tick();
  assert.equal(runs[0].cancelled, true, 'the run in flight is stopped');
  assert.equal(controller.want({ program: 'B' }), false, 'a later desire is refused');
  assert.equal(runs.length, 1, 'and nothing new is submitted');
  assert.equal(controller.disposition, 'disposed');
});

test('A live gesture is paced against the run itself, and the last value still wins', async () => {
  const { controller, runs, clock, advance, tick } = start();
  controller.hold();
  controller.want({ program: 'A' });
  assert.equal(runs.length, 1);
  clock.ms = 40;
  controller.want({ program: 'B' });
  runs[0].resolve({ ok: true });
  await tick();
  assert.equal(runs.length, 1, 'the next submission waits: the last run took 40ms and the floor is 100ms');
  advance(59);
  assert.equal(runs.length, 1, 'still waiting one millisecond short');
  advance(1);
  assert.equal(runs.length, 2, 'and then the newest desire is submitted');
  assert.equal(runs[1].program, 'B');
  controller.want({ program: 'C' });
  runs[1].resolve({ ok: true });
  await tick();
  controller.release();
  assert.equal(runs.length, 3, 'letting go submits at once');
  assert.equal(runs[2].program, 'C', 'and it is the value the hand left');
});

test('The conditions travel with the run, and are immutable for its life', async () => {
  const { controller, runs, tick } = start();
  const asked = { side: 5, turn: 72, len: 250 };
  controller.want({ program: 'pursuit', presentation: PRESENTATION.progressive, context: asked });
  assert.deepEqual(controller.submitted.context, { side: 5, turn: 72, len: 250 }, 'the submission carries what it was asked under');
  asked.side = 6;
  assert.equal(controller.submitted.context.side, 5, 'and a later edit of the page\'s object cannot reach it');
  runs[0].resolve({ ok: true });
  await tick();
  assert.equal(controller.presented.context.side, 5, 'the presented result is judged by what it was asked with');
  const seen = controller.presented;
  seen.context.side = 99;
  assert.equal(controller.presented.context.side, 5, 'and what is presented is a copy');
});

test('A refused instruction is announced, never silent', async () => {
  const { controller, runs, events } = start();
  assert.equal(controller.want({}), false, 'a desire with no program is refused');
  assert.equal(controller.want({ program: null }), false);
  assert.equal(runs.length, 0, 'and nothing is performed');
  assert.deepEqual(events.slice(-2), ['refused', 'refused'], 'each refusal is announced');
  controller.dispose();
  assert.equal(controller.want({ program: 'anything' }), false, 'and after disposal nothing is accepted');
  assert.equal(events[events.length - 1], 'refused');
  // What a program *is* is the viewport's business: an object is carried, not judged.
  const other = start();
  other.controller.want({ program: { source: 'ring 100 4 91', rows: [] } });
  assert.equal(other.runs.length, 1, 'a program needs only to be something');
  assert.equal(other.runs[0].program.source, 'ring 100 4 91');
});

test('settle() answers when the desire has been presented', async () => {
  const { controller, runs, tick } = start();
  controller.want({ program: 'A' });
  let answered = false;
  const waiting = controller.settle().then(() => { answered = true; });
  await tick();
  assert.equal(answered, false, 'a run in flight has not settled');
  runs[0].resolve({ ok: true });
  await waiting;
  assert.equal(answered, true);
  assert.equal(controller.presented.program, 'A');
});

test('What is presented is a copy: a page cannot rewrite the record in place', async () => {
  const { controller, runs, tick } = start();
  controller.want({ program: 'A' });
  runs[0].resolve({ ok: true });
  await tick();
  const seen = controller.presented;
  seen.program = 'rewritten';
  assert.equal(controller.presented.program, 'A');
  seen.result.commands = 999;
  assert.equal(controller.presented.result.commands, undefined);
});
