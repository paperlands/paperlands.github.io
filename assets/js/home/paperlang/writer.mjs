// The smaller writer: source text, a row identity, the line map, and operand records the
// author placed. It does not know rests, optics, or a description's parts. A line with no
// identity is still source. An operand exists only where the author named one; the writer
// does not find numbers in a sentence.

export function createWriter() {
  const lines = [];
  const rows = [];
  const idOfLine = {};
  const operands = [];
  const seen = new Set();

  const place = (code, { id, indent = 0, kind } = {}) => {
    if (typeof code !== 'string') throw new Error('a source line is a string');
    if (/[\n\r]/.test(code)) throw new Error('a source line is one physical line');
    const line = lines.length + 1;
    if (id) {
      if (typeof id !== 'string' || !id) throw new Error('a row identity is a non-empty string');
      if (seen.has(id)) throw new Error(`row ${id} is already written`);
      seen.add(id);
      const row = { id, code, indent, line };
      if (kind !== undefined) row.kind = kind;
      rows.push(row);
      idOfLine[line] = id;
    }
    lines.push(code);
    return line;
  };

  return {
    line(code, spec) {
      return place(code, spec);
    },
    instruction({ id, indent = 0, kind, segments }) {
      if (typeof id !== 'string' || !id) throw new Error('an operand needs the row it belongs to');
      if (!Array.isArray(segments) || segments.length === 0) throw new Error('an instruction names its pieces');
      let code = '';
      const spans = [];
      const names = new Set();
      for (const part of segments) {
        if (typeof part === 'string') {
          code += part;
          continue;
        }
        if (part == null || typeof part.name !== 'string' || !part.name || typeof part.text !== 'string') {
          throw new Error('an operand is a name and the text the author wrote');
        }
        if (!part.text) throw new Error(`operand ${part.name} has no text`);
        if (names.has(part.name)) throw new Error(`operand ${part.name} is already on this row`);
        names.add(part.name);
        const start = code.length;
        code += part.text;
        spans.push({ name: part.name, start, end: code.length });
      }
      const line = place(code, { id, indent, kind });
      for (const span of spans) operands.push({ name: span.name, row: id, line, start: span.start, end: span.end });
      return line;
    },
    finish() {
      // The record is a copy. Later lines stay in the writer and cannot reach back
      // into a result that has already been handed out.
      return Object.freeze({
        source: lines.join('\n'),
        rows: Object.freeze(rows.map((row) => Object.freeze({ ...row }))),
        idOfLine: Object.freeze({ ...idOfLine }),
        operands: Object.freeze(operands.map((operand) => Object.freeze({ ...operand }))),
      });
    },
  };
}
