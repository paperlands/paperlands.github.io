/* ==========================================================================
   home/helios.js — page-local decoration for the Helios look
   --------------------------------------------------------------------------
   The shared player (assets/js/media-video.js) owns attach/release and the
   shared writer (assets/js/media-carousel.js) owns the marks. This file owns
   three things the look wants and neither of those should learn:

     1. the card rises when the writer swaps the copy (it listens for the
        `media:carousel` event the writer already dispatches);
     2. the sun flash — once, on scroll, when the build is whole (the sun up,
        the banner back at the size the hero measured for it), never on a swap;
     3. the play fill, read from `[data-media-active]` — the mark the writer
        already sets.

   The state it adds is namespaced (data-helios-copy, data-helios-flash) so it
   cannot be confused with the marks and ARIA states the player and writer
   publish. It never opens a file, never calls play(), never writes a mark,
   and never writes scroll.
   With no JavaScript the page is still a page: posters, ticker, colophon.
   With reduced motion the CSS lands the card at rest and this file
   does no state work at all, rather than animating and then undoing it.
   ========================================================================== */
(function () {
  var root = document.querySelector('[data-look="helios"]');
  if (!root) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = root.querySelector('.helios-hero');
  var copy = hero ? hero.querySelector('[data-media-slot="copy"]') : null;
  var flash = hero ? hero.querySelector('.helios-flash') : null;
  var fill = hero ? hero.querySelector('[data-helios-play]') : null;
  var wordmark = root.querySelector('.helios-wordmark');

  /* 1 + 2. The writer says the copy changed; the look makes it arrive. State is
        look-owned and namespaced (data-helios-*) so it cannot collide with
        the marks and ARIA states the shared player and writer publish. */
  function restart(el, attr, value) {
    if (!el) return;
    el.removeAttribute(attr);
    void el.offsetWidth;
    el.setAttribute(attr, value);
  }

  /* 3. Play fill. The player attaches, plays and releases; we only read the
        clock of whichever clip currently carries the active mark. */
  var active = null;
  var activeHandlers = false;

  function paint() {
    if (!fill) return;
    var p = 0;
    if (active && active.duration && isFinite(active.duration)) {
      p = Math.min(1, Math.max(0, active.currentTime / active.duration));
    }
    fill.style.width = (p * 100) + '%';
  }

  function onTime() { paint(); }

  function bindPlay() {
    var next = hero ? hero.querySelector('[data-media-active]') : null;
    if (next === active) return;
    if (active && activeHandlers) active.removeEventListener('timeupdate', onTime);
    active = next;
    activeHandlers = false;
    if (active) {
      active.addEventListener('timeupdate', onTime);
      activeHandlers = true;
    }
    paint();
  }

  /* A swap is a cross-fade (the look times it) and the card lifts. No flash
     here: the flash belongs to the scroll, below. */
  document.addEventListener('media:carousel', function (e) {
    if (!hero || !e.target || !hero.contains(e.target)) return;
    bindPlay();
    paint();
    if (reduced) return;
    restart(copy, 'data-helios-copy', 'in');
  });

  /* ---- the identity: the mark assembles --------------------------------
     The reference prototype's own choreography, kept whole: the pieces declare
     their window with data-from / data-to / data-turn and this poses them from
     scroll distance. Scroll is the only clock — there is no timer here, and
     with reduced motion nothing is written at all, so the banner simply
     stands. `data-helios-writing` is look-owned state that swaps the banner
     for the pieces. */
  var art = root.querySelector('.helios-wordmark__art');
  var intro = root.querySelector('.helios-wordmark__in');
  var dawn = root.querySelector('[data-helios-dawn]');
  var light = root.querySelector('[data-helios-light]');
  var shade = root.querySelector('[data-helios-shade]');
  var pieces = Array.prototype.slice.call(root.querySelectorAll('[data-helios-build]')).map(function (el) {
    return {
      el: el,
      kind: el.getAttribute('data-helios-build'),
      from: parseFloat(el.getAttribute('data-from')),
      to: parseFloat(el.getAttribute('data-to')),
      turn: parseFloat(el.getAttribute('data-turn')) || 0,
    };
  });

  var clamp01 = function (n) { return Math.max(0, Math.min(1, n)); };
  var phase = function (p, a, b) { var t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); };
  var geometry = null;
  var flashed = false;

  /* The flash is the scroll's clock, not the writer's. It fires once, at the
     moment the build is whole: the sun has risen (rise = 1 at p 0.70) and the
     art has carried back to the full size the hero measured the banner for
     (carry = 1 at p 0.86; measured, the art is at scale 1.000 there, with the
     sun already up since 0.75). Scrolling back down re-arms it, and the gap
     between the two thresholds means scrubbing cannot strobe it. */
  var FLASH_RISEN = 0.86;
  var FLASH_REARM = 0.62;

  function sunrise(p) {
    if (!flash) return;
    if (!flashed && p >= FLASH_RISEN) {
      flashed = true;
      restart(flash, 'data-helios-flash', 'on');
    } else if (flashed && p <= FLASH_REARM) {
      flashed = false;
    }
  }
  var previous = -1;
  var tick = 0;

  function posePiece(piece, t) {
    piece.el.setAttribute('visibility', t === 0 ? 'hidden' : 'visible');
    if (piece.kind === 'col') {
      piece.el.setAttribute('transform', 'scale(1 ' + t + ')');
      piece.el.removeAttribute('opacity');
      return;
    }
    if (piece.kind === 'roof') {
      piece.el.setAttribute('transform', 'scale(' + (0.72 + 0.28 * t) + ' ' + t + ')');
      piece.el.setAttribute('opacity', String(t));
      return;
    }
    if (piece.kind === 'sun') {
      piece.el.setAttribute('transform', 'scale(' + (0.62 + 0.38 * t) + ')');
      piece.el.setAttribute('opacity', String(t));
      return;
    }
    piece.el.setAttribute('transform', 'rotate(' + (piece.turn * (1 - t)) + ') scale(' + (0.78 + 0.22 * t) + ')');
    piece.el.setAttribute('opacity', String(t));
  }

  function pose() {
    tick = 0;
    if (!wordmark || reduced || !geometry) return;
    var p = clamp01((window.scrollY || 0) / geometry.distance);
    sunrise(p);
    var writing = wordmark.getAttribute('data-helios-writing') === 'on';
    /* Hysteresis: do not flicker the banner at the 1.0 seam. */
    if (writing ? p >= 1 : p >= 0.85) {
      if (p === previous && !writing) return;
      previous = p;
      if (writing) {
        wordmark.removeAttribute('data-helios-writing');
        if (art) art.style.transform = 'none';
        if (intro) intro.style.opacity = '0';
        if (light) light.setAttribute('opacity', '0');
        if (dawn) dawn.setAttribute('opacity', '0');
        if (shade) shade.setAttribute('opacity', '0');
        wordmark.style.setProperty('--helios-wm-veil', '0.4');
      }
      return;
    }
    if (p === previous) return;
    previous = p;
    wordmark.setAttribute('data-helios-writing', 'on');
    wordmark.style.setProperty('--helios-wm-veil', String(0.12 + 0.28 * phase(p, 0.06, 0.40)));
    var carry = phase(p, 0.06, 0.86);
    if (art) art.style.transform = 'translate(' + geometry.x * (1 - carry) + 'px, ' + geometry.y * (1 - carry)
      + 'px) scale(' + (geometry.scale + (1 - geometry.scale) * carry) + ')';
    var lift = phase(p, 0.015, 0.30);
    if (intro) {
      intro.style.opacity = String(1 - lift);
      intro.style.transform = 'translate(' + (-2 * lift) + 'px, ' + (-7 * lift) + 'px) scale('
        + (1 - 0.18 * lift) + ', ' + (1 - 0.42 * lift) + ')';
    }
    var built = 0;
    var i;
    for (i = 0; i < pieces.length; i += 1) {
      var t = phase(p, pieces[i].from, pieces[i].to);
      built += t;
      posePiece(pieces[i], t);
    }
    var rise = phase(p, 0.38, 0.70);
    var heat = phase(p, 0.38, 0.56) * (1 - phase(p, 0.72, 0.98));
    if (dawn) {
      dawn.setAttribute('opacity', String(heat * 0.92));
      dawn.setAttribute('transform', 'translate(0 ' + (26 * (1 - rise)) + ')');
    }
    var gather = phase(p, 0.20, 0.68);
    var settle = phase(p, 0.84, 1);
    var mass = pieces.length ? built / pieces.length : 0;
    if (light) light.setAttribute('opacity', String(gather * (1 - settle) * (0.22 + 0.55 * mass)));
    if (shade) shade.setAttribute('opacity', String(phase(p, 0.14, 0.42) * (1 - settle) * 0.7));
  }

  /* Measure the corner the mark is born in. The "In" span must be displayed to
     have a box, so this is also what turns the build on. */
  function measure() {
    if (!wordmark || !art || !intro || reduced) return;
    wordmark.setAttribute('data-helios-writing', 'on');
    var style = getComputedStyle(intro);
    var width = wordmark.getBoundingClientRect().width;
    var startWidth = parseFloat(style.fontSize) / 0.86 * 5.8;
    if (!width || !startWidth) return;
    geometry = {
      x: parseFloat(style.left) + intro.offsetWidth - startWidth * 249 / 1280,
      y: parseFloat(style.top) - 2,
      scale: startWidth / width,
      distance: Math.max(1, Math.round((hero ? hero.clientHeight : window.innerHeight) * 0.55)),
    };
    previous = -1;
    pose();
  }

  function schedule() {
    if (!tick) tick = window.requestAnimationFrame(pose);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', measure);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { bindPlay(); paint(); }
  });

  if (!reduced) restart(copy, 'data-helios-copy', 'in');
  bindPlay();
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
