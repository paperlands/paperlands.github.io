import { hatchFactory } from './hatch.mjs';
import { ROTATOR, SLIDER } from './programs.mjs';
import { createNativeTurn } from './native.mjs';

const controlCanvas = document.querySelector('#control');
const drawingCanvas = document.querySelector('#drawing');
const fault = document.querySelector('#fault');
const origin = location.origin;
let session = crypto.randomUUID();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let enabled = !navigator.connection?.saveData && !reduced.matches;
let turn = null, opening = null, life = 0, suspended = false, artifact = null;
let mode = 'rotator', step = 0;
const send = (kind, detail = {}) => {
  if (!suspended) parent.postMessage({ channel: 'fourth-turn-stage', session, kind, ...detail }, origin);
};

async function initialize() {
  if (suspended || turn || opening) return;
  const mine = life;
  send('opening');
  opening = (async () => {
    try {
      const loaded = await hatchFactory();
      if (suspended || mine !== life) return;
      artifact = loaded.path;
      turn = createNativeTurn({ createHatch: loaded.createHatch, controlCanvas, drawingCanvas, send });
      turn.setStep(step);
      send('ready', { artifact: loaded.path, sources: { rotator: ROTATOR, slider: SLIDER } });
      await turn.setMode(mode);
    } catch (error) {
      if (suspended || mine !== life) return;
      turn?.dispose(); turn = null;
      fault.textContent = error.message;
      send('fault', { message: error.message, reason: error.reason });
    } finally {
      if (mine === life) opening = null;
    }
  })();
  await opening;
}
window.addEventListener('message', event => {
  const message = event.data;
  if (event.source !== parent || event.origin !== origin || message?.channel !== 'fourth-turn-page' || suspended) return;
  if (message.kind === 'hello') {
    if (turn) {
      send('ready', { artifact, sources: { rotator: ROTATOR, slider: SLIDER } });
      void turn.setMode(mode);
    } else if (enabled) { send('opening'); void initialize(); }
    else send('choice');
    return;
  }
  if (message.session !== session) return;
  if (message.kind === 'enable') { enabled = true; void initialize(); }
  if (message.kind === 'mode' && ['rotator', 'slider'].includes(message.mode)) {
    mode = message.mode; void turn?.setMode(mode);
  }
  if (message.kind === 'step' && Number.isInteger(message.step) && message.step >= 0 && message.step < 4) {
    step = message.step; turn?.setStep(step);
  }
  if (message.kind === 'replay') turn?.replay();
  if (message.kind === 'widen') turn?.widen();
  if (message.kind === 'propose') turn?.propose(message.position);
});
window.addEventListener('pagehide', () => {
  suspended = true; ++life;
  session = crypto.randomUUID();
  turn?.dispose(); turn = null; opening = null;
});
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  suspended = false;
  if (enabled) void initialize();
  else send('choice');
});
if (enabled) void initialize();
else send('choice');
