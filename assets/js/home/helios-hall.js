/* ==========================================================================
   home/helios-hall.js — the living part of the hall
   --------------------------------------------------------------------------
   The hall itself is drawn in CSS (components/helios.css, "the hall"): the
   vault, the arches, the floor, the beacon and the stars are gradients, so the
   room exists with no JavaScript at all. This file owns the one thing a
   gradient cannot do — embers leaving the floor and rising into the light —
   and it owns nothing else.

   IT READS THE ROOM'S OWN NUMBERS. Vanishing point and horizon are two custom
   properties on the hall (`--hall-vanish`, `--hall-eye`), which every CSS layer
   also reads. The runtime asks the element for them rather than keeping a
   second copy, so a moved horizon moves the embers with it, and there is no
   pair of numbers to keep in agreement.

   WHAT IT DOES NOT DO. It never writes scroll, never touches layout, never
   paints above the copy (the canvas sits under the colophon in z-index), and
   never runs when it cannot be seen: the floor is surveyed by an
   IntersectionObserver, the tab by visibilitychange, and a canvas with no box
   (the rehearsal's `today` state) is a no-op. The loop draws nothing at all in
   `today` and `at rest`, and a reader who asked for less motion gets one still
   frame instead of a loop rather than an animation that is then undone.
   ========================================================================== */
(function () {
  var root = document.querySelector('[data-helios-hall]');
  if (!root) return;
  var canvas = root.querySelector('[data-helios-hall-embers]');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var w = 0, h = 0, eye = 0.64, vanishX = 0, scale = 1;
  var motes = [];
  var frame = 0;
  var last = 0;
  var visible = true;

  /* Two inks, not three: an ember that has just left the floor is deep, one
     that has climbed toward the beacon is white-hot. The colour lives in the
     sprite and the mote carries only its alpha, so a mote is one drawImage —
     no per-particle gradient, no per-particle filter. */
  function glow(stops) {
    var s = document.createElement('canvas');
    s.width = s.height = 32;
    var c = s.getContext('2d');
    var g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
    return s;
  }
  var INKS = [
    glow([[0, 'rgba(255,196,120,0.95)'], [0.3, 'rgba(255,153,51,0.45)'],
          [0.62, 'rgba(212,90,20,0.14)'], [1, 'rgba(212,90,20,0)']]),
    glow([[0, 'rgba(255,242,218,1)'], [0.26, 'rgba(255,214,150,0.5)'],
          [0.58, 'rgba(232,160,32,0.16)'], [1, 'rgba(212,90,20,0)']]),
  ];

  /* One mote. `born` lets a still frame be a room mid-breath instead of an
     empty one: the ages are handed out already spread across their lives. */
  function mote(born) {
    var life = 5 + Math.random() * 7;
    return {
      x: vanishX + (Math.random() - 0.5) * w * 0.92,
      y: h * (eye + 0.05 + Math.random() * 0.21),
      vy: (14 + Math.random() * 26) * scale,
      vx: (Math.random() - 0.5) * 7 * scale,
      age: born ? Math.random() * life : 0,
      life: life,
      size: (1.7 + Math.random() * 3.6) * scale,
      ink: Math.random() < 0.42 ? 1 : 0,
      seed: Math.random() * 6.283,
    };
  }

  /* The embers are a population, not a spawner with a rate: the room holds as
     many as its width can carry, and a mote that has burned out is replaced.
     Nothing accumulates, so a long residence costs the same as a short one. */
  function residents() {
    return Math.max(34, Math.min(120, Math.round(w / 16)));
  }

  function measure() {
    var box = canvas.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    w = Math.round(box.width);
    h = Math.round(box.height);
    if (!w || !h) return false;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var look = getComputedStyle(root);
    eye = (parseFloat(look.getPropertyValue('--hall-eye')) || 64) / 100;
    vanishX = w * ((parseFloat(look.getPropertyValue('--hall-vanish')) || 50) / 100);
    scale = Math.max(0.6, Math.min(1.6, h / 900));
    while (motes.length > residents()) motes.pop();
    return true;
  }

  function step(dt) {
    var want = residents();
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.age += dt;
      if (m.age >= m.life) { motes[i] = mote(false); continue; }
      m.y -= m.vy * dt;
      /* The draught runs toward the light: every ember leans on the beacon as
         it climbs, and wobbles on its own seed so the column is never a line. */
      m.x += (m.vx + (vanishX - m.x) * 0.16 + Math.sin(m.age * 1.7 + m.seed) * m.size * 1.4) * dt;
    }
    while (motes.length < want) motes.push(mote(false));
  }

  function paint(trail) {
    /* destination-out rather than a clear: a short decay leaves the embers a
       tail without ever leaving residue, and 0.26 reaches nothing in ~20
       frames. `lighter` is the ink — these are lights, and they add. */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = trail;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var t = m.age / m.life;
      var a = Math.sin(Math.PI * t);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a * 0.78;
      ctx.drawImage(INKS[m.ink], m.x - m.size / 2, m.y - m.size / 2, m.size, m.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* One still frame, for `at rest` and for reduced motion: the same room, its
     embers held. Places are random but the frame is not — it is drawn once and
     then left alone. */
  function still() {
    if (!measure()) return;
    motes.length = 0;
    for (var i = 0, n = residents(); i < n; i++) motes.push(mote(true));
    ctx.clearRect(0, 0, w, h);
    paint(1);
  }

  function tick(now) {
    frame = requestAnimationFrame(tick);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!dt || !visible || document.hidden) return;
    if (!w || !h) measure();
    if (!w || !h) return;
    step(dt);
    paint(0.26);
  }

  function running(state) { return state === 'alive' && !reduced.matches; }

  function mode() {
    var checked = root.querySelector('.helios-hall__switch input:checked');
    return checked ? checked.value : 'alive';
  }

  var state = mode();

  function apply() {
    state = mode();
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    last = 0;
    if (running(state)) { frame = requestAnimationFrame(tick); return; }
    if (state === 'rest' || reduced.matches) still();
  }

  var group = root.querySelector('.helios-hall__switch');
  if (group) group.addEventListener('change', apply);

  /* The hall is one viewport in a page: nothing runs while it is not on screen.
     `visible` is the observer's answer, not this file's opinion. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      last = 0;
    }, { rootMargin: '120px' }).observe(root);
  }

  document.addEventListener('visibilitychange', function () { last = 0; });

  /* A resize is a repaint as well as a re-measure: setting a canvas's width
     clears it, so the still frame (rest, or reduced motion) would otherwise
     be thrown away by a phone turning over or a window being dragged. */
  if ('ResizeObserver' in window) new ResizeObserver(function () {
    if (!measure()) return;
    if (!running(state)) still();
  }).observe(canvas);

  reduced.addEventListener('change', apply);
  apply();
})();
