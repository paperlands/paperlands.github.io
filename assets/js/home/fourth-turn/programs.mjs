export const ROTATOR = `hd
let A
let A.z=0
let A.distance=120`;
export const SLIDER = `hd
let A
let A.y=0
let A.z=0`;

export const steps = [
  { name: 'Pairs', explain: 'A side, then a turn. Four times.', recipe: `fw 100\nlt 90\nfw 100\nlt 90\nfw 100\nlt 90\nfw 100\nlt 90` },
  { name: 'Repeat', explain: 'One pair. A loop to repeat it.', recipe: `loop 4 do\n  fw 100\n  lt 90\nend` },
  { name: 'Name', explain: 'Give the little rule a name. Call it again.', recipe: `def square do\n  loop 4 do\n    fw 100\n    lt 90\n  end\nend\nsquare` },
  { name: 'Generalise', explain: 'Make the turn an input. Let the rule become something else.', recipe: `def polygon side turn do\n  loop side do\n    fw 100\n    lt turn\n  end\nend\npolygon 4 90` },
];

export function drawingSource(step, { bearing = 90, length = 100 } = {}) {
  const fw = `fw ${length}`;
  const lt = `lt ${bearing}`;
  if (step === 0) return [fw, lt, fw, lt, fw, lt, fw, lt].join('\n');
  const body = `  ${fw}\n  ${lt}`;
  if (step === 1) return `loop 4 do\n${body}\nend`;
  if (step === 2) return `def square do\n  loop 4 do\n${body.replace(/^/gm, '  ')}\n  end\nend\nsquare`;
  return `def polygon side turn do\n  loop side do\n    fw ${length}\n    lt turn\n  end\nend\npolygon 4 ${bearing}`;
}
