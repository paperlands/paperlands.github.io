import test from 'node:test';
import assert from 'node:assert/strict';
import { ROTATOR, SLIDER, steps, drawingSource } from '../../assets/js/home/fourth-turn/programs.mjs';

test('native control recipes use Dojo places and property reads verbatim', () => {
  assert.equal(ROTATOR, 'hd\nlet A\nlet A.z=0\nlet A.distance=120');
  assert.equal(SLIDER, 'hd\nlet A\nlet A.y=0\nlet A.z=0');
});

test('recipe progression keeps explicit pairs, loop, name, and parameterised rule', () => {
  assert.equal(steps.length, 4);
  assert.match(steps[0].recipe, /fw 100\nlt 90/);
  assert.match(steps[1].recipe, /^loop 4 do/);
  assert.match(steps[2].recipe, /^def square do/);
  assert.match(steps[3].recipe, /def polygon side turn do/);
});

test('accepted native values flow into the drawing source without a site-side angle model', () => {
  assert.match(drawingSource(0, { bearing: 73, length: 42 }), /fw 42\nlt 73/);
  assert.match(drawingSource(1, { bearing: 73, length: 42 }), /loop 4 do[\s\S]*fw 42[\s\S]*lt 73/);
  assert.match(drawingSource(2, { bearing: 73, length: 42 }), /def square do/);
  assert.match(drawingSource(3, { bearing: 73, length: 42 }), /polygon 4 73/);
});
