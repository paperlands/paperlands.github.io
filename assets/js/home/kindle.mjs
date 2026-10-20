// The execution light: what a beat means for the page's own rows.
//
// A beat is what the runtime saw — `{ time, line, lines }`, in the language's own logical order.
// It carries line numbers, not meanings, so every page that shows a walk asks the same question of
// it: which lines has the walk reached, which is it on now, and which has it left behind? That
// bookkeeping is here, once. The page brings its own rows (a `line → element` lookup), its own
// class names where its look needs them, and — because two honest looks disagree about this — one
// choice: whether standing on a line means the walk has reached it too.
//
// Nothing here knows a program, a language or a page. Deleting the import leaves each page's own
// classes and its own text exactly as they are.

export const LIGHT = { current: 'is-lit', past: 'is-past', pending: 'is-pending' };

// `overlap: false` — the light moves: the line the walk is on is the live one, and everything it
// left is past (a walk that arrives line by line, where being on a line and having passed it are
// different states).
// `overlap: true` — the light stands on a line it has already filed as reached: everything the
// walk has reached is past, and the line it is on is *also* current (a score read against the
// program, where a line stays done once it has been walked).
export function createKindle({ rowAt, light = LIGHT, overlap = false }) {
  const visited = new Set();
  let line = null;
  return {
    get visited() { return [...visited]; },
    get current() { return line; },
    // One beat. Returns what it did, so a page can hang its own reading of the same event off it
    // (a rest struck, a body paired, a mark named) without re-reading the beat.
    beat({ line: at = null, lines = [] } = {}) {
      const numbers = [...lines, ...(at == null ? [] : [at])].filter((number) => Number.isFinite(number));
      for (const number of numbers) visited.add(number);
      const now = at ?? numbers[numbers.length - 1] ?? null;
      for (const number of visited) {
        const element = rowAt(number);
        if (!element) continue;
        element.classList.remove(light.pending);
        const live = overlap ? number === now : numbers.includes(number);
        const behind = overlap ? true : !numbers.includes(number);
        element.classList.toggle(light.current, live);
        element.classList.toggle(light.past, behind);
      }
      line = now;
      return { line: now, lines: numbers };
    },
    // A fresh drawing starts from an unlit page.
    reset() {
      for (const number of visited) rowAt(number)?.classList.remove(light.current, light.past);
      visited.clear();
      line = null;
    },
  };
}
