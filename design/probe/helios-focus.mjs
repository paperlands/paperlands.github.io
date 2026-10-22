// CDP_PORT=9237 PROBE_BASE=http://127.0.0.1:4017/ node design/probe/helios-focus.mjs
// Evidence for the golden thread. Screenshots use the actual page and drawing.
import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Copy stays the page's, including edits made independently of this treatment.
const expectedHeadings = JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e', `
  page = YAML.safe_load(File.read(ARGV[0]).split("---", 3)[1])
  puts JSON.generate([
    page['hero'].values_at('thesis', 'thesis_em').join(' '),
    page['see']['title'] || page['see']['thesis'],
    page['create']['title'] || page['create']['thesis'],
    page['possibilities']['title']
  ])`, new URL('../../_pages/helios.md', import.meta.url).pathname], { encoding: 'utf8' }));

const base = process.env.PROBE_BASE || 'http://127.0.0.1:4000/';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-focus-shots';
mkdirSync(out, { recursive: true });
const cdp = await connect();
const page = await newPage(cdp);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
function check(ok, name, detail = '') {
  assert.ok(ok, name + (detail ? ': ' + JSON.stringify(detail) : ''));
  checks.push(name);
  console.log('PASS', name);
}
async function shot(name) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function viewport(width, height) {
  await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 850 });
}
async function visit() {
  const url = new URL(base);
  url.searchParams.set('focus-probe', Date.now());
  await page.goto(url.href, 1600);
  await page.evaluate('document.fonts.ready');
  await wait(250);
}
async function state() {
  return page.evaluate(`(() => ({
    y: scrollY, height: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth > innerWidth,
    hero: (() => {
      const title = document.querySelector('.helios-thesis'), em = title.querySelector('em'), style = getComputedStyle(em);
      return { text: title.innerText.replace(/\\s+/g, ' ').trim(),
        prominent: style.opacity === '1' && style.textShadow !== 'none' && style.backgroundImage.includes('helios-grain.png') && !em.querySelector('[data-helios-focus]'),
        glow: style.textShadow, texture: style.backgroundImage, animation: style.animationName };
    })(),
    words: [...document.querySelectorAll('[data-helios-focus]')].map(el => {
      const s = getComputedStyle(el), ink = el.querySelector('svg'), word = el.querySelector('.helios-focus__word');
      const w = word.getBoundingClientRect(), h = el.closest('h1,h2').getBoundingClientRect();
      const scene = el.closest('section'), program = scene.querySelector('[data-scrub-program]')?.content.textContent || '';
      const sourceInk = program.match(/beColour +"([0-9a-f]{6})"/i);
      const expectedInk = sourceInk && 'rgb(' + sourceInk[1].match(/../g).map(hex => parseInt(hex, 16)).join(', ') + ')';
      const threadInk = getComputedStyle(ink.querySelector('.helios-focus__thread')).stroke;
      const callInk = getComputedStyle(scene.querySelector('.helios-section__call')).color;
      return { kind: el.dataset.heliosFocus, text: word.textContent,
        heading: el.closest('h1,h2').innerText.replace(/\\s+/g, ' ').trim(),
        ink: +s.getPropertyValue('--focus-progress'), heat: +s.getPropertyValue('--focus-heat'),
        threadInk, callInk, expectedInk,
        paletteMatches: !expectedInk || threadInk === expectedInk,
        inline: el.style.cssText, opacity: getComputedStyle(word).opacity,
        fill: getComputedStyle(word).webkitTextFillColor,
        stroke: getComputedStyle(ink.querySelector('path')).strokeDashoffset,
        echoStroke: ink.querySelector('.helios-focus__echo') && getComputedStyle(ink.querySelector('.helios-focus__echo')).strokeDashoffset,
        decorative: ink.getAttribute('aria-hidden') === 'true' && getComputedStyle(ink).pointerEvents === 'none',
        wordInside: w.left >= -1 && w.right <= innerWidth + 1,
        top: h.top, bottom: h.bottom,
      };
    })
  }))()`);
}
async function flushFrames() {
  await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}
async function place(kind, readingLine = .54) {
  await page.evaluate(`(() => {
    const el = document.querySelector('[data-helios-focus="${kind}"]');
    const b = el.getBoundingClientRect();
    scrollTo({ top: scrollY + b.top + b.height * .5 - innerHeight * ${readingLine}, behavior: 'instant' });
  })()`);
  await wait(550);
  await flushFrames();
  return (await state()).words.find(w => w.kind === kind);
}
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['phone', 390, 844], ['narrow', 320, 640], ['landscape', 640, 360]]) {
    await viewport(width, height);
    await visit();
    const first = await state();
    check(first.words.length === 3, `${name}: three scroll encounters; hero stands independently`);
    check(first.words.map(w => w.heading).join('|') === expectedHeadings.slice(1).join('|'), `${name}: copy is intact, without repeated words`, first.words.map(w => w.heading));
    check(first.hero.text === expectedHeadings[0] && first.hero.prominent, `${name}: original hero glow and texture are present before scrolling`, first.hero);
    check(first.words.every(w => w.decorative && w.opacity === '1'), `${name}: words stay readable; ink is decorative`);
    check(!first.overflow && first.words.every(w => w.wordInside), `${name}: no horizontal overflow`, first);
    check(first.words.every(w => w.paletteMatches), `${name}: focus filaments match each actual drawing's ink`, first.words);
    check(first.words.every(w => w.callInk === 'rgb(255, 153, 51)'), `${name}: all links retain the same PaperLand orange`, first.words.map(w => w.callInk));
    if (name === 'desktop' || name === 'phone') await shot(`${name}-hero-rest`);
    for (const kind of ['grow', 'gather', 'invite']) {
      const peak = await place(kind);
      const current = await state();
      check(peak.heat > .5, `${name}: ${kind} catches the reading light`, peak);
      check(peak.ink > .65, `${name}: ${kind} draws its thread`, peak);
      check(current.words.filter(w => w.heat > .5).length === 1, `${name}: only one word crests at a time`, current.words);
      check(!current.overflow, `${name}: ${kind} ink does not enlarge the page`);
      if (name === 'desktop' || name === 'phone') await shot(`${name}-${kind}`);
      const frozen = JSON.stringify(current);
      await wait(220);
      check(JSON.stringify(await state()) === frozen, `${name}: ${kind} has no idle animation clock`);
    }
    // Read a word forward, then backward. No history or one-shot entrance gate.
    const late = await place('grow', .50);
    const early = await place('grow', .78);
    check(early.ink < late.ink && early.heat < late.heat, `${name}: growth reverses with scroll`, { early, late });
    check(JSON.stringify((await state()).hero) === JSON.stringify(first.hero), `${name}: original hero treatment does not depend on scroll`);
  }

  await viewport(390, 844);
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await visit();
  await place('grow');
  const reduced = await state();
  check(reduced.words.every(w => w.ink === 1 && w.heat === .24 && !w.inline), 'Reduced motion: settled ink, no runtime pose writes', reduced);
  await shot('phone-reduced-motion');
  // Runtime changes are honoured, not just the preference at first load.
  await page.s('Emulation.setEmulatedMedia', { features: [] });
  await flushFrames();
  check((await state()).words.some(w => !!w.inline), 'Turning motion back on resumes scroll posing');
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await flushFrames();
  check((await state()).words.every(w => !w.inline), 'Turning reduced motion on clears prior poses');

  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  await visit();
  const contrast = await state();
  check(contrast.words.every(w => w.fill !== 'rgba(0, 0, 0, 0)' && !w.inline), 'Forced colors: solid system text without animated decoration', contrast);
  await shot('phone-forced-colors');

  await page.s('Emulation.setEmulatedMedia', { features: [] });
  const { identifier } = await page.s('Page.addScriptToEvaluateOnNewDocument', {
    source: `if(navigator.connection) Object.defineProperty(navigator.connection,'saveData',{get:()=>true});`,
  });
  await visit();
  await place('grow');
  check((await state()).words.every(w => !w.inline), 'Save-Data: static ornament, no runtime pose writes');
  await page.s('Page.removeScriptToEvaluateOnNewDocument', { identifier });

  await page.s('Emulation.setScriptExecutionDisabled', { value: true });
  await visit();
  const plain = await state();
  check(plain.words.length === 3 && plain.hero.prominent && plain.words.every(w => w.opacity === '1' && !w.inline) && !plain.overflow,
    'No JavaScript: original hero and three focus headings remain readable', plain);
  await shot('phone-no-js');
  await page.s('Emulation.setScriptExecutionDisabled', { value: false });

  const errors = page.console.filter(m => ['exception', 'error'].includes(m.type));
  check(!errors.length, 'No runtime exceptions', errors);
  writeFileSync(`${out}/report.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log('Evidence:', out);
} finally {
  await cdp.send('Target.closeTarget', { targetId: (await page.s('Target.getTargetInfo')).targetInfo.targetId });
  cdp.close();
}
