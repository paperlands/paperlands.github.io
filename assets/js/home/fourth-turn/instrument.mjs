import { ROTATOR, SLIDER, steps, drawingSource } from './programs.mjs';
import { createNativeTurn } from './native.mjs';

let surfaceId = 0;

export function bootFourthTurn(root) {
  if (!root) throw new Error('Fourth Turn root is missing.');
  const $ = selector => root.querySelector(selector);
  const drawingCanvas = $('[data-turn-drawing]'), controlCanvas = $('[data-turn-control]');
  if (!drawingCanvas || !controlCanvas || !root.dataset.hatch) throw new Error('Fourth Turn needs its canvases and hatch pin.');
  const artifact = new URL(root.dataset.hatch, location.href);
  if (artifact.origin !== location.origin) throw new Error('Fourth Turn needs a same-origin hatch.');
  const id = ++surfaceId;
  drawingCanvas.id = `fourth-turn-${id}-drawing`; controlCanvas.id = `fourth-turn-${id}-control`;
  const recipe = $('#recipe'), reading = $('#reading'), proposal = $('#propose'), fault = $('#fault');
  const compact = matchMedia('(max-width: 700px)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let step = 0, mode = 'rotator', values = { bearing: 90, length: 100 }, position = null;
  let turn = null, loading = false, generation = 0, optedIn = false, sleeping = false, disposed = false, inView = false, syncDraft = false;
  let factoryPromise = null, importAttempt = 0;
  const factory = () => {
    if (factoryPromise) return factoryPromise;
    const url = new URL(artifact);
    if (importAttempt) url.searchParams.set('retry', `${id}-${importAttempt}`);
    importAttempt++;
    factoryPromise = import(url.href).then(module => module.createHatch, error => { factoryPromise = null; throw error; });
    return factoryPromise;
  };
  const listeners = [];
  const on = (target, name, callback) => {
    target.addEventListener(name, callback);
    listeners.push(() => target.removeEventListener(name, callback));
  };
  const showStep = next => {
    step = Math.max(0, Math.min(steps.length - 1, next));
    recipe.textContent = drawingSource(step, values);
    $('#explanation').textContent = steps[step].explain;
    $('#previous').disabled = step === 0;
    $('#next').firstChild.textContent = ['gather the pairs ', 'give it a name ', 'make it a rule ', 'draw it again '][step];
    $('#next').lastElementChild.textContent = step === 3 ? '↻' : '↗';
    root.querySelectorAll('[data-step]').forEach(button => button.setAttribute('aria-current', Number(button.dataset.step) === step ? 'step' : 'false'));
    turn?.setStep(step);
  };
  const showMode = next => {
    mode = next; position = null;
    $('#control-source').textContent = mode === 'rotator' ? ROTATOR : SLIDER;
    root.querySelectorAll('[data-control]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.control === mode)));
    reading.textContent = mode === 'rotator' ? 'Preparing the turn…' : 'Preparing the distance…';
    $('#control-hint').textContent = mode === 'rotator' ? 'Drag the light around its circle.' : 'Slide the light along its line. No fixed bounds.';
    proposal.disabled = true;
    turn?.setMode(mode);
  };
  const receive = (kind, message) => {
    if (message.mode && message.mode !== mode) return;
    if (kind === 'starting') { root.dataset.state = 'starting'; proposal.disabled = true; }
    if (kind === 'control-accepted') proposal.disabled = false;
    if (kind === 'reading') {
      proposal.disabled = false;
      root.dataset.state = message.available ? 'accepted' : 'unavailable';
      if (message.available) {
        fault.hidden = true;
        values = { bearing: message.bearing, length: message.length };
        recipe.textContent = drawingSource(step, values);
        root.dataset.mode = mode; root.dataset.reading = String(message.value);
        reading.textContent = mode === 'rotator' ? `${Number(message.bearing.toFixed(2))}° turn` : `${Number(message.length.toFixed(2))} steps`;
      } else {
        reading.textContent = message.answer?.kind === 'value' && message.answer.value === null
          ? 'There is no turn at this point.' : `The light is not ready: ${message.answer?.kind ?? 'missing'}.`;
      }
      position = message.position ? [...message.position] : null;
      root.querySelectorAll('[data-coordinate]').forEach((input, index) => {
        if (syncDraft || document.activeElement !== input) input.value = position ? String(position[index]) : '';
      });
      syncDraft = false;
    }
    if (kind === 'drawing') { root.dataset.drawing = 'running'; $('#drawing-source').textContent = message.program; }
    if (kind === 'drawn') { root.dataset.drawing = 'finished'; $('#turn-await').hidden = true; }
    if (kind === 'fault') {
      root.dataset.state = 'fault'; fault.hidden = false;
      fault.textContent = `PaperLang could not continue: ${message.message}`;
      $('#enable-runtime').hidden = false; $('#enable-runtime').textContent = 'Retry PaperLang';
    }
    if (kind === 'proposal') {
      root.dataset.proposal = message.result?.kind ?? 'missing';
      $('#proposal-result').textContent = message.result?.kind === 'accept' ? 'The light has moved.'
        : message.result?.kind === 'busy' ? 'The light is still being prepared. Try again.'
        : `That point could not be used${message.result?.message ? `: ${message.result.message}` : '.'}`;
    }
  };
  const retire = () => {
    ++generation; loading = false;
    const previous = turn; turn = null;
    previous?.dispose(); proposal.disabled = true;
  };
  const begin = async () => {
    if (disposed || sleeping || loading || turn) return;
    if (!optedIn && (reduced.matches || navigator.connection?.saveData === true)) {
      root.dataset.state = 'choice'; $('#turn-await').hidden = true;
      reading.textContent = 'The light is waiting for you.'; $('#enable-runtime').hidden = false;
      return;
    }
    loading = true;
    const mine = ++generation, saved = position;
    root.dataset.state = 'loading'; fault.hidden = true;
    $('#enable-runtime').hidden = true;
    $('#turn-await').hidden = false; $('#turn-await').textContent = 'Preparing your drawing…';
    try {
      const createHatch = await factory();
      if (disposed || sleeping || mine !== generation) return;
      turn = createNativeTurn({ createHatch, drawingCanvas, controlCanvas, compact: compact.matches,
        send: (kind, detail) => { if (!disposed && mine === generation) receive(kind, detail); } });
      turn.setStep(step);
      await turn.setMode(mode);
      if (mine === generation && saved) turn?.propose(saved);
    } catch (error) {
      if (!disposed && mine === generation) receive('fault', { message: error.message });
    } finally { if (mine === generation) loading = false; }
  };
  root.querySelectorAll('[data-step]').forEach(button => on(button, 'click', () => showStep(Number(button.dataset.step))));
  root.querySelectorAll('[data-control]').forEach(button => on(button, 'click', () => showMode(button.dataset.control)));
  on($('#enable-runtime'), 'click', () => { optedIn = true; retire(); begin(); });
  on($('#previous'), 'click', () => showStep(step - 1));
  on($('#next'), 'click', () => step === 3 ? turn?.replay() : showStep(step + 1));
  on($('#replay'), 'click', () => turn?.replay());
  on($('#widen'), 'click', () => turn?.widen());
  on(proposal, 'click', () => {
    const inputs = [...root.querySelectorAll('[data-coordinate]')];
    const point = inputs.map(input => Number(input.value));
    if (inputs.some(input => !input.value.trim()) || point.length !== 3 || point.some(value => !Number.isFinite(value))) {
      $('#proposal-result').textContent = 'Enter a finite number for x, y, and z.'; return;
    }
    syncDraft = true; turn?.propose(point);
  });
  root.querySelectorAll('[data-coordinate]').forEach(input => on(input, 'keydown', event => { if (event.key === 'Enter') proposal.click(); }));
  on(root, 'keydown', event => {
    if (event.key !== 'Escape') return;
    const sheet = event.target.closest('details');
    if (!sheet?.open || (!compact.matches && sheet.id === 'recipe-panel')) return;
    sheet.open = false; sheet.querySelector('summary').focus();
  });
  const compose = () => { $('#recipe-panel').open = !compact.matches; turn?.setCompact(compact.matches); };
  on(compact, 'change', compose);
  on(window, 'pagehide', () => { sleeping = true; retire(); });
  on(window, 'pageshow', event => { if (event.persisted) { sleeping = false; if (inView) begin(); } });
  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    root.dispatchEvent(new CustomEvent('fourth-turn-visibility', { detail: { visible: inView } }));
    if (inView) begin();
  });
  observer.observe(root);
  root.dataset.enhanced = ''; proposal.disabled = true;
  showStep(0); compose();
  return {
    get step() { return step; }, get mode() { return mode; },
    dispose() { disposed = true; observer.disconnect(); retire(); for (const off of listeners.splice(0)) off(); },
  };
}
