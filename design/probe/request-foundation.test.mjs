import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunController, PRESENTATION } from '../../assets/js/home/fourth-turn/run.mjs';

const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function rig() {
  const runs = [], events = [], clock = { ms: 0 };
  const controller = createRunController({ pin: '/pin-a.mjs', now: () => clock.ms,
    onState: (state, event) => events.push({ state, event }),
    perform: (request) => {
      let resolve, reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      runs.push({ ...request, resolve, reject });
      return { finished, cancel: () => reject(new Error('stopped')) };
    },
  });
  return { controller, runs, events, clock };
}
const recipe = () => ({ source: 'left 90', rows: [{ id: 'turn', line: 1, code: 'left 90' }], idOfLine: { 1: 'turn' } });

test('submission owns deep plain data, including the recipe and inputs', () => {
  const { controller, runs } = rig();
  const program = recipe(), context = { inputs: { turn: 90 } };
  controller.want({ program, context });
  program.source = 'left 45'; program.rows[0].code = 'left 45'; context.inputs.turn = 45;
  assert.equal(runs[0].source, 'left 90');
  assert.equal(runs[0].program.rows[0].code, 'left 90');
  assert.equal(controller.submitted.context.inputs.turn, 90);
  assert.throws(() => { runs[0].program.rows[0].code = 'rewritten'; }, TypeError);
  const snapshot = controller.snapshot();
  snapshot.submitted.program.rows[0].code = 'copy';
  assert.equal(controller.submitted.program.rows[0].code, 'left 90');
});

test('functions and non-plain handles are refused before submission', () => {
  const { controller, runs } = rig();
  for (const program of [ { source: 'fw 1', callback() {} }, { source: 'fw 1', nested: new Date() } ]) {
    assert.equal(controller.want({ program }), false);
  }
  assert.equal(controller.want({ program: 'fw 1', context: { nested: { fn() {} } } }), false);
  assert.equal(runs.length, 0);
});

test('sameness uses exact source, presentation and pin, not recipe identity', async () => {
  const { controller, runs } = rig();
  controller.want({ program: recipe() }); runs[0].resolve({ ok: true }); await tick();
  controller.want({ program: recipe() }); assert.equal(runs.length, 1);
  controller.want({ program: recipe(), pin: '/pin-b.mjs' }); assert.equal(runs.length, 2);
  runs[1].resolve({ ok: true }); await tick();
  controller.want({ program: recipe(), pin: '/pin-b.mjs', presentation: PRESENTATION.progressive });
  assert.equal(runs.length, 3);
});

test('replay is one request nonce, not a sticky bypass of sameness', async () => {
  const { controller, runs } = rig();
  controller.want({ program: recipe() }); runs[0].resolve({ ok: true }); await tick();
  controller.replay({ program: recipe() }); assert.equal(runs.length, 2);
  assert.ok(runs[1].replayNonce);
  runs[1].resolve({ ok: true }); await tick();
  controller.want({ program: recipe() }); assert.equal(runs.length, 2);
  controller.replay({ program: recipe() }); assert.equal(runs.length, 3);
  assert.notEqual(runs[1].replayNonce, runs[2].replayNonce);
});

test('a failed commit preserves previous presentation and structured failure', async () => {
  const { controller, runs, clock } = rig();
  controller.want({ program: 'A' }); runs[0].resolve({ ok: true }); await tick();
  controller.want({ program: 'B' });
  runs[1].onAccepted({ commands: 2 }); clock.ms = 37;
  runs[1].reject(Object.assign(new Error('bad step'), { reason: 'fatal', wound: { kind: 'walk', span: { line: 3 }, message: 'bad step' }, visibility: { presented: false, beatSent: false } }));
  await tick();
  const state = await controller.settle();
  assert.equal(state.presented.source, 'A');
  assert.equal(state.outcome.source, 'B');
  assert.equal(state.outcome.visibility, 'previous');
  assert.equal(state.outcome.fault.wound.span.line, 3);
  assert.equal(state.outcome.accepted.commands, 2);
  assert.equal(state.outcome.observedEndToEndMs, 37);
  assert.equal('executionMs' in state.outcome, false);
  assert.equal(runs.length, 2, 'failure does not retry itself');
});

test('failure of one proposal still permits the queued newer desire', async () => {
  const { controller, runs } = rig();
  controller.want({ program: 'A' }); controller.want({ program: 'B' });
  runs[0].reject(new Error('A failed')); await tick();
  assert.equal(runs.length, 2);
  assert.equal(runs[1].source, 'B');
  assert.equal(controller.disposition, 'running');
});

test('progressive does not invent partial output before stage evidence', async () => {
  for (const [facts, expected] of [[{ presented: false, beatSent: false }, 'previous'], [{ presented: true, beatSent: false }, 'replaced-empty'], [{ presented: true, beatSent: true }, 'partial']]) {
    const { controller, runs } = rig();
    controller.want({ program: 'A' }); runs[0].resolve({ ok: true }); await tick();
    controller.want({ program: 'B', presentation: PRESENTATION.progressive });
    assert.equal(controller.presented.source, 'A');
    runs[1].reject(Object.assign(new Error('failed'), { visibility: facts })); await tick();
    assert.equal(controller.snapshot().outcome.visibility, expected);
    assert.equal(controller.presented.source, facts.presented ? 'B' : 'A');
  }
});

test('acceptance count and completion payload stay separate', async () => {
  const { controller, runs } = rig();
  controller.want({ program: 'fw 1' }); runs[0].onAccepted({ commands: 1 });
  runs[0].resolve({ ok: true, completion: { commandCount: 3 } }); await tick();
  assert.equal(controller.snapshot().outcome.accepted.commands, 1);
  assert.equal(controller.snapshot().outcome.completion.commandCount, 3);
});


test('a preserved successful front can satisfy a later desire after another commit fails', async () => {
  const { controller, runs } = rig();
  controller.want({ source: 'A' }); runs[0].resolve({ ok: true }); await tick();
  controller.want({ source: 'B' }); runs[1].reject(new Error('B failed')); await tick();
  controller.want({ source: 'A' });
  assert.equal(runs.length, 2);
  assert.equal((await controller.settle()).presented.source, 'A');
});

test('a matching front does not settle while another request can still replace it', async () => {
  const { controller, runs } = rig();
  controller.want({ source: 'A' }); runs[0].resolve({ ok: true }); await tick();
  controller.want({ source: 'B' }); controller.want({ source: 'A' });
  let settled = false;
  controller.settle().then(() => { settled = true; }); await tick();
  assert.equal(settled, false);
  runs[1].resolve({ ok: true }); await tick();
  assert.equal(runs[2].source, 'A');
  runs[2].resolve({ ok: true }); await tick();
  assert.equal(settled, true);
});

test('nonce and request source cannot hide identity or contradictory data', () => {
  const { controller, runs } = rig();
  assert.equal(controller.want({ source: 'A', replayNonce: {} }), false);
  assert.equal(controller.want({ source: 'A', program: { source: 'B' } }), false);
  const program = { get source() { throw new Error('getter must not run'); } };
  assert.equal(controller.want({ program }), false);
  assert.equal(runs.length, 0);
});
