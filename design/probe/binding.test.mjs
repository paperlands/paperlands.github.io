import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rangeDomain, memberDomain } from '../../assets/js/home/paperlang/domain.mjs';
import { createBinding } from '../../assets/js/home/paperlang/binding.mjs';
import { createWriter } from '../../assets/js/home/paperlang/writer.mjs';
import { DESTINATION, halfwayManuscript } from '../../assets/js/home/halfway/manuscript.mjs';

test('a range projects and a finite domain steps along its members', () => {
  const range = rangeDomain({ min: -180, max: 180, step: 1 });
  assert.equal(range.project(180.4), 180);
  assert.equal(range.project(-180.4), -180);
  assert.equal(range.next(180, 1), 180);
  const members = memberDomain([3, 4, 5, 6]);
  assert.equal(members.project(4.6), 5);
  assert.equal(members.next(6, 1), 6);
  assert.equal(members.next(3, -1), 3);
  assert.equal(members.next(4, 1), 5);
});

test('one binding is the value both instruments would propose', () => {
  const binding = createBinding({ name: 'vx', domain: DESTINATION, value: 120 });
  assert.throws(() => binding.step(0.5), /whole direction/);
  assert.equal(binding.value, 120);
  assert.equal(halfwayManuscript(binding.value, 100).rows.find((row) => row.id === 'call').code, 'halfway 120 100');
  const count = createBinding({ name: 'side', domain: memberDomain([3, 4, 5, 6]), value: 4 });
  assert.throws(() => count.step(0.5), /whole direction/);
  assert.equal(count.value, 4);
  assert.equal(binding.propose(120), false);
  assert.equal(binding.propose(120.2), false);
  assert.equal(binding.step(1), true);
  assert.equal(binding.value, 121);
  binding.begin();
  assert.equal(binding.propose(140.2), true);
  assert.equal(binding.value, 140);
  assert.equal(binding.restore(), true);
  assert.equal(binding.value, 121);
  assert.equal(binding.restore(), false);
  binding.begin();
  binding.propose(130);
  assert.equal(binding.note(51.428), false);
  binding.end();
  assert.equal(binding.value, 130);
  assert.equal(binding.note(360 / 7), true);
  assert.equal(binding.value, 360 / 7);
  assert.equal(binding.restore(), false);
  assert.equal(binding.note(360 / 7), false);
  assert.equal(binding.propose(130), true);
  assert.equal(binding.step(1) && binding.value, 131);
  assert.throws(() => binding.propose(Number.NaN), /finite/);
  const read = binding.read();
  assert.deepEqual(read, { name: 'vx', value: 131, min: -180, max: 180, step: 1 });
});

test('a step admits the noted value, and restore keeps that exact value', () => {
  const turn = createBinding({ name: 'turn', domain: rangeDomain({ min: -180, max: 180, step: 1 }), value: 90 });
  const derived = 360 / 7;
  assert.equal(turn.note(derived), true);
  turn.begin();
  assert.equal(turn.step(1), true);
  assert.equal(turn.value, 52);
  assert.equal(turn.restore(), true);
  assert.equal(turn.value, derived);
});

test('the halfway call records its operands and keeps their row when the text changes width', () => {
  const written = halfwayManuscript(120, 100);
  const call = written.rows.find((row) => row.id === 'call');
  const vx = written.operands.find((operand) => operand.name === 'vx');
  const vy = written.operands.find((operand) => operand.name === 'vy');
  assert.equal(call.code, 'halfway 120 100');
  assert.equal(call.code.slice(vx.start, vx.end), '120');
  assert.equal(call.code.slice(vy.start, vy.end), '100');
  assert.equal(vx.row, 'call');
  assert.equal(written.idOfLine[vx.line], 'call');
  assert.equal(written.source.includes('jmpto [[x+vx]/2] [[y+vy]/2]'), true);
  const again = halfwayManuscript(-180, 9);
  const next = again.operands.find((operand) => operand.name === 'vx');
  assert.equal(next.row, 'call');
  assert.equal(again.rows.find((row) => row.id === 'call').code.slice(next.start, next.end), '-180');
  assert.equal(again.idOfLine[next.line], 'call');
  const jump = again.rows.find((row) => row.id === 'jump');
  assert.equal(again.operands.some((operand) => operand.row === 'jump'), false);
  assert.equal(again.source.split('\n')[jump.line - 1], jump.code);
});

test('a finished record is a copy, and a line is one physical line', () => {
  const writer = createWriter();
  writer.line('halfway', { id: 'call' });
  const first = writer.finish();
  writer.line('speck', { id: 'mark-call' });
  const second = writer.finish();
  assert.equal(first.source, 'halfway');
  assert.equal(first.rows.length, 1);
  assert.deepEqual(first.idOfLine, { 1: 'call' });
  assert.equal(second.source, 'halfway\nspeck');
  assert.equal(second.rows.length, 2);
  assert.throws(() => { first.rows.push({}); }, TypeError);
  assert.throws(() => { first.rows[0].code = 'rewritten'; }, TypeError);
  assert.throws(() => createWriter().line('a\nb', { id: 'broken' }), /physical line/);
  assert.throws(() => createWriter().instruction({
    id: 'call',
    segments: ['half\nway ', { name: 'vx', text: '1' }],
  }), /physical line/);
  const intact = createWriter();
  intact.line('one', { id: 'one' });
  assert.throws(() => intact.line('two\nthree', { id: 'two' }));
  const after = intact.finish();
  assert.equal(after.source, 'one');
  assert.deepEqual(after.idOfLine, { 1: 'one' });
});

test('the writer refuses a second identity, a parsed number, and an operand with no row', () => {
  const writer = createWriter();
  writer.line('speck', { id: 'mark-call' });
  assert.throws(() => writer.line('speck', { id: 'mark-call' }), /already written/);
  assert.throws(() => writer.instruction({
    id: 'call',
    segments: [{ name: 'vx', text: 120 }],
  }), /text the author wrote/);
  assert.throws(() => createWriter().instruction({
    segments: ['halfway ', { name: 'vx', text: '1' }],
  }), /row it belongs to/);
  assert.throws(() => createWriter().instruction({
    id: 'call',
    segments: [{ name: 'vx', text: '1' }, ' ', { name: 'vx', text: '2' }],
  }), /already on this row/);
});

test('the interval does not import the halfway study binding', () => {
  const interval = readFileSync(new URL('../../assets/js/home/helios-interval.js', import.meta.url), 'utf8');
  assert.equal(interval.includes('createBinding'), false);
  assert.equal(interval.includes('halfwayManuscript'), false);
  assert.equal(interval.includes('paperlang/binding'), false);
});
