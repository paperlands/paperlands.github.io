// The halfway one-jump, handwritten. The two destinations are operands the author
// placed on the call. The definition and the speck are source with no binding.

import { rangeDomain } from '../paperlang/domain.mjs';
import { createWriter } from '../paperlang/writer.mjs';

export const DESTINATION = rangeDomain({ min: -180, max: 180, step: 1 });

export function halfwayManuscript(vx, vy) {
  if (!Number.isInteger(vx) || !Number.isInteger(vy)) throw new Error('halfway writes whole destinations');
  const writer = createWriter();
  writer.line('def halfway vx vy do', { id: 'def' });
  writer.line('  jmpto [[x+vx]/2] [[y+vy]/2]', { id: 'jump' });
  writer.line('end', { id: 'end' });
  writer.line('');
  writer.line('def speck do', { id: 'speck' });
  writer.line('  fw 1', { id: 'mark' });
  writer.line('  jmp -1', { id: 'return' });
  writer.line('end', { id: 'end-speck' });
  writer.line('');
  writer.instruction({
    id: 'call',
    segments: ['halfway ', { name: 'vx', text: String(vx) }, ' ', { name: 'vy', text: String(vy) }],
  });
  writer.line('speck', { id: 'mark-call' });
  return writer.finish();
}
