import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL, LENGTH, normalize, equal, geometryKey, recipe, measure, fit, project, compile } from '../iterations/15-open-garden-model.mjs';
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≈ ${b}`);
test('URL inputs are finite, bounded, and default safely', () => {
  assert.deepEqual(normalize(), INITIAL);
  assert.deepEqual(normalize({ angle: 'NaN', form: Infinity, depth: 'bad' }), INITIAL);
  assert.deepEqual(normalize({ angle: -15, form: 99, depth: 0 }), { angle: 0, form: 3, depth: 1 });
  assert.deepEqual(normalize({ angle: '360', form: '2', depth: '4' }), { angle: 360, form: 2, depth: 4 });
  assert.ok(equal(INITIAL, { ...INITIAL }));
});
test('folding is an equivalent spelling, not a new drawing', () => {
  for (const angle of [0, 90, 113, 120, 180, 240, 360]) {
    const a = { ...INITIAL, angle, form: 1 }, b = { ...a, form: 2 };
    assert.equal(geometryKey(a), geometryKey(b));
    assert.deepEqual(measure(a), measure(b));
    assert.equal(recipe(a).filter((row) => row.id.startsWith('turn')).length, 3);
    assert.ok(recipe(b).some((row) => row.text === 'loop 3 do'));
  }
});
test('120 and 240 close at every depth; no arbitrary angle is forced closed', () => {
  for (const angle of [120, 240]) for (let depth = 1; depth <= 4; depth++) {
    const b = measure({ angle, depth, form: 3 }); near(b.x, 0); near(b.y, 0);
    near(b.maxX, LENGTH); near(b.minX, 0);
    near(angle === 120 ? b.maxY : -b.minY, Math.sqrt(3) * LENGTH / 2);
  }
  const open = measure({ angle: 113, depth: 3, form: 3 });
  assert.ok(Math.hypot(open.x, open.y) > 1);
});
test('degenerate angles remain honest and finite', () => {
  for (let depth = 1; depth <= 4; depth++) {
    const b = measure({ angle: 0, depth, form: 3 });
    near(b.y, 0); near(b.maxY, 0); near(b.minX, 0);
    near(b.maxX, 3 * LENGTH * ((1.5 ** depth - 1) / .5));
    assert.equal(b.segments, (3 ** (depth + 1) - 3) / 2);
  }
  const b = measure({ angle: 180, depth: 4, form: 3 }); near(b.minY, 0); near(b.maxY, 0);
});
test('every supported angle and depth fits, including the whole turn handle', () => {
  for (const [width, height] of [[276, 300], [346, 320], [790, 540]]) {
    for (let angle = 0; angle <= 360; angle++) for (let depth = 1; depth <= 4; depth++) {
      const s = { angle, depth, form: 3 }, b = measure(s), view = fit(s, width, height);
      const radius = width < 420 ? 47 : 58, p = project(LENGTH, 0, view);
      assert.ok(Number.isFinite(view.z));
      for (const [x, y] of [[b.minX, b.minY], [b.maxX, b.maxY]]) {
        const q = project(x, y, view);
        assert.ok(q.x >= 23.9 && q.x <= width - 23.9 && q.y >= 23.9 && q.y <= height - 23.9);
      }
      assert.ok(p.x - radius - 23 >= 23.9 && p.x + radius + 23 <= width - 23.9);
      assert.ok(p.y - radius - 23 >= 23.9 && p.y + radius + 51 <= height - 23.9);
    }
  }
});
test('compiled source exposes the chosen angle and finite stopping rule', () => {
  const s = { angle: 113, depth: 4, form: 3 }, view = fit(s, 790, 540);
  const plain = compile(s, view), trace = compile(s, view, true);
  assert.ok(plain.source.includes('let angle = 113\ngarden 240 angle 4'));
  assert.ok(plain.source.includes('when remaining>0 do'));
  assert.ok(plain.source.includes('garden length/2 angle remaining-1'));
  assert.ok(!plain.source.includes('wait '));
  assert.ok(trace.source.includes('wait 0.22*(length/240)^2'));
  for (const [line, id] of Object.entries(trace.lineMap)) {
    const text = trace.source.split('\n')[Number(line) - 1].trim();
    assert.ok(text.startsWith('wait ') || recipe(s).some((row) => row.id === id && row.text.trim() === text));
  }
});
