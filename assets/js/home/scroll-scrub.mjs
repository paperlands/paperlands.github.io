// A plate whose figure is a function of scroll, not of a clock and not of a named shape.
//
// The scene declares one line and the two ends of its ink. Passage through the
// journey maps onto that line; scrolling back asks for the shallower figure.
// Nothing here calls scrollTo. The settled programme — the source as written —
// is what reduced motion and a scene without `grows` are handed.

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

function progressOf(journey, stage) {
  const journeyBox = journey.getBoundingClientRect();
  const stageBox = stage.getBoundingClientRect();
  const runway = journey.offsetHeight - stage.offsetHeight;
  if (runway < 24) {
    return Math.max(0, Math.min(1, (innerHeight * .25 - journeyBox.top) / Math.max(journeyBox.height, 1)));
  }
  // The sticky stage holds. How far the journey has climbed past it is the clock,
  // so the same passage plays backwards when the reader scrolls up.
  return Math.max(0, Math.min(1, (stageBox.top - journeyBox.top) / runway));
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

  function ensureRuntime() {
    if (runs) return Promise.resolve(runs);
    if (opening) return opening;
    if (unavailable || connection?.saveData || !thought) return Promise.resolve(null);
    const ticket = life;
    opening = hatchFactory({ dataset: root.dataset }).then(({ path, createHatch }) => {
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

  function ask(source, key) {
    if (unavailable || connection?.saveData || !program) return;
    const shown = runs?.snapshot();
    const desiredKey = shown?.desired?.context?.key;
    const presentedKey = shown?.presented?.done === true && shown.presented.ok === true
      ? shown.presented.context?.key : undefined;
    if (key === pending || key === desiredKey || key === presentedKey) return;
    pending = key;
    clearTimeout(timer);
    const ticket = life;
    timer = setTimeout(async () => {
      const flight = runs?.snapshot();
      if (flight?.disposition === 'running' && flight.submitted?.context?.key !== key) runs.cancel();
      const controller = await ensureRuntime();
      if (!controller || ticket !== life || !visible || document.hidden) {
        if (pending === key) pending = '';
        return;
      }
      const asked = controller.want({
        source, presentation: PRESENTATION.progressive, pin, context: { key },
      });
      if (pending === key) pending = '';
      if (!asked) schedule();
    }, canGrow && !reduced.matches ? 140 : 40);
  }

  function paint() {
    frame = 0;
    if (!visible || document.hidden) return;
    const progress = progressOf(journey, stage);
    const motionReduced = reduced.matches;
    const light = motionReduced ? .5 : Math.sin(Math.PI * progress);
    const offset = motionReduced ? 0 : progress - .5;
    stage.style.setProperty('--ink-light', (.84 + light * .24).toFixed(3));
    stage.style.setProperty('--ember', (.12 + light * .14).toFixed(3));
    stage.style.setProperty('--growth', motionReduced || !canGrow ? '1' : progress.toFixed(3));
    stage.style.setProperty('--spiral', motionReduced ? '0deg' : (offset * 8).toFixed(2) + 'deg');
    if (far) far.style.setProperty('--dy', motionReduced ? '0px' : (offset * -2).toFixed(2) + 'px');
    if (memory) memory.style.setProperty('--dy', motionReduced ? '0px' : (offset * -6).toFixed(2) + 'px');
    if (motionReduced || !canGrow) {
      ask(program, 'settled');
      return;
    }
    const count = sample(from, to, progress);
    ask(program.replace(line, withCount(line, count)), String(count));
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
