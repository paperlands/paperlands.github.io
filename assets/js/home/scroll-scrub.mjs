// One scrub for every plate. The scene declares one line and the two ends of
// its ink. Scroll depth through the plate maps onto that line; scrolling back
// asks for the shallower figure. The page scroll is never written, pinned, or
// prevented. Paperlang stays the authoring language: a gesture selects a
// decoded frame and changes compositor-only properties.
import { curve, depthAt, frameKey, sample, STEPS } from './ink-state.mjs';
import { createInkCache } from './ink-cache.mjs';
import { subscribe, schedule } from './scroll-clock.mjs';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const forced = matchMedia('(forced-colors: active)');
const connection = navigator.connection;
const cache = createInkCache({ onReady: schedule });
const still = () => reduced.matches || forced.matches || Boolean(connection?.saveData);
reduced.addEventListener('change', schedule);
forced.addEventListener('change', schedule);
connection?.addEventListener('change', schedule);
function retryInk() { cache.retryFailures(); schedule(); }
addEventListener('online', retryInk);
addEventListener('pageshow', retryInk);
document.addEventListener('visibilitychange', () => { if (!document.hidden) retryInk(); });

function boot(root) {
  const metadata = root.querySelector('[data-scrub-frames]');
  const surface = root.querySelector('[data-scrub-ink]');
  if (!metadata || !surface) return; // The still and the story need no JavaScript.
  const scene = JSON.parse(metadata.textContent);
  /* The figure turns as it winds: one small rotation on the same scroll clock,
     not a second animation. It is centred on the passage, so the figure is
     upright halfway through and at rest. Scenes that ask for more (the torus)
     declare `twist` beside their range; the rest keep the 8° they had. */
  const swing = Number(root.dataset.twist ?? scene.grows?.twist);
  const swingDegrees = Number.isFinite(swing) ? swing : 8;
  const journey = root.querySelector('[data-scrub-journey]') || root;
  const stage = root.querySelector('.helios-possibility__stage');
  const far = stage.querySelector('.helios-possibility__echo');
  const memory = stage.querySelector('.helios-possibility__memory');
  const near = stage.querySelector('[data-plane="near"]');
  const light = stage.querySelector('.helios-possibility__light');
  const pool = stage.querySelector('.helios-possibility__pool');
  const base = new URL(root.dataset.inkBase || '/', location.href);
  const owner = {};
  let top = 0, height = 1, stageHeight = 0, scale = 1;
  let layout = '', frames = {}, ordered = [];
  let shown = surface.querySelector('img')?.currentSrc || '';
  let lastPose = '', lastDemand = '', previous = 0, active = false;

  function measure(y, viewportHeight, width) {
    const box = journey.getBoundingClientRect();
    top = y + box.top; height = box.height;
    stageHeight = stage.clientHeight;
    scale = parseFloat(getComputedStyle(stage).getPropertyValue('--thought-scale')) || 1;
    lastPose = '';
    const next = width <= 850 ? 'narrow' : 'wide';
    if (layout === next) return;
    layout = next; frames = {}; ordered = [];
    const ink = scene.layouts[layout];
    for (const [key, path] of Object.entries(ink.frames)) {
      frames[key] = { url: new URL(path.replace(/^\//, ''), base).href, width: ink.width, height: ink.height };
    }
    if (scene.grows) for (let step = 0; step <= STEPS; step++) {
      const key = String(sample(scene.grows.from, scene.grows.to, step / STEPS));
      if (!ordered.includes(key)) ordered.push(key);
    }
    lastPose = ''; lastDemand = '';
  }

  function paint(y, viewportHeight, width) {
    const visible = top + height > y && top < y + viewportHeight;
    if (!visible) {
      if (active) { cache.demand(owner, [], shown); active = false; lastDemand = ''; }
      return;
    }
    active = true;
    const progress = curve(depthAt(top, height, viewportHeight, y, width), scene.grows?.ease);
    const resting = still();
    const key = frameKey(scene.grows, progress, resting);
    const wanted = frames[key];
    if (!wanted) return;
    const demand = layout + ':' + key + ':' + resting;
    if (demand !== lastDemand) {
      const requests = [wanted];
      if (!resting) {
        const index = ordered.indexOf(key), direction = progress >= previous ? 1 : -1;
        const neighbor = frames[ordered[index + direction]];
        if (neighbor && neighbor.url !== wanted.url) requests.push(neighbor);
      }
      cache.demand(owner, requests, shown);
      lastDemand = demand;
    }
    previous = progress;
    const image = cache.read(wanted.url);
    if (image && wanted.url !== shown) {
      // Commit only a completely decoded CURRENT frame. Slow/failed assets leave
      // the previous complete figure; stale decodes never flash over a new depth.
      surface.replaceChildren(image);
      shown = wanted.url;
      root.dataset.inkFrame = key;
      cache.demand(owner, [wanted], shown);
    }
    const pose = resting ? 'still' : progress.toFixed(3);
    if (pose === lastPose) return;
    lastPose = pose;
    const heat = resting ? .5 : Math.sin(Math.PI * progress);
    const offset = resting ? 0 : progress - .5;
    const twist = resting ? 0 : offset * swingDegrees;
    const transform = `rotate(${twist.toFixed(2)}deg) scale(${scale})`;
    surface.style.transform = transform;
    surface.style.opacity = ((.84 + heat * .24) / 1.08).toFixed(3);
    if (pool) pool.style.transform = transform;
    if (light) light.style.opacity = (.24 + heat * .14).toFixed(3);
    if (far) far.style.transform = `translate3d(0,${(offset * -2).toFixed(2)}px,0)`;
    if (memory) memory.style.transform = `translate3d(0,${(offset * -6).toFixed(2)}px,0)`;
    if (near) {
      const fall = resting ? 0 : progress * progress;
      near.style.transform = `translate3d(0,${(fall * stageHeight * .09).toFixed(2)}px,0)`;
      near.style.setProperty('--fall-spin', (fall * 7).toFixed(2) + 'deg');
    }
  }
  subscribe({ measure, paint }, [journey, stage]);
}
for (const root of document.querySelectorAll('[data-scroll-scrub]')) boot(root);
