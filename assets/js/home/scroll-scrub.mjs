// A plate whose figure is a function of scroll, not of a clock and not of a named shape.
//
// The scene declares one line and the two ends of its ink. Scroll depth through
// the plate maps onto that line; scrolling back asks for the shallower figure.
// The page scroll is never written, pinned, or prevented. The settled programme
// — the source as written — is what reduced motion and a scene without `grows`
// are handed.

import { hatchFactory } from './fourth-turn/hatch.mjs';
import { createDirectPerformer } from './paperlang/performer.mjs';
import { createRunController, PRESENTATION } from './fourth-turn/run.mjs';

const STEPS = 20;
const PLATE = { maxCommands: 500000, maxRecurseDepth: 60 };

function sample(from, to, t) {
  const q = Math.round(Math.max(0, Math.min(1, t)) * STEPS) / STEPS;
  const value = from + (to - from) * q;
  return Number.isInteger(from) && Number.isInteger(to)
    ? Math.round(value)
    : Math.round(value * 1000) / 1000;
}

function withCount(line, count) {
  return line.replace(/\d+(?:\.\d+)?(?![\s\S]*\d)/, String(count));
}

function progressOf(journey) {
  const box = journey.getBoundingClientRect();
  // Depth is how far the plate has climbed past the reading line. The same
  // number falls when the reader scrolls up. Nothing is pinned to make room.
  const depth = innerHeight * 0.72 - box.top;
  return Math.max(0, Math.min(1, depth / Math.max(box.height, 1)));
}

function boot(root) {
  const journey = root.querySelector('[data-scrub-journey]') || root;
  const stage = root.querySelector('.helios-possibility__stage') || root;
  const thought = root.querySelector('.helios-possibility__thought');
  const template = root.querySelector('[data-scrub-program]');
  const program = template ? template.content.textContent.trim() : '';
  const line = root.dataset.grows || '';
  const from = Number(root.dataset.growsFrom);
  const to = Number(root.dataset.growsTo);
  const canGrow = Boolean(line) && Number.isFinite(from) && Number.isFinite(to) && program.includes(line);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const canvas = document.createElement('canvas');
  canvas.className = 'helios-possibility__ink';
  canvas.setAttribute('aria-hidden', 'true');
  const far = stage.querySelector('.helios-possibility__echo');
  const memory = stage.querySelector('.helios-possibility__memory');
  const near = stage.querySelector('[data-plane="near"]');
  // The stage is measured here and on resize, never in the frame loop: paint()
  // writes custom properties on this stage and then used to read clientHeight
  // straight after, which is a forced style+layout flush on the tree it had just
  // invalidated — once per scroll frame, for a number that only changes on resize.
  let stageSize = stage.clientHeight;
  const measureStage = () => { stageSize = stage.clientHeight; };
  if ('ResizeObserver' in window) new ResizeObserver(measureStage).observe(stage);
  else addEventListener('resize', measureStage);
  let performer = null;
  let runs = null;
  let pin = '';
  let opening = null;
  let visible = false;
  let unavailable = false;
  let frame = 0;
  let timer = 0;
  let pending = '';
  let life = 0;

  function stop() {
    life++;
    clearTimeout(timer);
    pending = '';
    try { runs?.dispose(); } catch { /* teardown is final */ }
    try { performer?.dispose(); } catch { /* the hatch may already be gone */ }
    runs = null;
    performer = null;
    pin = '';
    opening = null;
    stage.removeAttribute('data-drawing-active');
  }

  function onState(_state, event) {
    if (event.kind === 'fault' && event.fault?.reason !== 'cancelled') {
      unavailable = true;
      stop();
      console.warn('[scroll scrub] Drawing unavailable:', event.fault?.message ?? 'drawing failed');
      return;
    }
    if (event.kind === 'visibility' || event.kind === 'finished') {
      stage.setAttribute('data-drawing-active', '');
    }
  }

  // The pinned runtime is 1,012,746 bytes of module that parses and evaluates on
  // the main thread. This plate is inside the observer's 200px margin at load, so
  // opening it eagerly put that parse in the hero's own first-frame window
  // (measured: requested at 1311ms at 1x, one 556ms task at 4x). The settled
  // figure is not urgent — the plate already shows its echo and its body, and the
  // reader is a screen away — so the parse waits for an idle frame. It is still
  // started long before the figure is asked for.
  function whenIdle() {
    return new Promise(resolve => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 1600 });
      else setTimeout(resolve, 900);
    });
  }

  function ensureRuntime() {
    if (runs) return Promise.resolve(runs);
    if (opening) return opening;
    if (unavailable || connection?.saveData || !thought) return Promise.resolve(null);
    const ticket = life;
    opening = whenIdle()
      .then(() => hatchFactory({ dataset: root.dataset }))
      .then(({ path, createHatch }) => {
        if (ticket !== life || document.hidden || !visible || connection?.saveData) return null;
        pin = path;
        if (!canvas.isConnected) thought.append(canvas);
        performer = createDirectPerformer(canvas, { path, createHatch, caps: PLATE });
        runs = createRunController({ perform: performer.perform, pin: path, onState });
        return runs;
      }).catch(error => {
        unavailable = true;
        console.warn('[scroll scrub] Drawing unavailable:', error.message);
        return null;
      }).finally(() => { opening = null; });
    return opening;
  }

  // The source text is built when a request is actually submitted: paint() runs on
  // every scroll frame, and it used to run withCount's lookahead regex over the
  // whole program and build a new string whether or not there was anything to ask
  // for.
  function sourceFor(key) {
    if (key === 'settled' || !canGrow) return program;
    return program.replace(line, withCount(line, Number(key)));
  }

  // Coalescing lives here and nowhere else. The reader's scroll only ever asks for
  // the newest figure: a run in flight is left to finish, and when it does the
  // controller submits the newest `desired` itself. The old path cancelled the run
  // in flight whenever the key had moved on, which threw away a compile and a
  // render for a figure that was already stale, and left the runtime rebuilding
  // from nothing on the next ask.
  function ask(key) {
    if (unavailable || connection?.saveData || !program) return;
    const shown = runs?.snapshot();
    if (shown?.disposition === 'running' && shown.submitted?.context?.key === key) return;
    const desiredKey = shown?.desired?.context?.key;
    const presentedKey = shown?.presented?.done === true && shown.presented.ok === true
      ? shown.presented.context?.key : undefined;
    if (key === pending || key === desiredKey || key === presentedKey) return;
    pending = key;
    clearTimeout(timer);
    const ticket = life;
    timer = setTimeout(async () => {
      const controller = await ensureRuntime();
      if (!controller || ticket !== life || !visible || document.hidden) {
        if (pending === key) pending = '';
        return;
      }
      controller.want({
        source: sourceFor(key), presentation: PRESENTATION.progressive, pin, context: { key },
      });
      if (pending === key) pending = '';
    }, canGrow && !reduced.matches ? 140 : 40);
  }

  function paint() {
    frame = 0;
    if (!visible || document.hidden) return;
    const progress = progressOf(journey);
    const motionReduced = reduced.matches;
    const light = motionReduced ? .5 : Math.sin(Math.PI * progress);
    const offset = motionReduced ? 0 : progress - .5;
    stage.style.setProperty('--ink-light', (.84 + light * .24).toFixed(3));
    stage.style.setProperty('--ember', (.12 + light * .14).toFixed(3));
    stage.style.setProperty('--growth', motionReduced || !canGrow ? '1' : progress.toFixed(3));
    stage.style.setProperty('--spiral', motionReduced ? '0deg' : (offset * 8).toFixed(2) + 'deg');
    if (far) far.style.setProperty('--dy', motionReduced ? '0px' : (offset * -2).toFixed(2) + 'px');
    if (memory) memory.style.setProperty('--dy', motionReduced ? '0px' : (offset * -6).toFixed(2) + 'px');
    if (near) {
      const fall = motionReduced ? 0 : progress * progress;
      // stageSize is kept by a ResizeObserver: reading clientHeight here flushed
      // style and layout on the very tree the lines above had just dirtied, once
      // per scroll frame.
      near.style.setProperty('--dy', (fall * stageSize * 0.09).toFixed(2) + 'px');
      near.style.setProperty('--fall-spin', (fall * 7).toFixed(2) + 'deg');
    }
    if (motionReduced || !canGrow) {
      ask('settled');
      return;
    }
    ask(String(sample(from, to, progress)));
  }

  function schedule() {
    if (visible && !frame) frame = requestAnimationFrame(paint);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) schedule();
      else stop();
    }, { rootMargin: '200px 0px' });
    observer.observe(journey);
    addEventListener('pagehide', () => observer.disconnect(), { once: true });
  } else {
    visible = true;
    schedule();
  }

  addEventListener('pagehide', stop);
  addEventListener('pageshow', () => { if (!document.hidden) schedule(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else schedule();
  });
  connection?.addEventListener('change', () => { if (connection.saveData) stop(); else schedule(); });
  reduced.addEventListener('change', () => { stop(); schedule(); });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
}

for (const root of document.querySelectorAll('[data-scroll-scrub]')) boot(root);
