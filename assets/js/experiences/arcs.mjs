// Arcs and Abstractions (Twilight world 2). Shared by the lesson card and
// experiences: the same breathing radii, partial sweeps and travelling points.
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

export function arcShapes(w, h, t, { x = .5, y = .95 } = {}) {
  return Array.from({ length: 8 }, (_, k) => {
    const radius = lerp(h * .15, h * .95, k / 7) * (1 + .03 * Math.sin(t * .7 + k));
    const sweep = lerp(.4, 1, hash(k, 7)) * Math.PI * (.7 + .3 * Math.sin(t * .5 + k * 1.7));
    const start = Math.PI + (Math.PI - sweep) / 2 + Math.sin(t * .2 + k) * .25;
    const traveller = start + sweep * ((t * .12 + k * .13) % 1);
    return { x: w * x, y: h * y, radius, start, sweep, traveller,
      alpha: lerp(.4, .1, k / 7), dashed: k % 3 === 2 };
  });
}

export function drawArcs(c, w, h, t, origin) {
  c.clearRect(0, 0, w, h);
  c.lineWidth = 1;
  for (const arc of arcShapes(w, h, t, origin)) {
    c.strokeStyle = `rgba(240,168,61,${arc.alpha.toFixed(3)})`;
    c.setLineDash(arc.dashed ? [3, 5] : []);
    c.beginPath();
    c.arc(arc.x, arc.y, arc.radius, arc.start, arc.start + arc.sweep);
    c.stroke();
    c.fillStyle = 'rgba(241,219,164,0.8)';
    c.fillRect(arc.x + Math.cos(arc.traveller) * arc.radius - 1,
      arc.y + Math.sin(arc.traveller) * arc.radius - 1, 2, 2);
  }
  c.setLineDash([]);
}
