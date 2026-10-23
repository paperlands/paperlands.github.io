// The page authors a small, bounded recipe. Paperlang alone paints its result.
export const INITIAL = Object.freeze({ angle: 120, form: 0, depth: 3 });
export const LENGTH = 240;
export const MAX_DEPTH = 4;
export function normalize(value = {}) {
  const number = (n, fallback, low, high) => Number.isFinite(Number(n)) && n !== null && n !== '' ? Math.max(low, Math.min(high, Math.round(Number(n)))) : fallback;
  return { angle: number(value.angle, 120, 0, 360), form: number(value.form, 0, 0, 3), depth: number(value.depth, 3, 1, MAX_DEPTH) };
}
export const equal = (a, b) => a.angle === b.angle && a.form === b.form && a.depth === b.depth;
export const geometryKey = (s) => `${s.angle}:${s.form === 0 ? 'one' : s.form < 3 ? 'three' : `inside:${s.depth}`}`;

export function recipe(s) {
  const rows = [];
  const add = (id, text, note) => rows.push({ id, text, note });
  const gesture = (indent = '', size = LENGTH, angle = s.angle, suffix = '') => {
    add(`forward${suffix}`, `${indent}fw ${size}`, 'Move forward. The line is its trail.');
    add(`turn${suffix}`, `${indent}lt ${angle}`, 'Turn left from the direction you were facing.');
  };
  if (s.form === 0) gesture();
  else if (s.form === 1) for (let i = 0; i < 3; i++) gesture('', LENGTH, s.angle, i ? String(i) : '');
  else if (s.form === 2) {
    add('loop', 'loop 3 do', 'The same two instructions, three times.');
    gesture('  ');
    add('loop-end', 'end', 'Return to the beginning of the repeat.');
  } else {
    add('definition', 'def garden length angle remaining do', 'A name for a rule that can use itself.');
    add('guard', '  when remaining>0 do', 'At zero, stop growing and return.');
    add('loop', '    loop 3 do', 'Repeat the whole gesture, including its smaller garden.');
    gesture('      ', 'length', 'angle');
    add('smaller', '      garden length/2 angle remaining-1', 'Half as long. The same turn. One fewer level.');
    add('loop-end', '    end', 'Continue with the next gesture.');
    add('guard-end', '  end', 'The smaller garden can return.');
    add('definition-end', 'end', 'This is the whole rule.');
    add('space', '', '');
    add('angle', `let angle = ${s.angle}`, 'Your turn, inherited by every smaller garden.');
    add('call', `garden ${LENGTH} angle ${s.depth}`, 'Begin with this length, your angle, and this many levels.');
  }
  return rows;
}

// Layout measurement, NOT interpreter telemetry or a second drawing. Only this
// fixed recipe is measured. No path from here is rendered. Bounds let the optical
// setup contain even a straight walk at 0°. Tests check the closed 120° case,
// the degenerate walks, and containment across every supported integer angle.
export function measure(s) {
  let x = 0, y = 0, heading = 0, segments = 0;
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  const gesture = (length) => {
    x += length * Math.cos(heading); y += length * Math.sin(heading);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    heading = (heading + s.angle * Math.PI / 180) % (Math.PI * 2); segments++;
  };
  const garden = (length, depth) => {
    if (depth <= 0) return;
    for (let i = 0; i < 3; i++) { gesture(length); garden(length / 2, depth - 1); }
  };
  if (s.form === 0) gesture(LENGTH);
  else garden(LENGTH, s.form === 3 ? s.depth : 1);
  return { minX, maxX, minY, maxY, x, y, heading, segments };
}

const TAN = Math.tan(Math.PI / 6); // This pin's fixed perspective camera: z=500, fov=60°.
export function fit(s, width, height) {
  const b = measure(s);
  // Fit the actual extent of the recipe AND the fixed-pixel turn instrument.
  // This is camera-layout arithmetic, not an observed execution value.
  const radius = width < 420 ? 47 : 58, margin = 24;
  const envelope = (scale) => ({
    minX: Math.min(b.minX * scale, LENGTH * scale - radius - 23),
    maxX: Math.max(b.maxX * scale, LENGTH * scale + radius + 23),
    minY: Math.min(-b.maxY * scale, -radius - 23),
    maxY: Math.max(-b.minY * scale, radius + 51),
  });
  let low = 0, high = height / 360;
  for (let i = 0; i < 35; i++) {
    const mid = (low + high) / 2, box = envelope(mid);
    if (box.maxX - box.minX <= width - margin * 2 && box.maxY - box.minY <= height - margin * 2) low = mid;
    else high = mid;
  }
  const scale = Math.max(0.001, low), box = envelope(scale);
  const cx = (box.minX + box.maxX) / (2 * scale), cy = -(box.minY + box.maxY) / (2 * scale);
  return { cx, cy, scale, z: 500 - height / (2 * TAN * scale), width, height };
}
export function project(x, y, view) {
  return { x: view.width / 2 + (x - view.cx) * view.scale, y: view.height / 2 - (y - view.cy) * view.scale };
}
export function outside(s, view) {
  const b = measure(s);
  return [[b.minX, b.minY], [b.maxX, b.maxY]].some(([x, y]) => {
    const p = project(x, y, view);
    return p.x < 24 || p.y < 24 || p.x > view.width - 24 || p.y > view.height - 24;
  });
}
export function compile(s, view, trace = false) {
  const fixed = (n) => String(Number(n.toFixed(5)));
  const rows = recipe(s);
  const lines = [
    '# Optical placement only. The rule below is the visible recipe.',
    'beColour "f1dba4"', 'bold 0.65', trace ? 'show 8' : 'hide',
    `jmpto ${fixed(-view.cx)} ${fixed(-view.cy)} ${fixed(view.z)}`,
  ];
  const lineMap = {};
  for (const row of rows) {
    lines.push(row.text); lineMap[lines.length] = row.id;
    if (trace && /^(fw|lt)\b/.test(row.text.trim())) {
      const wait = s.form === 3 ? '0.22*(length/240)^2' : '0.3';
      lines.push(`${row.text.match(/^\s*/)[0]}wait ${wait}`);
      lineMap[lines.length] = row.id;
    }
  }
  return { source: lines.join('\n'), rows, lineMap };
}
