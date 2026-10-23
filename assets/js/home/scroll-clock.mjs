// One demand-driven clock for subscribers, not a claim about all page scripts.
// ALL measures precede ALL paints; ordinary scroll changes y, not geometry.
const clients = new Set(), targets = new Map();
let frame = 0, dirty = true, pageActive = true;
let y = scrollY, height = innerHeight, width = innerWidth;
const awake = () => pageActive && !document.hidden;

export function schedule() {
  if (!frame && clients.size && awake()) frame = requestAnimationFrame(paint);
}
export function invalidate() { dirty = true; schedule(); }
function cancel() { cancelAnimationFrame(frame); frame = 0; }
function invoke(entry, phase, state) {
  try {
    entry.client[phase]?.(...state);
    return true;
  } catch (error) {
    // A broken decoration must not starve its peers or create a retry loop.
    // Retry only on external demand; report each failing phase once per owner.
    if (!entry.errors.has(phase)) {
      entry.errors.add(phase);
      if (typeof globalThis.reportError === 'function') globalThis.reportError(error);
      else setTimeout(() => { throw error; });
    }
    return false;
  }
}
function paint() {
  frame = 0;
  if (!awake()) return;
  // Freeze membership and input for BOTH phases. Reentrant subscriptions and
  // invalidations belong to the next frame, never a read after this frame's writes.
  const batch = [...clients], measure = dirty;
  dirty = false;
  if (measure) { y = scrollY; height = innerHeight; width = innerWidth; }
  const state = [y, height, width];
  if (measure) for (const entry of batch) {
    if (clients.has(entry)) entry.measured = invoke(entry, 'measure', state);
  }
  for (const entry of batch) {
    if (clients.has(entry) && entry.measured) invoke(entry, 'paint', state);
  }
}
const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(invalidate) : null;
export function subscribe(client, elements = []) {
  const owned = new Set([document.querySelector('main') || document.body, ...elements].filter(Boolean));
  const entry = { client, measured: false, errors: new Set() };
  clients.add(entry);
  for (const element of owned) {
    const count = targets.get(element) || 0;
    if (!count) observer?.observe(element);
    targets.set(element, count + 1);
  }
  invalidate();
  return () => {
    if (!clients.delete(entry)) return; // Disposal is idempotent.
    for (const element of owned) {
      const count = targets.get(element) - 1;
      if (count) targets.set(element, count);
      else { targets.delete(element); observer?.unobserve(element); }
    }
    if (!clients.size) { cancel(); observer?.disconnect(); }
  };
}
addEventListener('scroll', () => { y = scrollY; schedule(); }, { passive: true });
addEventListener('resize', invalidate, { passive: true });
addEventListener('load', invalidate);
addEventListener('pageshow', () => { pageActive = true; invalidate(); });
addEventListener('pagehide', () => { pageActive = false; cancel(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancel();
  else invalidate();
});
document.fonts?.ready.then(invalidate);
document.fonts?.addEventListener('loadingdone', invalidate);
