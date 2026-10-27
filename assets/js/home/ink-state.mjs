// The authored range is finite. Share its arithmetic between the compiler,
// the visitor's frame selector, and the tests; never reimplement the figures.
export const STEPS = 20;
export const clamp = (value) => Math.max(0, Math.min(1, value));

export function sample(from, to, progress) {
  const q = Math.round(clamp(progress) * STEPS) / STEPS;
  const value = from + (to - from) * q;
  return Number.isInteger(from) && Number.isInteger(to)
    ? Math.round(value)
    : Math.round(value * 1000) / 1000;
}

export function withCount(line, count) {
  return line.replace(/\d+(?:\.\d+)?(?![\s\S]*\d)/, String(count));
}

export function statesFor({ program, grows }) {
  const source = program.trim();
  if (!grows) return [{ key: "settled", source }];
  const { line, from, to } = grows;
  if (
    !source.includes(line) ||
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    !/\d/.test(line)
  )
    throw new Error("The ink range must name a numeric line in its programme.");
  const states = new Map();
  for (let step = 0; step <= STEPS; step++) {
    const count = sample(from, to, step / STEPS);
    states.set(String(count), source.replace(line, withCount(line, count)));
  }
  // Reduced motion is the programme as written, not necessarily either endpoint.
  return [...states]
    .map(([key, source]) => ({ key, source }))
    .concat({ key: "settled", source });
}

export function depthAt(top, height, viewportHeight, scrollPosition, viewportWidth) {
  // Start progressing when the section's top reaches 40% of screen height on
  // mobile (<=850px wide), or 55% on desktop. Smaller values start later.
  // This entire file is hashed: even timing/comment edits require regenerating
  // the ink manifest and images. See design/scroll-rendering.md for commands.
  const start = viewportWidth <= 850 ? 0.4 : 0.55;
  return clamp(
    (viewportHeight * start - (top - scrollPosition)) / Math.max(height, 1),
  );
}

// Optional exponent on the shared depth. 1 is linear. Above 1 spends the start
// longer and still meets the same end. Scrolling up reverses it.
export function curve(progress, ease = 1) {
  const t = clamp(progress);
  const k = Number(ease);
  if (!Number.isFinite(k) || k <= 0 || k === 1) return t;
  return t ** k;
}

export function frameKey(grows, progress, still = false) {
  return still || !grows
    ? "settled"
    : String(sample(grows.from, grows.to, progress));
}
