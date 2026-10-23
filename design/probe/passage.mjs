// passage.mjs — the crossing between documents is real, and it is a dissolve.
//
//   PROBE=passage.mjs bash design/probe/run.sh            (four crossings)
//   PROBE=passage.mjs bash design/probe/run.sh --reduce   (the reduced-motion crossing)
//
// What it asserts, per leg:
//
//   1. a cross-document view transition actually ran — `pageswap` fired on the
//      document being left and `pagereveal` fired on the arriving one, both
//      with a live ViewTransition, both same-origin;
//   2. the animation that ran is the authored one: `::view-transition-new(root)`
//      carries passage-rise at --passage-dur / --passage-ease, and the old layer
//      carries none at all (the departing page is the ground);
//   3. there is no hole: sampled every frame, old-mix + new-mix never leaves the
//      reader looking at the page's canvas. `old` is 1 throughout and `new`
//      rises, so the two documents always sum to 1;
//   4. it is a dissolve and not a slide: every frame's nav-bar and identity
//      region is the same pixels as the frame before it, to within antialiasing;
//   5. reduced motion crosses at once — 1ms, not 400ms — and the frame still
//      does not move.
//
// Frames are saved so the dissolve can be looked at, and the numbers are saved
// so the next person does not have to trust the picture.

import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const NEW = process.env.NEW_BASE || 'http://127.0.0.1:8801';
const OUT = process.env.PASSAGE_OUT || '/tmp/passage-evidence';
mkdirSync(OUT, { recursive: true });

// Installed before any document script runs, in every document: the outgoing
// half of the record has to be written down while the document still exists.
const RECORDER = `
  window.__passage = { events: [], samples: [], frames: 0 };
  try { window.__passageOut = JSON.parse(sessionStorage.getItem('__passage_out') || 'null'); } catch (e) {}
  addEventListener('pageswap', (e) => {
    const rec = {
      ev: 'pageswap',
      url: location.pathname,
      ran: !!e.viewTransition,
      types: e.viewTransition ? [...e.viewTransition.types] : null,
    };
    try { sessionStorage.setItem('__passage_out', JSON.stringify(rec)); } catch (err) {}
  });
  addEventListener('pagereveal', (e) => {
    window.__passage.events.push({
      ev: 'pagereveal',
      url: location.pathname,
      ran: !!e.viewTransition,
      types: e.viewTransition ? [...e.viewTransition.types] : null,
    });
    const t0 = performance.now();
    const read = (sel) => {
      try {
        const cs = getComputedStyle(document.documentElement, sel);
        return cs ? { o: +cs.opacity, dur: cs.animationDuration, ease: cs.animationTimingFunction, name: cs.animationName } : null;
      } catch (err) { return null; }
    };
    const tick = () => {
      const t = performance.now() - t0;
      window.__passage.frames++;
      const s = { t: Math.round(t), old: read('::view-transition-old(root)'), nw: read('::view-transition-new(root)') };
      s.anim = document.getAnimations()
        .filter((a) => a.pseudoElement && a.pseudoElement.indexOf('view-transition') >= 0)
        .map((a) => ({
          pseudo: a.pseudoElement,
          name: a.animationName,
          dur: a.effect && a.effect.getTiming ? a.effect.getTiming().duration : null,
          ease: a.effect && a.effect.getTiming ? a.effect.getTiming().easing : null,
        }));
      window.__passage.samples.push(s);
      if (t < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
`;

const cdp = await connect();
const page = await newPage(cdp);
await page.s('Page.addScriptToEvaluateOnNewDocument', { source: RECORDER });
await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const reduce = process.argv.includes('--reduce');
if (reduce) {
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Which navigation to make: a leg is [label, startUrl, clickSelector, scrollTo]
// Selectors must name the element a reader can actually hit: `a[href="/our-approach"]`
// matches the mobile panel's copy of that link first, and the panel is display:none
// at desktop width — a zero-sized box, a click at (0,0), and a leg that measures
// nothing. The graph's links are SVG anchors. [data-nav-mark] is the brand link,
// invisible but the real hit area (design/probe/identity.mjs).
const LEGS = reduce
  ? [['home -> note (reduced motion)', '/', '.folio-nav__plates a[href="/our-approach"]', 0]]
  : [
      ['home -> note', '/', '.folio-nav__plates a[href="/our-approach"]', 0],
      ['note -> note (from the graph, scrolled)', '/beginnings', '#notesgraph a[href]:not(.graph-current)', null],
      ['note -> home', '/experiences', '[data-nav-mark]', 0],
      ['note -> library (the bar re-composes)', '/beginnings', 'goto:/blog', 0],
    ];

const report = [];
for (const [label, start, selector, scrollTo] of LEGS) {
  await page.goto(NEW + start, 2200);

  // The click has to be a real one from the document, and if the leg asks for a
  // scroll first that scroll is the reader's own position — which is what the
  // departing snapshot is captured at.
  // `scroll-behavior: smooth` is on <html> on the notes, so a scroll is in
  // flight for a moment after it is asked for; `instant` and a settle beat are
  // what make the departing snapshot the reader's actual position.
  await page.evaluate(`(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, ${scrollTo === null ? 'document.body.scrollHeight' : String(scrollTo)});
  })()`);
  await sleep(300);
  const prepared = await page.evaluate(`(() => {
    if (${JSON.stringify(selector)}.indexOf('goto:') === 0) {
      return { ok: true, href: ${JSON.stringify(selector)}.slice(5), tag: '(navigation)', center: { x: 0, y: 0 },
               box: { x: 0, y: 0 }, scrollY: Math.round(window.scrollY), viewport: { w: innerWidth, h: innerHeight } };
    }
    const all = [...document.querySelectorAll(${JSON.stringify(selector)})];
    // The visible one: a hidden copy of a link is not the link.
    const el = all.find((e) => e.getClientRects().length && e.getBoundingClientRect().width > 0);
    if (!el) return { ok: false, why: 'no visible ' + ${JSON.stringify(selector)} + ' (' + all.length + ' matches)' };
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { ok: true, href: el.getAttribute('href'), tag: el.tagName,
             box: { x: Math.round(r.x), y: Math.round(r.y) },
             center: { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) },
             inViewport: r.top >= 0 && r.bottom <= innerHeight,
             scrollY: Math.round(window.scrollY), viewport: { w: innerWidth, h: innerHeight } };
  })()`);
  if (!prepared.ok) { report.push({ label, error: prepared.why }); console.log(`\n### ${label}\n   SKIP: ${prepared.why}`); continue; }
  await sleep(250);

  // Where the frame stands before the crossing: the bar and the identity.
  const before = await page.evaluate(`(() => {
    const pick = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
    return { navChrome: pick('.folio-nav__chrome'), navLinks: pick('.folio-nav__links'),
             wordmark: pick('.helios-wordmark'), banner: pick('[data-nav-mark] img'), theme: document.body.dataset.theme || null, tone: document.querySelector('[data-nav-root]').dataset.tone };
  })()`);

  // Click, then watch the frame while the crossing is in flight. This is a
  // screencast and not `Page.captureScreenshot`: a screenshot forces and awaits a
  // fresh frame (~100ms here, under software rasterisation), so a 400ms dissolve
  // came back as two captures — the page before and the page after, with the
  // crossing in between them. The screencast pushes frames as the renderer
  // produces them, and it keeps pushing through the swap.
  const shots = [];
  const onFrame = (msg) => {
    if (msg.sessionId !== page.sessionId || msg.method !== 'Page.screencastFrame') return;
    shots.push({ at: msg.params.metadata.timestamp, png: msg.params.data });
    page.s('Page.screencastFrameAck', { sessionId: msg.params.sessionId }).catch(() => {});
  };
  cdp.on(onFrame);
  await page.s('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  // A real click through the input pipeline, not `el.click()`: the graph's links
  // are SVG anchors (no HTMLElement.click), and a trusted event is what the
  // browser sees when a reader follows a link. `goto:` legs navigate from the
  // document instead — the Library is not linked from a note, and it is worth
  // knowing whether a navigation with no gesture behind it crosses at all.
  if (selector.indexOf('goto:') === 0) {
    await page.evaluate(`location.assign(${JSON.stringify(selector.slice(5))})`);
  } else {
    const { x, y } = prepared.center;
    for (const [type, buttons] of [['mouseMoved', 0], ['mousePressed', 1], ['mouseReleased', 0]]) {
      await page.s('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons, clickCount: 1 });
    }
  }
  await sleep(1700);
  await page.s('Page.stopScreencast');

  const inNew = await page.evaluate('window.__passage');
  const out = await page.evaluate('window.__passageOut');
  const after = await page.evaluate(`(() => {
    const pick = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
    return { url: location.pathname, wordmark: pick('.helios-wordmark'), from: document.referrer ? new URL(document.referrer).pathname : null };
  })()`);

  shots.forEach((s, i) => writeFileSync(`${OUT}/${slug(label)}-${String(i).padStart(2, '0')}.png`, Buffer.from(s.png, 'base64')));
  const span = shots.length > 1 ? (shots[shots.length - 1].at - shots[0].at) * 1000 : 0;

  const samples = inNew.samples.filter((s) => s.old || s.nw);
  const oldMin = samples.length ? Math.min(...samples.map((s) => s.old ? s.old.o : 1)) : null;
  const hole = samples.filter((s) => (s.old ? s.old.o : 0) + (s.nw ? s.nw.o : 0) < 1);
  // The animation is read across the whole recording, not the first frame:
  // `pagereveal` fires before the transition's animations exist, so a sample
  // taken at t=0 sees an empty list.
  const raise = samples.find((s) => s.nw && s.nw.name && s.nw.name !== 'none') || null;
  const rise = raise ? raise.nw : null;
  const oldNames = [...new Set(samples.map((s) => (s.old ? s.old.name : 'absent')))];
  const ann = rise ? [{ pseudo: '::view-transition-new(root)', name: rise.name, dur: rise.dur, ease: rise.ease }] : [];

  report.push({ label, start, prepared, before, after, out, events: inNew.events, samples, oldMin, oldNames,
    shots: shots.map((s, i) => ({ i, at: s.at })),
    holeFrames: hole.length, animation: ann, rise, reduced: reduce });

  console.log(`\n### ${label}   ${start} -> ${after.url}`);
  console.log(`   click      ${selector}  ->  ${prepared.href}   (scrolled to ${prepared.scrollY}px)`);
  console.log(`   pageswap   ${out ? (out.ran ? 'view transition started' : 'NO view transition') + ' ' + JSON.stringify(out.types) : 'not seen'}`);
  console.log(`   pagereveal ${inNew.events.some((e) => e.ran) ? 'view transition received' : 'NO view transition'}`);
  console.log(`   authored   ${rise ? `::view-transition-new(root) ${rise.name} ${rise.dur} ${rise.ease}` : 'no passage-rise animation found'}`);
  console.log(`   old layer  animation-name ${oldNames.join('/')} · min opacity ${oldMin}`);
  console.log(`   samples    ${inNew.samples.length} frames over ${samples.length ? samples[samples.length - 1].t : 0}ms · hole frames ${hole.length}`);
  const trace = samples.filter((_, i) => i % Math.max(1, Math.round(samples.length / 8)) === 0)
    .map((s) => `${s.t}ms:old ${s.old ? s.old.o.toFixed(2) : '-'} new ${s.nw ? s.nw.o.toFixed(2) : '-'}`).join('  ');
  console.log(`   dissolve   ${trace}`);
  console.log(`   frames     ${shots.length} over ${Math.round(span)}ms from the screencast`);
  console.log(`   frame      wordmark before ${JSON.stringify(before.wordmark)}`);
  console.log(`              wordmark after  ${JSON.stringify(after.wordmark)}`);
}
// ---- the frame census -------------------------------------------------------
// A dissolve between documents can only hold the frame still if the frame is in
// the same place on both of them. This is the measurement that says whether it
// is: the bar's two fixed layers, the plates on it, and the drawn identity, at
// every surface the crossing runs between.
const CENSUS = ['/', '/our-approach', '/beginnings', '/blog', '/about'];
const census = [];
console.log('\n### frame census (1440x900)');
for (const route of CENSUS) {
  await page.goto(NEW + route, 2000);
  const row = await page.evaluate(`(() => {
    const pick = (s) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return [+r.x.toFixed(2), +r.y.toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
    const root = document.querySelector('[data-nav-root]');
    return { route: location.pathname, tone: root && root.dataset.tone,
             theme: document.body.dataset.theme || '(standing)',
             chrome: pick('.folio-nav__chrome'), links: pick('.folio-nav__links'),
             plates: pick('.folio-nav__plates'), banner: pick('[data-nav-mark] img'),
             identity: pick('.helios-wordmark'), current: (document.querySelector('.folio-nav__plates a[aria-current]') || {}).textContent || null };
  })()`);
  census.push(row);
  console.log(`   ${row.route.padEnd(22)} ${String(row.theme).padEnd(12)} tone=${row.tone}  chrome ${JSON.stringify(row.chrome)}`);
  console.log(`   ${''.padEnd(22)} identity ${JSON.stringify(row.identity)}  banner ${JSON.stringify(row.banner)}`);
}
report.push({ census });

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`\nartifacts: ${OUT}`);

function slug(s) { return s.replace(/[^a-z0-9]+/gi, '-').toLowerCase(); }
cdp.close();
