/* One anchored field, three folds. Open lives share a constant runway; only
   deliberately closing every fold releases it back into the people above.
   Automatic handoffs never correct scroll. Native details are the baseline;
   the real hatch's own ink carries the glint, growth and light ladder. */
const root = document.querySelector('[data-possibilities]');
if (root) boot(root);

function boot(root) {
  const journey = root.querySelector('[data-fold-journey]');
  const folds = root.querySelector('.helios-possibilities__chapters');
  const chapters = [...root.querySelectorAll('[data-chapter]')];
  const scenes = chapters.map(chapter => chapter.querySelector('.helios-possibility__stage'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 851px)');
  /* Depth is the fold's own clock: it runs from the first ink to the last as the
     reader moves through the chapter. Its middle is 4, which is where reduced
     motion sits, so a still fold is handed back the settled programme's own
     number rather than a second, quieter set of drawings. */
  const DEPTH_FROM = 2;
  const DEPTH_TO = 6;
  /* A near prop may keep a direction instead of the shared symmetric drift —
     an apple that rose would be a balloon. The scene declares `near_motion`;
     the prop only falls, ease-in, still descending when the fold closes. Scroll
     is the clock, so there is no loop and no landing to wait for. */
  const FALL_FRACTION = .09;
  const FALL_SPIN = 7;

  function fallDy(scene, local) {
    const height = scene.clientHeight;
    return height ? local * local * height * FALL_FRACTION : 0;
  }
  const seam = root.querySelector('[data-experience-seam]');
  const connection = navigator.connection;
  const surface = document.createElement('div');
  surface.className = 'helios-possibilities__surface';
  folds.append(surface);
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let active = -1;
  let station = 0;
  let frame = 0;
  let navigating = false;
  let arrivalTimer = 0;
  let arrivalY = null;
  let hatch = null;
  let loading = null;
  let unavailable = false;
  let serial = 0;
  let drawn = '';
  let target = '';
  let drawTimer = 0;

  scenes.forEach((scene, i) => {
    const summary = chapters[i].querySelector('summary');
    summary.id = 'fold-' + chapters[i].dataset.chapter;
    scene.id = 'scene-' + chapters[i].dataset.chapter;
    scene.setAttribute('role', 'region');
    scene.setAttribute('aria-labelledby', summary.id);
    summary.setAttribute('aria-controls', scene.id);
    scene.inert = true;
    scene.setAttribute('aria-hidden', 'true');
    surface.append(scene); // Move the actual composition, never a preview or a clone.
  });
  root.setAttribute('data-possibilities-enhanced', '');
  if (seam && 'IntersectionObserver' in window) {
    const arrival = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      seam.setAttribute('data-arrived', '');
      arrival.disconnect();
    }, { threshold: .3 });
    arrival.observe(seam);
    addEventListener('pagehide', () => arrival.disconnect(), { once: true });
  }

  function activate(index) {
    if (index === active) return;
    clearTimeout(drawTimer);
    serial++;
    drawn = target = '';
    active = index;
    root.toggleAttribute('data-folds-closed', index < 0);
    chapters.forEach((chapter, i) => {
      chapter.open = i === index;
      chapter.removeAttribute('data-drawing-ready');
      scenes[i].removeAttribute('data-drawing-ready');
      scenes[i].removeAttribute('data-drawing-active');
      scenes[i].toggleAttribute('data-current', i === index);
      scenes[i].inert = i !== index;
      scenes[i].setAttribute('aria-hidden', String(i !== index));
    });
    // Reading and tab order follow the visible fold: open header, actual
    // scene, next headers. Never detach the subtree holding keyboard focus.
    const order = index < 0 ? [surface, ...chapters] : [chapters[index], surface, ...chapters.slice(index + 1), ...chapters.slice(0, index)];
    const held = order.find(node => node.contains(document.activeElement));
    const pivot = order.indexOf(held);
    order.forEach((node, i) => { if (node !== held) folds.insertBefore(node, i < pivot ? held : null); });
    if (index >= 0) scenes[index].querySelector('[data-plane="thought"]').prepend(canvas);
    schedule();
  }
  function position() {
    const top = parseFloat(getComputedStyle(folds).top) || 0;
    const runway = Math.max(1, journey.offsetHeight - folds.offsetHeight);
    const progress = Math.max(0, Math.min(1, (top - journey.getBoundingClientRect().top) / runway));
    return { top, runway, progress };
  }
  function arrive(ended = false) {
    clearTimeout(arrivalTimer);
    arrivalTimer = setTimeout(() => {
      // A quiet gap in a long smooth scroll is not its arrival. Keep the
      // chosen fold until the destination, even if drawing delays a frame.
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      if (!ended && arrivalY !== null && Math.abs(scrollY - Math.min(arrivalY, max)) > 2) return;
      arrivalY = null;
      navigating = false;
      schedule();
    }, 220);
  }
  function navigate(index, historyEntry = false) {
    activate(index);
    if (historyEntry && location.hash !== '#' + chapters[index].id) history.pushState(null, '', '#' + chapters[index].id);
    const { top, runway } = position();
    const y = scrollY + journey.getBoundingClientRect().top - top + runway * (index + .06) / chapters.length;
    navigating = true;
    arrivalY = y;
    chapters[index].querySelector('summary').focus({ preventScroll: true });
    scrollTo({ top: y, behavior: reduced.matches ? 'instant' : 'smooth' });
    arrive();
  }
  chapters.forEach((chapter, i) => {
    chapter.querySelector('summary').addEventListener('click', event => {
      event.preventDefault();
      if (active === i) {
        // This deliberate close changes the layout. Return to the seam and
        // its compact stack in the same frame; automatic handoffs never scroll.
        const y = scrollY + root.getBoundingClientRect().top - (parseFloat(getComputedStyle(folds).top) || 0) - Math.min(120, innerHeight * .16);
        navigating = true;
        activate(-1);
        stopDrawing();
        arrivalY = Math.max(0, y);
        scrollTo({ top: arrivalY, behavior: 'instant' });
        arrive();
      } else navigate(i);
    });
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-possibility-link]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.closest('[inert]')) return;
    const index = chapters.findIndex(chapter => chapter.dataset.chapter === link.dataset.possibilityLink);
    if (index < 0) return;
    event.preventDefault();
    navigate(index, true);
  });
  function followHash() {
    const index = chapters.findIndex(chapter => '#' + chapter.id === location.hash);
    if (index >= 0) navigate(index);
  }
  addEventListener('hashchange', followHash);
  addEventListener('scrollend', () => { if (navigating) arrive(true); });
  for (const gesture of ['wheel', 'touchstart']) {
    addEventListener(gesture, () => { if (navigating) { clearTimeout(arrivalTimer); arrivalY = null; navigating = false; schedule(); } }, { passive: true });
  }
  folds.addEventListener('focusin', event => {
    // Keyboard focus can scroll a control into view, but is never a scroll fold.
    if (event.target.tagName === 'SUMMARY') { navigating = true; arrive(); }
  });

  function render() {
    frame = 0;
    const box = folds.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= innerHeight || document.hidden) {
      if (hatch || target) stopDrawing();
      return;
    }
    if (active < 0) return; // A closed stack stays closed as the reader passes.
    const { progress } = position();
    const next = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
    if (!navigating && !reduced.matches && next !== station) {
      station = next;
      activate(next);
    }
    const local = Math.max(0, Math.min(1, progress * chapters.length - active));
    const light = reduced.matches ? .5 : Math.sin(Math.PI * local);
    const scene = scenes[active];
    const chapter = chapters[active];
    const flat = chapter.hasAttribute('data-flat');
    // The body, eye and thought remain invariant. Only the remembered scraps
    // have a little depth; the drawing turns a few degrees within its own plane.
    scene.style.setProperty('--ink-light', (.84 + light * .24).toFixed(3));
    scene.style.setProperty('--ember', (.12 + light * .14).toFixed(3));
    scene.style.setProperty('--growth', reduced.matches ? '.5' : local.toFixed(3));
    scene.style.setProperty('--spiral', reduced.matches || flat ? '0deg' : ((local - .5) * 10).toFixed(2) + 'deg');
    scene.querySelectorAll('[data-plane="far"], [data-plane="memory"], [data-plane="near"]').forEach(plane => {
      if (plane.dataset.plane === 'near' && chapter.dataset.nearMotion === 'fall') {
        plane.style.setProperty('--dy', reduced.matches ? '0px' : fallDy(scene, local).toFixed(2) + 'px');
        plane.style.setProperty('--fall-spin', reduced.matches ? '0deg' : (local * FALL_SPIN).toFixed(2) + 'deg');
        return;
      }
      const amount = flat ? 0 : ({ far: -2, memory: -6, near: -18 }[plane.dataset.plane]);
      plane.style.setProperty('--dy', reduced.matches ? '0px' : ((local - .5) * amount).toFixed(2) + 'px');
    });
    if (!navigating) requestDrawing(active, reduced.matches ? (DEPTH_FROM + DEPTH_TO) / 2 : Math.round(DEPTH_FROM + local * (DEPTH_TO - DEPTH_FROM)));
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  addEventListener('scroll', () => { if (navigating) arrive(); schedule(); }, { passive: true });
  addEventListener('resize', schedule);

  async function loadHatch() {
    if (hatch) return hatch;
    if (loading) return loading;
    if (!root.dataset.hatch) unavailable = true;
    if (unavailable || connection?.saveData) return null;
    const epoch = serial;
    loading = import(root.dataset.hatch).then(({ createHatch }) => {
      if (epoch !== serial || document.hidden || active < 0 || connection?.saveData) return null;
      hatch = createHatch(canvas, { caps: { maxCommands: 500000, maxRecurseDepth: 60 } });
      return hatch;
    }).catch(error => {
      unavailable = true;
      console.warn('[parallel lives] Drawing unavailable:', error.message);
      return null;
    }).finally(() => { loading = null; schedule(); });
    return loading;
  }
  function glint() {
    if (reduced.matches) return;
    canvas.classList.remove('glint');
    void canvas.offsetWidth;
    canvas.classList.add('glint');
  }
  /* Growth is the data's, not the chapter's name: the scene that names a line in
     `grows` is the one whose drawing opens with passage, and no folded scene is
     special-cased here. `wide` on the declaration keeps the growth for the
     pinned reading the runway CSS gives it, so narrow screens and reduced motion
     keep the settled programme. */
  function growthLine(chapter) {
    const line = chapter.dataset.grows;
    if (!line) return '';
    if (chapter.hasAttribute('data-grows-wide') && (!wide.matches || reduced.matches)) return '';
    return line;
  }

  /* The reader's position is a depth between the two ends of the ink, so the last
     number on the named line — a recursion argument, a loop count — is the only
     thing that moves. The ends are the data's. */
  function grown(chapter, line, depth) {
    const from = Number(chapter.dataset.growsFrom);
    const to = Number(chapter.dataset.growsTo);
    const value = from + (to - from) * (depth - DEPTH_FROM) / (DEPTH_TO - DEPTH_FROM);
    return line.replace(/\d+(?:\.\d+)?(?![\s\S]*\d)/, String(Math.round(value * 1000) / 1000));
  }

  function requestDrawing(index, depth) {
    if (unavailable || connection?.saveData) return;
    const chapter = chapters[index];
    const line = growthLine(chapter);
    const key = chapter.dataset.chapter + (line ? ':' + depth : '');
    if (key === target || key === drawn) return;
    target = key;
    clearTimeout(drawTimer);
    drawTimer = setTimeout(async () => {
      const runtime = await loadHatch();
      if (!runtime || active !== index || target !== key || document.hidden) {
        if (target === key) target = '';
        schedule();
        return;
      }
      const epoch = ++serial;
      let program = chapter.querySelector('[data-possibility-program]').content.textContent.trim();
      if (line) program = program.replace(line, grown(chapter, line, depth));
      try {
        const wasDrawing = scenes[index].hasAttribute('data-drawing-active');
        chapter.removeAttribute('data-drawing-ready');
        scenes[index].removeAttribute('data-drawing-ready');
        if (!reduced.matches) scenes[index].setAttribute('data-drawing-active', '');
        if (wasDrawing) glint();
        const run = await runtime.play(program);
        await run.finished;
        if (epoch !== serial || active !== index) return;
        drawn = key;
        scenes[index].dataset.drawing = key;
        chapter.setAttribute('data-drawing-ready', '');
        scenes[index].setAttribute('data-drawing-ready', '');
        scenes[index].setAttribute('data-drawing-active', '');
        if (!wasDrawing) glint();
      } catch (error) {
        if (epoch !== serial) return; // A later fold/depth legitimately supersedes this run.
        unavailable = true;
        stopDrawing();
        console.warn('[parallel lives] Drawing unavailable:', error.message);
      }
    }, line ? 180 : 40);
  }
  function stopDrawing() {
    clearTimeout(drawTimer);
    serial++;
    hatch?.dispose();
    hatch = null;
    drawn = target = '';
    chapters.forEach(chapter => chapter.removeAttribute('data-drawing-ready'));
    scenes.forEach(scene => scene.removeAttribute('data-drawing-ready'));
    scenes.forEach(scene => scene.removeAttribute('data-drawing-active'));
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopDrawing(); else schedule(); });
  addEventListener('pagehide', stopDrawing);
  addEventListener('pageshow', schedule);
  reduced.addEventListener('change', () => { stopDrawing(); schedule(); });
  connection?.addEventListener('change', () => { stopDrawing(); schedule(); });
  activate(chapters.findIndex(chapter => chapter.open));
  // The browser's initial fragment scroll happens at load. Navigate after it,
  // once, rather than letting that late scroll undo an arrival in the runway.
  if (document.readyState === 'complete') followHash();
  else addEventListener('load', followHash, { once: true });
  schedule();
}
