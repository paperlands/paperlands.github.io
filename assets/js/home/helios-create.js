/* Draw the settled program for the full-width To Create scene while it is near
   the viewport. Scroll moves the artwork while it crosses the visible scene. */
const root = document.querySelector('[data-create-scene]');

if (root) {
  const stage = root.querySelector('.helios-possibility__stage');
  const art = stage.querySelector('.helios-possibility__art');
  const thought = stage.querySelector('.helios-possibility__thought');
  const program = root.querySelector('[data-possibility-program]').content.textContent.trim();
  const connection = navigator.connection;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const far = stage.querySelector('.helios-possibility__echo');
  const memory = stage.querySelector('.helios-possibility__memory');
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let hatch = null;
  let visible = false;
  let serial = 0;
  let unavailable = false;
  let frame = 0;
  let lastProgress = NaN;
  let lastReduced = null;

  function updateMotion() {
    frame = 0;
    const box = art.getBoundingClientRect();
    const viewport = innerHeight;
    // Hold the end poses outside the viewport. Movement starts when the
    // artwork's top reaches one-quarter screen and ends as its bottom passes it.
    const progress = Math.max(0, Math.min(1, (viewport * .25 - box.top) / box.height));
    const motionReduced = reduced.matches;
    if (progress === lastProgress && motionReduced === lastReduced) return;
    lastProgress = progress;
    lastReduced = motionReduced;
    const light = motionReduced ? .5 : Math.sin(Math.PI * progress);
    const offset = motionReduced ? 0 : progress - .5;
    stage.style.setProperty('--ink-light', (.84 + light * .24).toFixed(3));
    stage.style.setProperty('--ember', (.12 + light * .14).toFixed(3));
    stage.style.setProperty('--spiral', (offset * 10).toFixed(2) + 'deg');
    stage.style.setProperty('--torus-shift', (offset * 36).toFixed(2) + 'px');
    if (far) far.style.setProperty('--dy', (offset * -2).toFixed(2) + 'px');
    if (memory) memory.style.setProperty('--dy', (offset * -6).toFixed(2) + 'px');
  }

  function scheduleMotion() {
    if (!frame) frame = requestAnimationFrame(updateMotion);
  }

  function stop() {
    serial++;
    hatch?.dispose();
    hatch = null;
    stage.removeAttribute('data-drawing-active');
  }

  async function draw() {
    if (!visible || document.hidden || connection?.saveData || unavailable || hatch || !root.dataset.hatch) return;
    const ticket = ++serial;
    try {
      const { createHatch } = await import(root.dataset.hatch);
      if (ticket !== serial || !visible || document.hidden) return;
      thought.append(canvas);
      hatch = createHatch(canvas, { caps: { maxCommands: 500000, maxRecurseDepth: 60 } });
      stage.setAttribute('data-drawing-active', '');
      const run = await hatch.play(program);
      await run.finished;
    } catch (error) {
      if (ticket !== serial) return;
      unavailable = true;
      stop();
      console.warn('[To Create] Drawing unavailable:', error.message);
    }
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) { draw(); scheduleMotion(); }
      else stop();
    }, { rootMargin: '200px 0px' });
    observer.observe(root);
  } else {
    visible = true;
    draw();
    scheduleMotion();
  }
  addEventListener('pagehide', stop);
  addEventListener('pageshow', () => { draw(); scheduleMotion(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else { draw(); scheduleMotion(); }
  });
  connection?.addEventListener('change', () => { if (connection.saveData) stop(); else draw(); });
  addEventListener('scroll', scheduleMotion, { passive: true });
  addEventListener('resize', scheduleMotion);
  reduced.addEventListener('change', scheduleMotion);
  scheduleMotion();
}
