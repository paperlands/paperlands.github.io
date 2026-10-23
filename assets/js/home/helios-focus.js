/* The golden thread shares the plate's read-before-write frame clock.
   The words, filament and atmosphere keep their original choreography. */
import { subscribe, schedule, invalidate } from './scroll-clock.mjs';

const root = document.querySelector('[data-look="helios"]');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const connection = navigator.connection;
  const encounters = Array.from(root.querySelectorAll('[data-helios-focus]'), word => {
    const scene = word.closest('.helios-possibility__stage, .helios-possibilities');
    return { word, atmosphere: scene?.querySelector('.helios-atmosphere'),
      call: word.dataset.heliosFocus === 'invite' && scene?.querySelector('.helios-section__call'),
      center: 0, height: 0, ink: 0, heat: 0, last: '' };
  });
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = (p, from, to) => {
    const t = clamp((p - from) / (to - from));
    return t * t * (3 - 2 * t);
  };
  function rest() {
    for (const encounter of encounters) {
      encounter.word.style.removeProperty('--focus-progress');
      encounter.word.style.removeProperty('--focus-heat');
      encounter.atmosphere?.style.removeProperty('--passage-heat');
      if (encounter.call) {
        encounter.call.style.removeProperty('--passage-heat');
        encounter.call.style.removeProperty('--passage-progress');
      }
      encounter.last = '';
    }
    invalidate();
  }
  reduced.addEventListener('change', rest);
  forced.addEventListener('change', rest);
  connection?.addEventListener('change', rest);
  subscribe({
    measure(y) {
      for (const encounter of encounters) {
        const box = encounter.word.getBoundingClientRect();
        encounter.center = y + box.top + box.height * .5;
        encounter.height = box.height;
      }
    },
    paint(y, height) {
      if (reduced.matches || forced.matches || connection?.saveData) return;
      let lead = null;
      for (const encounter of encounters) {
        const center = encounter.center - y;
        const p = clamp((height * .86 - center) / (height * .60));
        encounter.ink = ease(p, 0, .66);
        encounter.heat = center + encounter.height * .5 > 0 && center - encounter.height * .5 < height
          ? ease(p, .02, .42) * (1 - ease(p, .68, 1)) : 0;
        if (!lead || encounter.heat > lead.heat) lead = encounter;
      }
      for (const encounter of encounters) {
        const ink = encounter.ink.toFixed(3);
        const heat = (encounter === lead ? encounter.heat : 0).toFixed(3);
        const state = ink + ':' + heat;
        if (state === encounter.last) continue;
        encounter.last = state;
        encounter.word.style.setProperty('--focus-progress', ink);
        encounter.word.style.setProperty('--focus-heat', heat);
        encounter.atmosphere?.style.setProperty('--passage-heat', heat);
        if (encounter.call) {
          encounter.call.style.setProperty('--passage-heat', heat);
          encounter.call.style.setProperty('--passage-progress', ink);
        }
      }
    },
  }, encounters.map(encounter => encounter.word));
  schedule();
}
