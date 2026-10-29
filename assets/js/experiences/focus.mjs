// Helios's demand-driven reading clock, not the overture's idle orbit.
// Geometry is measured on reflow; scroll paints bounded ink and tree values.
import { subscribe, invalidate } from '../home/scroll-clock.mjs';

const root = document.querySelector('[data-look="experiences"]');
if (root) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const connection = navigator.connection;
  const still = () => reduced.matches || forced.matches || Boolean(connection?.saveData);
  const words = Array.from(root.querySelectorAll('[data-stage-focus]'), element =>
    ({ element, center: 0, height: 0, ink: 0, heat: 0, pool: 0, dry: 0, last: '' }));
  const passages = Array.from(root.querySelectorAll('[data-stage-passage]'), element =>
    ({ element, center: 0, height: 0, heat: 0, last: '' }));
  const tree = root.querySelector('.experiences-seam-field');
  const gathering = words.find(word => word.element.dataset.stageFocus === 'gather');
  let treeLast = '';
  if (!still()) {
    tree?.style.setProperty('--tree-growth', '0');
    tree?.style.setProperty('--tree-canopy', '0');
    gathering?.element.style.setProperty('--focus-bloom', '0');
  }
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = (p, from, to) => {
    const t = clamp((p - from) / (to - from));
    return t * t * (3 - 2 * t);
  };
  function rest() {
    for (const word of words) {
      for (const key of ['progress', 'heat', 'pool', 'dry', 'bloom']) word.element.style.removeProperty(`--focus-${key}`);
      word.last = '';
    }
    for (const passage of passages) {
      passage.element.style.removeProperty('--passage-heat');
      passage.last = '';
    }
    tree?.style.removeProperty('--tree-growth');
    tree?.style.removeProperty('--tree-canopy');
    treeLast = '';
    invalidate();
  }
  for (const query of [reduced, forced]) query.addEventListener('change', rest);
  connection?.addEventListener('change', rest);

  subscribe({
    measure(y) {
      for (const encounter of [...words, ...passages]) {
        const box = encounter.element.getBoundingClientRect();
        encounter.center = y + box.top + box.height * .5;
        encounter.height = box.height;
      }
    },
    paint(y, height) {
      if (still()) return;
      if (gathering) {
        const center = gathering.center - y;
        // Bare wood climbs from the root first. Blossoms wait until the
        // phrase approaches centre, completing exactly at the half-screen.
        // Twenty steps, not a new mask on every pixel. The climb and the
        // retrace stay; the gradient is not rebuilt for an invisible change.
        const quant = n => (Math.round(n * 20) / 20).toFixed(2);
        const growth = quant(ease((height * .94 - center) / (height * .39), 0, 1));
        const canopy = quant(ease((height * .57 - center) / (height * .07), 0, 1));
        const state = `${growth}:${canopy}`;
        if (state !== treeLast) {
          tree?.style.setProperty('--tree-growth', growth);
          tree?.style.setProperty('--tree-canopy', canopy);
          gathering.element.style.setProperty('--focus-bloom', canopy);
          treeLast = state;
        }
      }
      let lead = null;
      for (const word of words) {
        const center = word.center - y;
        const p = clamp((height * .88 - center) / (height * .64));
        // The brush loads, briefly gathers, then releases its almost-dry tail.
        // Nothing jitters or runs while the reader is at rest; returning retraces.
        word.ink = ease(p, .02, .68);
        word.pool = ease(p, .22, .48);
        word.dry = ease(p, .42, .88);
        word.heat = center + word.height * .5 > 0 && center - word.height * .5 < height
          ? ease(p, .04, .44) * (1 - ease(p, .7, 1)) : 0;
        if (!lead || word.heat > lead.heat) lead = word;
      }
      for (const word of words) {
        const values = [word.ink, word === lead ? word.heat * .24 : 0, word.pool, word.dry].map(n => n.toFixed(3));
        const state = values.join(':');
        if (state === word.last) continue;
        word.last = state;
        ['progress', 'heat', 'pool', 'dry'].forEach((key, i) => word.element.style.setProperty(`--focus-${key}`, values[i]));
      }
      // One practical leads the room. Neighbours retain their authored bounce;
      // no focus filament becomes another page-wide light source.
      let sun = null;
      for (const passage of passages) {
        const center = passage.center - y;
        const visible = center + passage.height * .5 > 0 && center - passage.height * .5 < height;
        passage.heat = visible ? clamp(1 - Math.abs(center - height * .52) / (height * .7 + passage.height * .25)) : 0;
        if (!sun || passage.heat > sun.heat) sun = passage;
      }
      for (const passage of passages) {
        const heat = (passage === sun ? passage.heat : 0).toFixed(3);
        if (heat === passage.last) continue;
        passage.last = heat;
        passage.element.style.setProperty('--passage-heat', heat);
      }
    },
  }, [...words, ...passages].map(encounter => encounter.element));
}
