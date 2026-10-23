import assert from 'node:assert/strict';
import test from 'node:test';
import { arcShapes, drawArcs } from '../../assets/js/experiences/arcs.mjs';

// Independent transcript of the original world-2 renderer. Extraction must not
// change the lesson card's radii, sweeps, travellers, dash pattern or colours.
function original(c, w, h, t) {
  const lerp = (a, b, t) => a + (b - a) * t;
  const hash2 = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  c.clearRect(0, 0, w, h);
  const cx = w * .5, cy = h * .95;
  for (let k = 0; k < 8; k++) {
    const rr = lerp(h * .15, h * .95, k / 7) * (1 + .03 * Math.sin(t * .7 + k));
    const sweep = lerp(.4, 1, hash2(k, 7)) * Math.PI * (.7 + .3 * Math.sin(t * .5 + k * 1.7));
    const start = Math.PI + (Math.PI - sweep) / 2 + Math.sin(t * .2 + k) * .25;
    c.strokeStyle = `rgba(240,168,61,${lerp(.4, .1, k / 7).toFixed(3)})`;
    c.lineWidth = 1;
    c.setLineDash(k % 3 === 2 ? [3, 5] : []);
    c.beginPath(); c.arc(cx, cy, rr, start, start + sweep); c.stroke();
    const ta = start + sweep * ((t * .12 + k * .13) % 1);
    c.fillStyle = 'rgba(241,219,164,0.8)';
    c.fillRect(cx + Math.cos(ta) * rr - 1, cy + Math.sin(ta) * rr - 1, 2, 2);
  }
  c.setLineDash([]);
}
function recorder() {
  const calls = [];
  const context = { lineWidth: 1 };
  for (const name of ['clearRect', 'setLineDash', 'beginPath', 'arc', 'stroke', 'fillRect']) {
    context[name] = (...args) => calls.push([name, ...args, context.lineWidth, context.strokeStyle, context.fillStyle]);
  }
  return { calls, context };
}
for (const [w, h] of [[420, 236], [390, 640], [1440, 750]]) {
  for (const t of [0, 1.3, 12, 38.5]) {
    test(`world 2 unchanged at ${w}×${h}, t=${t}`, () => {
      const before = recorder(), after = recorder();
      original(before.context, w, h, t); drawArcs(after.context, w, h, t);
      assert.deepEqual(after.calls, before.calls);
    });
  }
}
test('hero changes only the origin, not the circular rule', () => {
  const a = arcShapes(1440, 750, 8), b = arcShapes(1440, 750, 8, { x: .7, y: .89 });
  assert.equal(b.length, 8);
  b.forEach((arc, i) => {
    assert.equal(arc.x, 1440 * .7); assert.equal(arc.y, 750 * .89);
    for (const property of ['radius', 'start', 'sweep', 'traveller', 'alpha', 'dashed']) assert.equal(arc[property], a[i][property]);
  });
});
