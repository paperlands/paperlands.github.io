/* Golden thread. Native scroll is the clock; the hot path reads only cached
   document coordinates and writes small word/light elements, never a scene.
   No autoplay, scroll writes, text replacement or continuous animation loop. */
(function () {
  'use strict';
  var root = document.querySelector('[data-look="helios"]');
  if (!root) return;
  var encounters = Array.from(root.querySelectorAll('[data-helios-focus]')).map(function (word) {
    var scene = word.closest('.helios-possibility__stage, .helios-possibilities');
    return {
      word: word,
      atmosphere: scene && scene.querySelector('.helios-atmosphere'),
      call: word.dataset.heliosFocus === 'invite' && scene && scene.querySelector('.helios-section__call'),
      center: 0,
      height: 0,
      last: '',
    };
  });
  if (!encounters.length) return;

  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var forced = matchMedia('(forced-colors: active)');
  var connection = navigator.connection;
  var frame = 0;
  var geometryDirty = true;
  var viewportHeight = innerHeight;
  var scrollPosition = scrollY;
  var paused = reduced.matches || forced.matches || !!(connection && connection.saveData);
  var clamp = function (n) { return Math.max(0, Math.min(1, n)); };
  function ease(p, from, to) {
    var t = clamp((p - from) / (to - from));
    return t * t * (3 - 2 * t);
  }
  function still() { return paused; }

  function rest() {
    encounters.forEach(function (encounter) {
      encounter.word.style.removeProperty('--focus-progress');
      encounter.word.style.removeProperty('--focus-heat');
      if (encounter.atmosphere) encounter.atmosphere.style.removeProperty('--passage-heat');
      if (encounter.call) {
        encounter.call.style.removeProperty('--passage-heat');
        encounter.call.style.removeProperty('--passage-progress');
      }
      encounter.last = '';
    });
  }
  function measure(y) {
    // Initial load, fonts, reflow and resize only. Scroll never dirties these
    // coordinates: native y changes, while the document's heading positions do not.
    encounters.forEach(function (encounter) {
      var box = encounter.word.getBoundingClientRect();
      encounter.center = y + box.top + box.height * .5;
      encounter.height = box.height;
    });
    geometryDirty = false;
  }
  function paint() {
    frame = 0;
    if (document.hidden || still()) return;
    var h = viewportHeight;
    var y = scrollPosition;
    if (geometryDirty) measure(y);
    var poses = encounters.map(function (encounter) {
      var center = encounter.center - y;
      var p = clamp((h * .86 - center) / (h * .60));
      var heat = center + encounter.height * .5 > 0 && center - encounter.height * .5 < h
        ? ease(p, .02, .42) * (1 - ease(p, .68, 1)) : 0;
      return { encounter: encounter, ink: ease(p, 0, .66), heat: heat };
    });
    var lead = poses.reduce(function (best, pose) {
      return !best || pose.heat > best.heat ? pose : best;
    }, null);
    poses.forEach(function (pose) {
      var ink = pose.ink.toFixed(3);
      var warmth = (pose === lead ? pose.heat : 0).toFixed(3);
      var state = ink + ':' + warmth;
      var encounter = pose.encounter;
      if (encounter.last === state) return;
      encounter.last = state;
      encounter.word.style.setProperty('--focus-progress', ink);
      encounter.word.style.setProperty('--focus-heat', warmth);
      if (encounter.atmosphere) encounter.atmosphere.style.setProperty('--passage-heat', warmth);
      if (encounter.call) {
        encounter.call.style.setProperty('--passage-heat', warmth);
        encounter.call.style.setProperty('--passage-progress', ink);
      }
    });
  }
  function schedule() {
    if (!frame && !document.hidden && !still()) frame = requestAnimationFrame(paint);
  }
  function onScroll() {
    // Read native y in the scroll phase, before the frame's DOM/style writers.
    // Even scrollY/innerHeight can flush style when read after another writer.
    scrollPosition = scrollY;
    schedule();
  }
  function invalidate() {
    viewportHeight = innerHeight;
    scrollPosition = scrollY;
    geometryDirty = true;
    schedule();
  }
  function preferenceChanged() {
    paused = reduced.matches || forced.matches || !!(connection && connection.saveData);
    cancelAnimationFrame(frame);
    frame = 0;
    rest();
    invalidate();
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', invalidate, { passive: true });
  addEventListener('pageshow', invalidate);
  addEventListener('pagehide', function () { cancelAnimationFrame(frame); frame = 0; });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else invalidate();
  });
  reduced.addEventListener('change', preferenceChanged);
  forced.addEventListener('change', preferenceChanged);
  if (connection) connection.addEventListener('change', preferenceChanged);
  if (document.fonts) {
    document.fonts.ready.then(invalidate);
    document.fonts.addEventListener('loadingdone', invalidate);
  }
  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(invalidate);
    encounters.forEach(function (encounter) { observer.observe(encounter.word); });
    observer.observe(root.querySelector('main') || root);
  }
  schedule();
})();
