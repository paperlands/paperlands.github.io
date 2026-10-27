// Run after a Jekyll build; BASE_URL can point to any served destination.
// Owns only its CDP target. Screenshots are generated artifacts under /tmp.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { connect, newPage } from './cdp.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:4012';
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Network.setCacheDisabled', { cacheDisabled: true });
await page.s('Network.setBypassServiceWorker', { bypass: true });
const report = [];
const shot = async name => {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  await writeFile(`/tmp/experiences-${name}.png`, Buffer.from(data, 'base64'));
};
try {
  for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844], [320, 800], [1920, 1080]]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await page.goto(`${base}/experiences.html`, 1200);
    await page.evaluate('document.fonts.ready');
    const state = await page.evaluate(`(() => {
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
      return {
        width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        h1: document.querySelectorAll('h1').length,
        movements: document.querySelectorAll('.experiences-movement').length,
        duplicateIds: ids.filter((id, i) => ids.indexOf(id) !== i),
        embeds: document.querySelectorAll('.experiences iframe').length,
        titleSize: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize),
        links: [...document.querySelectorAll('.experiences-jump a')].map(a => !!document.querySelector(a.hash)),
        overflow: [...document.querySelectorAll('.experiences :is(h1,h2,h3,p,summary,a,figure)')]
          .filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); })
          .filter(e => !e.classList.contains('experiences-skip')).map(e => e.className || e.tagName)
      };
    })()`);
    assert.ok(state.scrollWidth <= width, `document overflows at ${width}`);
    assert.equal(state.h1, 1);
    assert.equal(state.movements, 3);
    assert.deepEqual(state.duplicateIds, []);
    assert.deepEqual(state.overflow, [], `content overflows at ${width}`);
    assert.ok(state.links.every(Boolean));
    assert.equal(state.embeds, 0, 'no remote player loads before intent');
    await page.evaluate(`Promise.all([...document.querySelectorAll('.experiences-gathering img')].map(i => i.decode()))`);
    const opening = await page.evaluate(`(() => {
      const hero = document.querySelector('.experiences-overture');
      const prelude = document.querySelector('.experiences-prelude');
      const question = prelude.querySelector('.experiences-first-question');
      return {
        noFilm: !hero.querySelector('[data-film-frame]'),
        question: question.textContent.trim(),
        questionCount: document.querySelectorAll('.experiences-first-question').length,
        storyCount: prelude.querySelectorAll('p:not(.experiences-hero-invitation)').length,
        preludeFollows: !!(hero.compareDocumentPosition(prelude) & Node.DOCUMENT_POSITION_FOLLOWING),
        possibilitiesFollowStory: !!(prelude.compareDocumentPosition(document.getElementById('possibilities')) & Node.DOCUMENT_POSITION_FOLLOWING),
        heroHasStory: !!hero.querySelector('.experiences-first-question, .experiences-prelude'),
        images: [...hero.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0)
      };
    })()`);
    assert.ok(opening.noFilm && opening.images);
    assert.equal(opening.questionCount, 1);
    assert.equal(opening.storyCount, 3, 'all three sentences stay in one passage');
    assert.ok(opening.preludeFollows && opening.possibilitiesFollowStory, 'questions lead to stories, then ways to share');
    assert.equal(opening.heroHasStory, false, 'the hero remains title and image');
    assert.equal(opening.question, 'Meaning in math begins with asking our own questions.');
    const palette = await page.evaluate(`(() => {
      const beginElement = document.querySelector('.experiences-support h2 em');
      const begin = getComputedStyle(beginElement);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = [begin.fontStyle, begin.fontWeight, begin.fontSize, begin.fontFamily].join(' ');
      ctx.letterSpacing = begin.letterSpacing;
      // Normal HTML collapses the authored leading space at this line's start.
      const ink = ctx.measureText(beginElement.textContent.trim());
      const px = parseFloat(begin.paddingLeft), py = parseFloat(begin.paddingTop);
      const baseline = (parseFloat(begin.lineHeight) - ink.fontBoundingBoxAscent - ink.fontBoundingBoxDescent) / 2 + ink.fontBoundingBoxAscent;
      const glyphRoom = [px - ink.actualBoundingBoxLeft,
        beginElement.clientWidth - px - ink.actualBoundingBoxRight,
        py + baseline - ink.actualBoundingBoxAscent,
        beginElement.clientHeight - py - baseline - ink.actualBoundingBoxDescent];
      const sky = document.querySelector('.experiences-begin-sky');
      const word = document.querySelector('.experiences-hero-text h1 em');
      const stage = getComputedStyle(word);
      const spill = getComputedStyle(word, '::before');
      const bounds = word.getBoundingClientRect();
      const secondary = [...document.querySelectorAll('.experiences-movement h3 em, .experiences-seam h2 em, .experiences-cta em')].map(e => getComputedStyle(e));
      return { glow: stage.textShadow, core: stage.backgroundImage, fill: stage.color, clip: stage.backgroundClip,
        spill: { fill: spill.backgroundImage, width: parseFloat(spill.width), height: parseFloat(spill.height), wordWidth: bounds.width, wordHeight: bounds.height },
        hearth: getComputedStyle(document.querySelector('.experiences-finale')).backgroundImage,
        beginning: { glyphRoom, fill: begin.backgroundImage, glow: begin.textShadow, sky: sky.getAttribute('aria-hidden') === 'true' && sky.querySelector('svg').getAttribute('focusable') === 'false' && getComputedStyle(sky).pointerEvents === 'none' && !sky.querySelector('canvas') },
        secondary: secondary.map(s => ({ color: s.color, fill: s.backgroundImage, glow: s.textShadow })) };
    })()`);
    assert.notEqual(palette.glow, 'none', 'Stage keeps its glow');
    assert.equal(palette.fill, 'rgba(0, 0, 0, 0)');
    assert.equal(palette.clip, 'text', 'Stage is filled with light, not flattened to cream');
    assert.ok(['rgb(206, 157, 84)', 'rgb(255, 251, 226)', 'rgb(187, 125, 57)'].every(stop => palette.core.includes(stop)), 'Stage retains its shaded gold body and near-white core');
    assert.ok(palette.hearth.includes('201, 148, 43') && palette.hearth.includes('237, 196, 85'), 'the hearth retains its yellow-amber body and broad reflected warmth, not a pale pin');
    assert.notEqual(palette.spill.fill, 'none', 'Stage also lights the surrounding room');
    assert.ok(palette.spill.width > palette.spill.wordWidth && palette.spill.height > palette.spill.wordHeight, 'the bloom extends beyond the letters at every viewport');
    assert.ok(palette.secondary.every(s => s.fill === 'none' && s.glow === 'none'), 'secondary emphases do not repeat the spotlight');
    assert.ok(palette.beginning.fill.includes('linear-gradient') && palette.beginning.glow !== 'none', 'begin is a deliberate warm focal light, like the opening and closing');
    assert.ok(palette.beginning.sky, 'the reference vault is silent, pointer-transparent static artwork, not another renderer');
    assert.ok(palette.beginning.glyphRoom.every(room => room >= -1), 'italic g descender and question-mark overhang fit inside the gradient paint box');
    const offer = await page.evaluate(`(() => {
      const count = document.querySelector('.experiences-offer strong');
      return { count: count.textContent, underline: getComputedStyle(count).textDecorationLine };
    })()`);
    assert.equal(offer.count, '3 sessions'); assert.equal(offer.underline, 'underline');
    const headlineInk = await page.evaluate(`[...document.querySelectorAll('.experiences-movement h3 em, .experiences-seam h2 em')].map(e => ({ ink: getComputedStyle(e).color, parent: getComputedStyle(e.parentElement).color, style: getComputedStyle(e).fontStyle }))`);
    assert.equal(new Set(headlineInk.map(s => s.ink)).size, 1, 'the quieter reading emphases share one ivory ink');
    assert.ok(headlineInk.every(s => s.ink === s.parent && s.style === 'italic'), 'emphasis comes from the letterform, not a different colour');
    await shot(`${width}-hero`);
    for (const id of ['symposium', 'festival', 'workshops', 'planning']) {
      await page.evaluate(`document.getElementById('${id}').scrollIntoView()`);
      await page.evaluate(`Promise.all([...document.images].filter(i => {
        const r = i.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      }).map(i => i.decode()))`);
      await new Promise(r => setTimeout(r, 250));
      if (width === 1440 || width === 390) await shot(`${width}-${id}`);
    }
    if (width === 1440 || width === 390) {
      await page.evaluate(`document.querySelector('.experiences-finale').scrollIntoView({block: 'center'})`);
      await shot(`${width}-cta`);
    }
    await page.evaluate(`document.querySelector('.experiences-faq summary').click()`);
    assert.equal(await page.evaluate(`document.querySelector('.experiences-faq details').open`), true);
    assert.ok(await page.evaluate(`document.querySelector('.experiences-cta').getAttribute('href').length > 1`));
    const badImages = await page.evaluate(`Array.from(document.images).filter(i => i.getAttribute('src') && i.loading !== 'lazy' && i.complete && !i.naturalWidth).map(i => i.src)`);
    assert.deepEqual(badImages, []);
    report.push(state);
  }
  await page.s('Emulation.setEmulatedMedia', { features: [
    { name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' }
  ] });
  const highContrast = await page.evaluate(`(() => {
    const s = getComputedStyle(document.querySelector('.experiences-hero-text h1 em'));
    return { fill: s.backgroundImage, glow: s.textShadow,
      spill: getComputedStyle(document.querySelector('.experiences-hero-text h1 em'), '::before').display };
  })()`);
  assert.deepEqual(highContrast, { fill: 'none', glow: 'none', spill: 'none' }, 'high contrast uses plain system ink');
  // Exercise ordinary motion and deferred source attachment as well as stills.
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await page.goto(`${base}/experiences.html`, 1000);
  await page.evaluate(`document.getElementById('symposium').scrollIntoView()`);
  await new Promise(r => setTimeout(r, 1400));
  const media = await page.evaluate(`(() => { const v = document.querySelector('#symposium video'); return { source: v.currentSrc, error: v.error?.message, ready: v.readyState }; })()`);
  assert.ok(media.source, 'visible video attaches');
  assert.ok(!media.error, 'visible video decodes');
  await page.evaluate(`document.getElementById('planning').scrollIntoView()`);
  await new Promise(r => setTimeout(r, 500));
  assert.equal(await page.evaluate(`document.querySelector('#symposium video').paused`), true, 'offscreen media pauses');
  await page.s('Emulation.setScriptExecutionDisabled', { value: true });
  await page.goto(`${base}/experiences.html`, 1000);
  // DOM inspection remains available through CDP while page scripts are disabled.
  assert.equal(await page.evaluate(`document.querySelectorAll('.experiences-movement h3').length`), 3);
  assert.equal(await page.evaluate(`document.querySelectorAll('.experiences iframe').length`), 0);
  await shot('no-js');
  await page.s('Emulation.setScriptExecutionDisabled', { value: false });
  const failures = [...page.responses].filter(([url, status]) => url.startsWith(base) && status >= 400);
  assert.deepEqual(failures, [], 'no local 404s');
  assert.deepEqual(page.console.filter(e => e.type === 'exception'), []);
  console.log(JSON.stringify({ passed: true, viewports: report, media, failures }, null, 2));
} finally {
  await page.s('Page.close');
  cdp.close();
}
