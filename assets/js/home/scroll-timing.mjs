// Scroll timing is not ink. It decides WHEN a frame is shown, never which
// pixels are drawn, so it stays outside the hashed model (./ink-state.mjs):
// the feel of the scrub can be retuned without recompiling the stills.
// Quantization stays in ink-state.mjs, whose hash the build verifies.
import { clamp } from './ink-state.mjs';

// Mirrors the `max-width: 850px` breakpoints in assets/css/components.
export const LAYOUT_BREAKPOINT = 850;
// The depth starts once the section's top reaches this fraction of the viewport
// height. Smaller values start later.
export const START_MOBILE = .4;
export const START_DESKTOP = .55;

export function depthAt(top, height, viewportHeight, scrollPosition, viewportWidth = Infinity) {
  const start = viewportWidth <= LAYOUT_BREAKPOINT ? START_MOBILE : START_DESKTOP;
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
