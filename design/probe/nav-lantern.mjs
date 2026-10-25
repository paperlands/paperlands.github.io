// CDP_PORT=9238 PROBE_BASE=http://127.0.0.1:4001/ node design/probe/nav-lantern.mjs
// The shared logo-lit navigation: seen (light/type) and unseen (focus/scroll).
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { connect, newPage } from './cdp.mjs';

const base = process.env.PROBE_BASE || 'http://127.0.0.1:4001/';
const out = process.env.PROBE_OUTPUT || '/tmp/nav-lantern-shots';
mkdirSync(out, { recursive: true });
const cdp = await connect();
const page = await newPage(cdp);
await page.s('Page.bringToFront');
// Exercise the local dialog handoff, not production CAPTCHA domains.
await page.s('Network.setBlockedURLs', { urls: ['https://challenges.cloudflare.com/*'] });
await page.s('Network.setCacheDisabled', { cacheDisabled: true });
await page.s('Network.setBypassServiceWorker', { bypass: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const evaluate = fn => page.evaluate(`(${fn})()`);
const key = async (key, modifiers = 0) => {
  const windowsVirtualKeyCode = key === 'Escape' ? 27 : 9;
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode, modifiers });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode, modifiers });
};
const size = async (width, height) => {
  await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1024 });
  await page.s('Emulation.setTouchEmulationEnabled', { enabled: width < 1024 });
};
const shot = async name => {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
};
async function click(selector) {
  const point = await page.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
async function open() { await click('[data-nav-open]'); await wait(2500); }
async function close() { await key('Escape'); await wait(400); }
async function visit(route = '/') {
  await page.goto(new URL(route, base).href, 1100);
  await page.evaluate('document.fonts.ready');
}
const state = () => evaluate(() => {
  const panel = document.querySelector('[data-nav-panel]');
  const button = document.querySelector('[data-nav-open]');
  const source = document.querySelector('[data-nav-light-source]') || document.querySelector('[data-nav-mark]');
  const links = [...panel.querySelectorAll('a')];
  return {
    open: button.getAttribute('aria-expanded') === 'true',
    inert: panel.inert,
    modal: document.querySelector('[data-nav-menu]').getAttribute('aria-modal'),
    locked: getComputedStyle(document.body).overflowY === 'hidden',
    focusedToggle: document.activeElement === button,
    overflow: document.documentElement.scrollWidth > innerWidth,
    width: panel.getBoundingClientRect().width,
    height: panel.getBoundingClientRect().height,
    links: links.map(a => ({ text: a.textContent.trim(), height: a.getBoundingClientRect().height, right: a.getBoundingClientRect().right, opacity: getComputedStyle(a).opacity, delay: getComputedStyle(a).transitionDelay })),
    background: [...document.querySelectorAll('[data-nav-background]')].map(e => ({ opacity: getComputedStyle(e).opacity, inert: e.inert })),
    bars: [...document.querySelectorAll('[data-nav-bars] span')].map(el => el.getBoundingClientRect().width),
    visibleCaption: !!button.querySelector('[data-nav-caption], [data-nav-sun]'),
    buttonBackground: getComputedStyle(button).backgroundColor,
    window: {
      display: getComputedStyle(panel.querySelector('[data-nav-window]')).display,
      width: panel.querySelector('[data-nav-window]').getBoundingClientRect().width,
      height: panel.querySelector('[data-nav-window]').getBoundingClientRect().height,
      clip: getComputedStyle(panel.querySelector('[data-nav-window-pane]')).clipPath,
      mask: getComputedStyle(panel.querySelector('[data-nav-window-pane]')).maskImage,
      worldMask: getComputedStyle(panel.querySelector('[data-nav-window-pane] svg')).maskImage,
      worldFilter: getComputedStyle(panel.querySelector('[data-nav-window-pane] svg')).filter,
    },
    lamp: { x: parseFloat(document.body.style.getPropertyValue('--nav-lamp-x')), y: parseFloat(document.body.style.getPropertyValue('--nav-lamp-y')) },
    source: source.getBoundingClientRect().toJSON(),
    sourceMask: getComputedStyle(source).maskImage,
    haloMask: getComputedStyle(source.querySelector('[data-nav-light-ink]') || source).maskImage,
    rootCrop: getComputedStyle(source).getPropertyValue('--mark-crop'),
    inkCrop: getComputedStyle(source.querySelector('.helios-wordmark__crop') || source).getPropertyValue('--mark-crop'),
    sourceInert: !!source.closest('[inert], [data-nav-background]'),
    glow: getComputedStyle(source.querySelector('[data-nav-light-ink]') || source).filter,
    particles: document.querySelector('[data-nav-atmosphere]').childElementCount,
    lightTransform: getComputedStyle(document.querySelector('[data-nav-atmosphere]'), '::before').transform,
    wordTransform: getComputedStyle(links[0]).transform,
    wordLeft: links[0].getBoundingClientRect().left,
    atmosphere: getComputedStyle(document.querySelector('[data-nav-atmosphere]')).backgroundColor,
  };
});
function checkOpen(s, width, height) {
  assert.equal(s.open, true);
  assert.equal(s.inert, false);
  assert.equal(s.modal, 'true');
  assert.equal(s.locked, true);
  assert.equal(s.overflow, false);
  assert.equal(s.width, width);
  assert.equal(s.height, height);
  assert.equal(s.visibleCaption, false);
  assert.equal(s.buttonBackground, 'rgba(0, 0, 0, 0)', 'no box behind the focused close control');
  assert.equal(s.bars.length, 3);
  assert.equal(s.sourceInert, false, 'never fade/inert the original identity or its ancestor');
  assert.ok(s.background.length && s.background.every(e => e.opacity === '0' && e.inert), 'background words disappear, not blurred duplicates');
  assert.equal(s.lamp.x, s.source.x + s.source.width * .075);
  assert.equal(s.lamp.y, s.source.y + s.source.height * .5);
  assert.ok(s.glow.includes('drop-shadow'), 'the actual logo is the light source');
  assert.equal(s.sourceMask, 'none', 'no rectangular mask around the logo veil');
  assert.equal(s.haloMask, 'none', 'glow must bleed outside the glyph crop');
  assert.equal(s.inkCrop, s.rootCrop, 'scroll crop still reaches the inner ink layer');
  assert.deepEqual(s.links.map(a => a.text), ['Home', 'Our Approach', 'Experiences', 'Contact Us', 'Enter PaperLand']);
  assert.ok(s.links.every(a => a.height >= 44 && a.right <= width && a.opacity === '1'));
  assert.equal(s.particles, 0, 'no starfall or particle layer');
  assert.equal(s.lightTransform, 'none', 'light fades in without scaling a rectangle');
  assert.equal(s.wordTransform, 'none', 'words emerge without falling');
  assert.ok(s.wordLeft >= s.source.x + 20, 'words are indented inward from the mark');
  assert.ok(parseFloat(s.links[4].delay) > parseFloat(s.links[0].delay), 'words cascade beneath the logo');
  assert.ok(s.window.width > s.window.height, 'touch invitation has a horizontal window');
  assert.ok(s.window.width >= 200 && s.window.height >= 72, 'the world is large enough to see on a phone');
  assert.equal(s.window.clip, 'inset(0px)', 'menu opening reveals it without hover');
  assert.ok(s.window.mask.includes('linear-gradient') && s.window.worldMask.includes('linear-gradient'), 'aperture edges dissolve into the page');
  assert.equal(s.window.worldFilter, 'none', 'geometry stays crisp, never blurred');
}

// Every built page that owns site navigation receives the very same markup.
function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? htmlFiles(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : []);
}
const built = htmlFiles(new URL('../../_site', import.meta.url).pathname).filter(file => readFileSync(file, 'utf8').includes('data-nav-root'));
for (const file of built) {
  const html = readFileSync(file, 'utf8');
  assert.ok(html.includes('data-nav-atmosphere') && html.includes('data-nav-panel') && html.includes('/assets/js/nav.js'), file);
}
console.log(`PASS shared navigation markup on all ${built.length} built pages that include site navigation`);
try {
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390]]) {
    await size(width, height);
    await visit();
    const closed = await state();
    assert.equal(closed.open, false);
    assert.equal(closed.inert, true);
    assert.ok(closed.bars[1] < closed.bars[0], 'familiar three-stroke hamburger');
    if (width === 390) await shot('phone-closed');
    await open();
    const s = await state();
    checkOpen(s, width, height);
    assert.deepEqual(s.source, closed.source, 'logo stays anchored');
    await shot(`${width}x${height}-open`);
    await key('Tab', 8);
    assert.equal(await evaluate(() => document.activeElement.hasAttribute('data-primary')), true);
    await key('Tab');
    assert.equal((await state()).focusedToggle, true);
    await key('Tab');
    assert.equal(await evaluate(() => document.activeElement === document.querySelector('[data-nav-panel] a')), true);
    await close();
    const shut = await state();
    assert.equal(shut.open, false);
    assert.equal(shut.inert, true);
    assert.equal(shut.locked, false);
    assert.equal(shut.focusedToggle, true);
    assert.ok(shut.background.every(e => e.opacity === '1' && !e.inert));
    console.log(`PASS ${width}x${height}: identity/light, collision-free page, cascade, targets, keyboard and return`);
  }

  // Sample the actual CSS timeline, not just its final static appearance.
  // Touch has no approach; the menu tap must create a fresh reveal each time.
  await size(390, 844);
  await visit();
  assert.equal(await evaluate(() => matchMedia('(hover: none)').matches), true);
  for (let opening = 0; opening < 2; opening++) {
    await click('[data-nav-open]');
    const reveal = await evaluate(() => {
      const window = document.querySelector('[data-nav-panel] [data-nav-window]');
      const pane = window.querySelector('[data-nav-window-pane]');
      const world = pane.querySelector('svg');
      const animations = window.getAnimations({ subtree: true });
      const aperture = animations.find(a => a.transitionProperty === 'clip-path');
      if (!aperture) return null;
      const { delay, duration } = aperture.effect.getTiming();
      const sample = time => {
        animations.forEach(a => { a.pause(); a.currentTime = time; });
        return { crop: parseFloat(getComputedStyle(pane).clipPath.slice(6)), world: getComputedStyle(world).transform };
      };
      const samples = [sample(delay), sample(delay + duration * .35), sample(delay + duration + 500)];
      animations.forEach(a => a.finish());
      return { delay, samples };
    });
    assert.ok(reveal, 'menu tap starts the slit animation');
    assert.ok(reveal.delay >= 500, 'the invitation is visible before its seam parts');
    const [seam, parting, world] = reveal.samples;
    assert.ok(seam.crop >= 30 && parting.crop > 0 && parting.crop < seam.crop, 'sunlit seam visibly opens');
    assert.equal(world.crop, 0);
    assert.notEqual(seam.world, parting.world, 'geometry moves beyond the opening');
    assert.notEqual(parting.world, world.world);
    await close();
  }
  console.log('PASS touch slit: seam, opening, world parallax and replay');

  // Representative surfaces: evening note, experiences composition, folio,
  // cream Library, legacy long-form. No Helios-only branch or palette leak.
  await size(390, 844);
  let reference;
  for (const route of ['/our-approach', '/experiences', '/about', '/blog', '/lesson-plans', '/rgs']) {
    await visit(route);
    await open();
    const s = await state();
    checkOpen(s, 390, 844);
    const treatment = { ink: s.atmosphere, type: await evaluate(() => getComputedStyle(document.querySelector('[data-nav-panel] a')).fontFamily) };
    if (reference) assert.deepEqual(treatment, reference);
    reference = treatment;
    await shot(route.slice(1));
    await close();
    console.log(`PASS ${route}: same lantern treatment, content restored`);
  }

  await visit();
  await evaluate(() => {
    const aside = document.createElement('aside'); aside.id = 'nav-preexisting-inert'; aside.inert = true; document.body.append(aside);
    scrollTo(0, 600);
  });
  await wait(200);
  const y = await evaluate(() => scrollY);
  await open();
  const scrolledIdentity = await state();
  assert.ok(parseFloat(scrolledIdentity.rootCrop) > 80);
  assert.equal(scrolledIdentity.inkCrop, scrolledIdentity.rootCrop, 'collapsed ink still crops inside an unmasked halo');
  await page.s('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 180, y: 500, deltaY: 300, deltaX: 0 });
  await wait(100);
  assert.equal(await evaluate(() => scrollY), y);
  await click('[data-nav-panel] a[href="/contact"]');
  await wait(400);
  assert.equal((await state()).open, false);
  assert.equal(await evaluate(() => document.querySelector('dialog.contact').open), true);
  await close();
  assert.equal((await state()).focusedToggle, true);
  assert.equal(await evaluate(() => scrollY), y);
  assert.equal(await evaluate(() => document.querySelector('#nav-preexisting-inert').inert), true);
  await evaluate(() => document.querySelector('#nav-preexisting-inert').remove());
  console.log('PASS scroll preservation, native contact handoff, focus return, pre-existing inert preservation');

  await open();
  await key('Escape');
  await click('[data-nav-open]');
  await wait(900);
  assert.equal((await state()).open, true);
  await close();
  assert.ok((await state()).background.every(e => !e.inert));
  await open();
  await size(1280, 900);
  await wait(400);
  assert.equal((await state()).open, false);
  assert.equal((await state()).locked, false);
  assert.ok((await state()).background.every(e => !e.inert && e.opacity === '1'));
  await evaluate(() => scrollTo(0, 0));
  await wait(300);
  const underline = () => evaluate(() => {
    const label = document.querySelector('.folio-nav__enter [data-nav-enter-label]');
    return { color: getComputedStyle(label).borderBottomColor, box: label.getBoundingClientRect().toJSON() };
  });
  const restingLabel = await underline();
  assert.equal(restingLabel.color, 'rgba(0, 0, 0, 0)', 'desktop invitation is quiet at rest');
  if (await evaluate(() => matchMedia('(hover: hover)').matches)) {
    const point = await evaluate(() => {
      const r = document.querySelector('.folio-nav__enter').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await wait(600);
    assert.notEqual((await underline()).color, restingLabel.color, 'hover reveals the underline');
    assert.deepEqual((await underline()).box, restingLabel.box, 'no layout shift on hover');
  }
  await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 600, y: 600 });
  await evaluate(() => document.querySelector('.folio-nav__enter').previousElementSibling.focus());
  await key('Tab');
  await wait(600);
  assert.equal(await evaluate(() => document.querySelector('.folio-nav__enter').matches(':focus-visible')), true);
  assert.notEqual((await underline()).color, restingLabel.color, 'keyboard focus reveals the underline');
  assert.deepEqual((await underline()).box, restingLabel.box, 'no layout shift on focus');
  await evaluate(() => document.activeElement.blur());
  await wait(300);
  console.log('PASS desktop invitation: quiet at rest, underline on approach, stable layout');
  await shot('desktop');
  console.log('PASS rapid reopen and desktop resize release every lock');
  for (const width of [1024, 1280, 1440, 1920]) {
    await size(width, 900);
    const composition = await evaluate(() => {
      const plates = document.querySelector('.folio-nav__plates');
      const enter = plates.querySelector('.folio-nav__enter');
      const label = enter.querySelector('[data-nav-enter-label]');
      const word = enter.querySelector('[data-nav-enter-word]');
      const p = getComputedStyle(plates), e = getComputedStyle(enter);
      return {
        plateSize: parseFloat(p.fontSize),
        gap: parseFloat(e.columnGap), outerGap: parseFloat(p.columnGap), pause: parseFloat(e.marginInlineStart),
        tracking: parseFloat(getComputedStyle(label).letterSpacing), plateTracking: parseFloat(p.letterSpacing),
        wordSize: parseFloat(getComputedStyle(word).fontSize), labelSize: parseFloat(getComputedStyle(label).fontSize),
        targets: [...plates.querySelectorAll('a')].map(a => { const r = a.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }),
        markRight: document.querySelector('[data-nav-mark]').getBoundingClientRect().right,
        viewport: innerWidth
      };
    });
    assert.equal(composition.plateSize, 15, 'desktop navigation is approximately 130% of its former size');
    assert.ok(composition.gap < composition.outerGap && composition.pause > 0, 'invitation groups tightly, with a pause before it');
    assert.ok(composition.tracking < composition.plateTracking, 'ENTER is quieter than the navigation plates');
    assert.ok(Math.abs(composition.wordSize / composition.labelSize - 1.2) < .01, 'wordmark scale stays unchanged');
    assert.ok(composition.targets.every((r, i, all) => r.left >= composition.markRight && r.right <= composition.viewport && (!i || r.left > all[i - 1].right)), `no nav collisions at ${width}`);
    assert.ok(composition.targets.every(r => Math.abs(r.top - composition.targets[0].top) < 16), 'invitation stays on the nav line');
    await shot(`desktop-${width}`);
  }
  console.log('PASS desktop grouping and collision-free composition at 1024–1920px');

  await size(390, 844);
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await open();
  assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[data-nav-atmosphere]'), '::before').transitionDuration), '0s');
  assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[data-nav-panel] a')).transitionDuration), '0s');
  assert.equal((await state()).window.clip, 'inset(0px)', 'reduced motion shows the world immediately');
  assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[data-nav-panel] [data-nav-window-pane]')).transitionDuration), '0s');
  assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[data-nav-panel] [data-nav-window-pane] svg')).transitionDuration), '0s');
  await shot('reduced-motion');
  await close();
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  await open();
  assert.equal((await state()).window.display, 'none');
  assert.equal(await evaluate(() => getComputedStyle(document.querySelector('[data-nav-atmosphere]'), '::before').display), 'none');
  await shot('forced-colors');
  await close();
  console.log('PASS reduced motion and forced colors');
  assert.equal(page.console.filter(m => m.type === 'exception').length, 0, JSON.stringify(page.console.filter(m => m.type === 'exception')));
  console.log(`Screenshots: ${out}`);
} finally {
  cdp.close();
}
