// Scroll changes the To Explore program's recursion depth from 2 to 6.
const scene = document.querySelector('[data-inquiry-scene]');

if (scene) {
  const section = scene.closest('.experiences-approach');
  const thought = scene.querySelector('.experiences-inquiry-thought');
  const program = scene.querySelector('[data-inquiry-program]').content.textContent.trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let hatch = null;
  let visible = false;
  let unavailable = false;
  let serial = 0;
  let frame = 0;
  let timer = 0;
  let target = '';

  function stop() {
    serial++;
    clearTimeout(timer);
    target = '';
    hatch?.dispose();
    hatch = null;
    scene.removeAttribute('data-drawing-ready');
    delete scene.dataset.recursionDepth;
  }

  function requestDrawing(depth) {
    if (document.hidden || reduced.matches || connection?.saveData || unavailable) return;
    // Hatch's camera follows the window; fit the whole triangle in portrait too.
    const scale = Math.min(1, innerWidth / innerHeight).toFixed(4);
    const key = `${depth}:${scale}`;
    if (key === target) return;
    target = key;
    const ticket = ++serial;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const { createHatch } = await import(scene.dataset.hatch);
        if (ticket !== serial || !visible || document.hidden) return;
        if (!hatch) {
          thought.append(canvas);
          hatch = createHatch(canvas, { caps: { maxCommands: 500000, maxRecurseDepth: 60 } });
        }
        const source = `fn sceneScale ${scale}\n` + program.replace(
          /tri 500\*sceneScale 4\s*$/, `tri 500*sceneScale ${depth}`
        );
        const run = await hatch.play(source);
        await run.finished;
        if (ticket !== serial) return;
        scene.dataset.recursionDepth = depth;
        scene.setAttribute('data-drawing-ready', '');
      } catch (error) {
        if (ticket !== serial) return; // A newer scroll position superseded this run.
        unavailable = true;
        stop();
        console.warn('[Experiences inquiry] Drawing unavailable:', error.message);
      }
    }, 60);
  }

  function updateMotion() {
    frame = 0;
    if (!visible) return;
    const box = section.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight * .65 - box.top) / (box.height * .8)));
    const offset = reduced.matches ? 0 : progress - .5;
    scene.style.setProperty('--apple-fall', `${(offset * 100).toFixed(2)}px`);
    scene.style.setProperty('--apple-turn', `${(offset * 24).toFixed(2)}deg`);
    requestDrawing(2 + Math.round(progress * 4));
  }

  function scheduleMotion() {
    if (visible && !frame) frame = requestAnimationFrame(updateMotion);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible) scheduleMotion();
      else stop();
    }, { rootMargin: '200px 0px' }).observe(section);
  } else {
    visible = true;
    scheduleMotion();
  }
  function refresh() {
    if (document.hidden || reduced.matches || connection?.saveData) stop();
    scheduleMotion();
  }
  addEventListener('pagehide', stop);
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', refresh);
  connection?.addEventListener('change', refresh);
  reduced.addEventListener('change', refresh);
  addEventListener('scroll', scheduleMotion, { passive: true });
  addEventListener('resize', scheduleMotion);
}
