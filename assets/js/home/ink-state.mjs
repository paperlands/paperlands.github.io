// The authored range is finite. Share its arithmetic between the compiler,
// the visitor's frame selector, and the tests; never reimplement the figures.
// Scroll timing (when a frame shows) is not hashed: see ./scroll-timing.mjs.
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

export function frameKey(grows, progress, still = false) {
  return still || !grows
    ? "settled"
    : String(sample(grows.from, grows.to, progress));
}
