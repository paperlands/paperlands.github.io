// Background mathematics with a slow clock of its own. The orbit advances on its
// own at a rate you have to stop and watch; every scrolled pixel is added speed,
// not position, so the gesture hurries what is already moving and then lets it
// settle back. Offscreen, hidden and Save-Data pages stop the clock entirely.
// Authored noise is never fetched: the still is the settled frame.
//
// The phase always integrates. An affordable frame presents everything; a slow
// one spends only on visible steps — the quantised pose, or the arcs once they
// have travelled enough to see. Neither path drops a step it owes, so a slow
// cadence or a long task costs smoothness for a frame, never the motion.
import { drawArcs } from './arcs.mjs';

const IDLE = 0.08;        // phase per second at rest (~one turn a minute)
const KICK = 0.008;       // phase per scrolled pixel, spent as speed
const DECAY = 0.5;        // seconds for a gesture's speed to fade to a third
const MAX_BOOST = 8;      // phase per second; a flung wheel stays an ornament
const JUMP = 0.1;         // seconds; a hidden tab must not leap the phase
const ARC = 4;            // the arcs own more of the phase than the torus
const TURN = 55;          // degrees of torus rotation per phase unit
const ARC_STEP = 0.03;    // arc-time; ~4.4px at rest, every frame of a fling (see evidence)
const TURN_STEP = 0.2;    // degrees; a quantised pose is only written when it differs
const MISS = 0.025;       // seconds; a frame slower than this presents only visible steps

const root = document.querySelector('.experiences-overture');
if (root) boot(root);

function boot(root) {
  const canvas = root.querySelector('[data-stage-arcs]');
  const torus = root.querySelector('[data-stage-torus]');
  if (!canvas || !torus) return;
  const context = canvas.getContext('2d');
  const arcs = canvas.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const connection = navigator.connection;
  // A still is a complete picture, not a degraded one: reduced motion,
  // forced colours and Save-Data each get the authored resting frame.
  const still = () => reduced.matches || forced.matches || Boolean(connection?.saveData);

  let width = 1, height = 1, dpr = 1, resized = true;
  let top = 0, span = 1;
  let phase = 0, boost = 0, previous = 0, frame = 0;
  let visible = true, painted = false, pageActive = true;
  let drawnArc = null, shown = '';
  let y = scrollY;
  const awake = () => pageActive && !document.hidden;

  function measure() {
    const box = root.getBoundingClientRect();
    top = box.top + scrollY;
    span = Math.max(1, box.height);
    width = Math.max(1, box.width);
    height = span;
    dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)));
    resized = true;
  }

  function size() {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    resized = false;
  }

  function status() {
    const state = still() ? 'still' : visible ? 'moving' : 'offscreen';
    if (root.dataset.stageState !== state) root.dataset.stageState = state;
  }

  function pose() {
    const progress = Math.min(1, Math.max(0, (scrollY - top) / span));
    const angle = progress * Math.PI * .65;
    const x = -Math.sin(angle) * width * .035;
    const z = (1 - Math.cos(angle)) * height * .045;
    const rot = Math.round((-progress * 12 - phase * TURN) / TURN_STEP) * TURN_STEP;
    return {
      progress,
      transform: `translate3d(${x.toFixed(2)}px,${z.toFixed(2)}px,0) rotate(${rot.toFixed(1)}deg)`,
    };
  }

  function show(transform) {
    if (transform === shown) return;
    shown = transform;
    torus.style.transform = transform;
  }

  function paint(posed = pose(), arcT = posed.progress * 8 + phase * ARC) {
    show(posed.transform);
    if (!context || forced.matches) { drawnArc = arcT; return; }
    if (resized) size();
    drawArcs(context, width, height, arcT, { x: .7, y: .89 });
    drawnArc = arcT;
    if (!painted) arcs.classList.add('is-live');
    painted = true;
  }

  // The authored still, drawn once: a fixed world-2 frame that does not depend
  // on where the reader happens to be, so toggling a gate never leaves a
  // half-lit half-turn behind.
  function rest() {
    shown = '';
    torus.style.transform = '';
    if (!context || forced.matches) return;
    if (resized) size();
    drawArcs(context, width, height, 0, { x: .7, y: .89 });
    if (!painted) arcs.classList.add('is-live');
    painted = true;
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    boost = 0;
  }

  function start() {
    if (frame || !visible || !awake() || still()) return;
    previous = 0;
    y = scrollY;
    frame = requestAnimationFrame(tick);
  }

  function tick(now) {
    frame = 0;
    if (!visible || !awake()) return;
    if (still()) { stop(); rest(); status(); return; }
    const dt = previous ? Math.min(JUMP, Math.max(0, (now - previous) / 1000)) : 0;
    previous = now;
    const travelled = Math.abs(scrollY - y);
    y = scrollY;
    if (travelled) boost = Math.min(MAX_BOOST, boost + travelled * KICK);
    if (dt) boost *= Math.exp(-dt / DECAY);
    phase += dt * (IDLE + boost);

    // An affordable frame presents everything; a slow one spends only on the
    // steps it owes. A slow frame may not drop the arcs, and a fast one may not
    // keep clearing a canvas that barely moved.
    const affordable = dt <= MISS;
    const posed = pose();
    show(posed.transform);
    const arcT = posed.progress * 8 + phase * ARC;
    const moved = drawnArc === null || Math.abs(arcT - drawnArc) >= ARC_STEP;
    if (resized || affordable || moved) paint(posed, arcT);
    frame = requestAnimationFrame(tick);
  }

  function arrive() {
    status();
    if (!visible || !awake()) { stop(); return; }
    measure();
    if (still()) { stop(); rest(); return; }
    if (!painted) paint();
    start();
  }

  // Visibility and page lifetime gate every entry point; geometry is read on
  // arrival and genuine reflow, never per frame.
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(entries => {
      const next = entries.some(entry => entry.isIntersecting);
      if (next === visible) return;
      visible = next;
      if (visible) arrive();
      else { stop(); status(); }
    }, { threshold: 0 }).observe(root);
  }

  // A resize under a gate still gets the authored still at the new size.
  const reflowed = () => { if (!visible || !awake()) return; measure(); if (still()) rest(); };
  const reflow = typeof ResizeObserver === 'function' ? new ResizeObserver(reflowed) : null;
  if (reflow) reflow.observe(root);
  else addEventListener('resize', reflowed, { passive: true });

  for (const query of [reduced, forced]) query.addEventListener('change', () => { stop(); arrive(); });
  connection?.addEventListener('change', () => { stop(); arrive(); });
  addEventListener('pageshow', () => { pageActive = true; arrive(); });
  // Cancellation alone is not suspension: queued observer/preference callbacks
  // must not restart this clock before pageshow (including a bfcache return).
  addEventListener('pagehide', () => { pageActive = false; stop(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else arrive();
  });

  arrive();
}
