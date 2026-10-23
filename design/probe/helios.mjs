// Render-level check for the homepage (Helios), on the shared CDP harness.
//
//   CDP_PORT=9223 node design/probe/helios.mjs [route]
//
// Requires design/probe/run.sh (which serves _site on :8801) or any server that
// resolves Jekyll's pretty permalinks. It asserts the things this page claims:
// the look is bound, the shared writer drives the shared slots, no second
// player is involved, and the page does not overflow.
import { writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';

const ROUTE = process.argv[2] || '/';
const BASE = 'http://127.0.0.1:8801';
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 780 },
  { name: 'narrow', width: 320, height: 640 },
];

// The hero's cycle is READ FROM THE PAGE, not restated here. It used to be a
// literal — `['Tinker','Experiment','Explore','Observe','Question']` — copied out
// of _pages/helios.md, and when the copy was reordered the probe went red for a
// reason that was not a bug: it was holding a stale duplicate of the
// declaration it was supposed to be testing against. The cells publish what
// they carry (`data-media-cell` with `data-title` / `data-slate`), so the
// honest assertion is DOM-versus-declaration and it cannot go stale on a copy
// edit. With no rail, a clip running out is the only way the hero advances, so
// the cycle itself is still a claim — there is a check for that below.

const cdp = await connect();
const page = await newPage(cdp);

let failures = 0;
function check(label, ok, detail) {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : `  — ${detail}`}`);
  if (!ok) failures += 1;
}

// Real box intersection. Comparing one axis lies: two boxes can share an x
// range and never touch. Both axes must overlap before it is a collision.
const hits = (a, b) =>
  !!a && !!b && a.x < b.r && b.x < a.r && a.y < b.b && b.y < a.b;

// The play fill is read from the active clip's clock, not from a timer.
// Measured only when the browser is actually playing: a blocked autoplay is
// not a page defect, and asserting on it would make this probe lie.
const clock = `(() => {
  const f = document.querySelector('[data-helios-play]');
  const v = document.querySelector('[data-media-group="how"] [data-media-active]');
  return { fill: f ? (new DOMMatrix(getComputedStyle(f).transform).a * 100) : 0, playing: v ? !v.paused : false };
})()`;

async function setViewport(width, height) {
  await page.s('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 700,
  });
}

const probe = `(() => {
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
  const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
  const hero = q('.helios-hero');
  const group = q('[data-media-group="how"]');
  const copy = q('[data-media-slot="copy"]');
  const rail = q('.helios-hero [data-media-slot="rail"]');
  const thesis = q('.helios-thesis');
  const title = q('.helios-hero [data-media-slot="title"]');
  const slate = q('[data-media-copy="slate"]');
  return {
    look: document.body.getAttribute('data-look'),
    theme: document.body.getAttribute('data-theme'),
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    hero: hero ? rect(hero) : null,
    fill: (() => { const f = q('.helios-hero [data-media-surface="fill"]'); return f ? rect(f) : null; })(),
    scrim: (() => { const f = q('.helios-hero [data-media-surface="fill"]'); return f ? getComputedStyle(f, '::after').backgroundImage.slice(0, 24) : null; })(),
    thesis: thesis ? rect(thesis) : null,
    thesisSize: parseFloat(cs(thesis, 'fontSize')),
    copy: copy ? rect(copy) : null,
    copyState: copy ? copy.getAttribute('data-helios-copy') : null,
    title: title ? title.textContent : null,
    titleFont: cs(title, 'fontFamily'),
    titleSize: parseFloat(cs(title, 'fontSize')),
    verseSize: parseFloat(cs(q('.helios-hero [data-media-slot="kicker"]'), 'fontSize')),
    titleOpacity: cs(title, 'opacity'),
    poster: !!q('[data-media-slot="frame"] img'),
    flashState: (() => { const f = q('.helios-flash'); return f ? f.getAttribute('data-helios-flash') : null; })(),
    // The swap's own timing. A cut at media.css's 0.6s is not this look's fade.
    cellFade: cs(q('[data-media-carousel="stack"] [data-media-cell]'), 'transitionDuration'),
    // Expression: the mark assembles, the people share a stage, the plate is graded.
    build: (() => {
      const wm = q('.helios-wordmark');
      const pieces = qa('[data-helios-build]');
      const banner = q('[data-helios-banner]');
      return {
        writing: wm ? wm.getAttribute('data-helios-writing') : null,
        pieces: pieces.length,
        visible: pieces.filter(p => p.getAttribute('visibility') === 'visible').length,
        banner: banner ? getComputedStyle(banner).display : null,
        art: (() => { const a = q('.helios-wordmark__art'); return a ? a.style.transform : ''; })(),
        veil: wm ? getComputedStyle(wm).getPropertyValue('--helios-wm-veil').trim() : null,
      };
    })(),
    whoLayout: cs(q('.helios-who__cards'), 'display'),
    plateFilter: (() => { const v = q('[data-media-surface="fill"] [data-media="video"]'); return v ? getComputedStyle(v).filter : null; })(),
    frameWash: (() => { const f = q('.helios-who__reel'); return f ? getComputedStyle(f, '::after').backgroundImage.slice(0, 16) : null; })(),
    titleClip: cs(title, 'clipPath'),
    titleColor: cs(title, 'color'),
    slate: slate ? slate.textContent : null,
    kicker: q('[data-media-slot="kicker"]') ? q('[data-media-slot="kicker"]').textContent.trim() : null,
    kickerTransform: cs(q('[data-media-slot="kicker"]'), 'textTransform'),
    titleTransform: cs(title, 'textTransform'),
    // The card is the reference's row: the verse, then the action, the slate
    // under the action. Element boxes lie about this — the verse's own padding
    // is part of the gap a reader sees, and a bottom edge is not a baseline —
    // so the gap is measured across the text and the baselines come from the
    // font's own metrics.
    card: (() => {
      if (!copy) return null;
      const k = copy.querySelector('[data-media-slot="kicker"]');
      const t = copy.querySelector('[data-media-slot="title"]');
      const s = copy.querySelector('[data-media-slot="slate"]');
      if (!k || !t || !s) return null;
      const range = document.createRange();
      const text = (el) => { range.selectNodeContents(el); return range.getBoundingClientRect(); };
      const canvas = document.createElement('canvas').getContext('2d');
      const metrics = (el) => {
        canvas.font = [cs(el, 'fontStyle'), cs(el, 'fontWeight'), cs(el, 'fontSize'), cs(el, 'fontFamily')].join(' ');
        const m = canvas.measureText(el.textContent.trim());
        const content = m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
        const lh = parseFloat(cs(el, 'lineHeight')) || content;
        return { m, baseline: el.getBoundingClientRect().top + (lh - content) / 2 + m.fontBoundingBoxAscent };
      };
      const km = metrics(k), tm = metrics(t), sm = metrics(s);
      const tBox = t.getBoundingClientRect(), sBox = s.getBoundingClientRect();
      return {
        gap: +(text(t).left - text(k).right).toFixed(1),
        baseline: +(km.baseline - tm.baseline).toFixed(1),
        slate: +(sBox.top - tBox.bottom).toFixed(1),
        slateInk: +((sm.baseline - sm.m.actualBoundingBoxAscent) - (tm.baseline + tm.m.actualBoundingBoxDescent)).toFixed(1),
        // The deepest descender the font has, not the one the active word
        // happens to use: "Tinker" barely descends, "Question" does.
        clearance: +((sm.baseline - sm.m.actualBoundingBoxAscent) - (tm.baseline + tm.m.fontBoundingBoxDescent)).toFixed(1),
        underAction: Math.abs(sBox.left - tBox.left) < 2,
      };
    })(),
    rail: !!rail,
    ticker: !!q('.helios-ticker'),
    tickerAnim: cs(q('.helios-ticker__track'), 'animationName'),
    tickerWords: qa('.helios-ticker b').length,
    tickerList: qa('.helios-ticker b').map(el => el.textContent.trim()),
    who: !!q('.helios-who'),
    // The declaration, as the page published it: one cell per hero item, in the
    // order the hero cycles them.
    heroCells: qa('[data-media-group="how"] [data-media-cell]').map(el => ({
      title: el.dataset.title,
      slate: el.dataset.slate,
    })),
    // data-media-active is the writer's mark on the CLIP (media-carousel.js
    // sets it on the video), so the cell is found by walking up from it.
    // (No backticks here: this whole probe body is one template literal.)
    heroActiveCell: (() => {
      const el = q('[data-media-group="how"] [data-media-active]');
      const cell = el && el.closest('[data-media-cell]');
      return cell ? { title: cell.dataset.title, slate: cell.dataset.slate } : null;
    })(),
    cards: qa('.helios-who [data-who-card]').map(el => ({
      title: el.querySelector('h3')?.textContent.trim(),
      clips: qa('.helios-who__shot').filter(shot => el.contains(shot)).map(shot => shot.querySelector('video')?.dataset.src.split('/').pop()),
      box: rect(el),
    })),
    cardsWidth: q('.helios-who__cards')?.scrollWidth - q('.helios-who__cards')?.clientWidth,
    colophon: !!q('.helios-colophon'),
    seal: !!q('.helios-seal'),
    wordmark: (() => { const w = q('.helios-wordmark'); return w ? rect(w) : null; })(),
    air: !!q('.helios-air'),
    active: qa('[data-media-group="how"] [data-media-active]').length,
    decode: qa('[data-media-group="how"] [data-media-decode]').length,
    attached: qa('[data-media="video"][data-media-attached="1"]').length,
    videos: qa('video').length,
    players: qa('script[src*="media-video.js"]').length,
    bootScript: qa('script[src*="home/helios.js"]').length,
  };
})()`;

for (const vp of VIEWPORTS) {
  console.log(`\n### /helios @ ${vp.width}x${vp.height}`);
  await setViewport(vp.width, vp.height);
  const before = page.console.length;
  const failsBefore = page.failed.length;
  await page.goto(BASE + ROUTE, 2200);
  // start at the top: the identity pose depends on scroll distance
  await page.evaluate('window.scrollTo(0, 0)');
  await new Promise(r => setTimeout(r, 400));

  const errs = page.console.slice(before).filter(x => x.type !== 'warning');
  check('no JS errors', errs.length === 0, errs.slice(0, 3).map(e => String(e.text).slice(0, 120)).join(' | '));
  // Media aborts are the player working as designed: media-video.js releases a
  // clip by taking its sources off the element (unbind) and supersedes them on
  // re-attach, which cancels whatever the browser had in flight. Measured on
  // both this build and the one before it, on about one load in three — so the
  // assertion is about resources that FAILED, not about bytes the page itself
  // called back. Everything else still counts.
  const netFails = page.failed.slice(failsBefore)
    .filter(f => !(f.type === 'Media' && /ERR_ABORTED/.test(f.err)));
  check('no failed requests', netFails.length === 0, netFails.slice(0, 3).map(f => `${f.type} ${f.err}`).join(' | '));

  const m = await page.evaluate(probe);
  {
    // The top of the act, for a human: the unborn mark and the "In".
    const shotTop = await page.s('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`/tmp/helios-${vp.name}.png`, Buffer.from(shotTop.data, 'base64'));
  }

  check('look bound', m.look === 'helios', `data-look=${m.look}`);
  check('folio theme', m.theme === 'folio', `data-theme=${m.theme}`);
  check('no horizontal overflow', m.scrollW <= m.innerW + 1, `scrollW=${m.scrollW} innerW=${m.innerW}`);
  check('hero fills the viewport', m.fill && m.fill.h >= vp.height * 0.9, m.fill && `h=${Math.round(m.fill.h)} vh=${vp.height}`);
  check('scrim paints above the plate', !!m.scrim && m.scrim !== 'none', m.scrim);
  check('thesis renders', m.thesis && m.thesis.w > 100, m.thesis && `w=${Math.round(m.thesis.w)}`);
  check('card copy slot is themed, not uppercased', m.kickerTransform === 'none', `kicker=${JSON.stringify(m.kicker)} transform=${m.kickerTransform}`);
  // What the slot shows must be what the ACTIVE CELL declares — not what this
  // file remembers the copy being. The writer writing the wrong item's copy into
  // the visible slot (an off-by-one on the carousel index) is the bug this
  // catches, and it catches it without pinning a word of the copy itself.
  check('card copy is the active cell\'s, title and slate',
    !!m.heroActiveCell && m.title === m.heroActiveCell.title && m.slate === m.heroActiveCell.slate,
    `slot=${JSON.stringify(m.title)} / ${JSON.stringify(m.slate)}` +
      `  cell=${JSON.stringify(m.heroActiveCell?.title)} / ${JSON.stringify(m.heroActiveCell?.slate)}`);
  check('card uses the serif role', /Cormorant/.test(m.titleFont || ''), m.titleFont);
  check('card title is the look brand', m.titleColor === 'rgb(255, 153, 51)', m.titleColor);
  check('card rises on swap', m.copyState === 'in', `data-helios-copy=${m.copyState}`);
  // The card is one line and one caption, not two blocks. 04-helios at 1440x900
  // measures, on the same font: 9.3px of daylight between the verse and the
  // action, and 0.0px of baseline error. The subtitle sits closer than the
  // reference's stride now — that is the ask — so the air under the action is
  // judged against the font's own descent, which no word can flatter.
  const card = m.card || {};
  const titlePx = m.titleSize;
  const wantGap = 0.32 * m.verseSize;
  check('the card is a row: verse on the action baseline',
    Math.abs(card.gap - wantGap) <= 1 && Math.abs(card.baseline) <= 1.5,
    `gap=${card.gap}px (want ${wantGap.toFixed(1)} = 0.32 of the verse, as 04-helios sets it), baselineΔ=${card.baseline}px`);
  check('the subtitle clears the action and still breathes',
    card.underAction === true && card.slate >= 0 && card.slate <= 6 && card.clearance >= 0.12 * titlePx,
    `descender clearance ${card.clearance}px (ink ${card.slateInk}px), box ${card.slate}px, action ${titlePx}px`);
  // Act one has its own scale now, so the tokens are claims: a typo in
  // --helios-hero-* would fall back to inherited 16px and read only as "small".
  check('act one keeps its own scale',
    vp.width > 700 ? m.thesisSize > 80 && m.titleSize > 40 : m.thesisSize > 44 && m.titleSize > 32,
    `thesis ${m.thesisSize}px, action ${m.titleSize}px at ${vp.width}px`);
  check('the action is lowercase, as the reference sets it', m.titleTransform === 'lowercase',
    `text-transform=${m.titleTransform}`);
  // One line must hold the widest action in the catalog, not just the active one:
  // "Experiment" is twice "Tinker" and the row is nowrap. The card is
  // shrink-to-fit on desktop and pinned between the gutters on a phone, so the
  // honest test is the room the row actually has.
  const fit = await page.evaluate(`(() => {
    const t = document.querySelector('.helios-hero [data-media-slot="title"]');
    const box = document.querySelector('.helios-hero [data-media-slot="copy"]');
    const k = document.querySelector('.helios-hero [data-media-slot="kicker"]');
    if (!t || !k || !box) return null;
    const cs = getComputedStyle(box);
    // The card grows with its content on desktop and is pinned between the
    // gutters on a phone; either way the capacity below is the room it has.
    const capacity = cs.maxWidth === 'none' ? box.clientWidth : parseFloat(cs.maxWidth);
    const gap = parseFloat(cs.columnGap) || 0;
    const range = document.createRange();
    const textW = (el) => { range.selectNodeContents(el); return range.getBoundingClientRect().width; };
    const slate = box.querySelector('[data-media-slot="slate"]');
    // The verse's box carries its own padding now, so it is the box width that
    // counts, and the second column is as wide as the wider of the two lines.
    const verse = k.getBoundingClientRect().width;
    const slateW = textW(slate);
    const was = t.textContent;
    let row = 0, word = '';
    for (const w of ${JSON.stringify((m.heroCells || []).map(c => c.title))}) {
      t.textContent = w;
      const need = verse + gap + Math.max(textW(t), slateW);
      if (need > row) { row = need; word = w; }
    }
    t.textContent = was;
    return { word, row: Math.round(row), capacity: Math.round(capacity) };
  })()`);
  check('the widest action still fits the one-line card', fit && fit.row <= fit.capacity + 1,
    fit && `"In how we ${fit.word}" needs ${fit.row}px of ${fit.capacity}px`);

  // Expression, asserted rather than described in prose.
  // At rest the mark is unborn: the "In" holds the corner and no piece has been
  // laid yet. That is the reference's behaviour, not a defect.
  check('the mark is unborn at the top of the act', m.build.writing === 'on' && m.build.pieces >= 14 && m.build.visible === 0,
    `writing=${m.build.writing} pieces=${m.build.pieces} visible=${m.build.visible}`);
  check('the pieces are carried by scroll, not a timer', /scale\(/.test(m.build.art), m.build.art);
  check('three identities share the wide stage', vp.width < 900 || (m.whoLayout === 'grid' && m.cardsWidth <= 1),
    `${m.whoLayout}, overflow=${m.cardsWidth}px`);
  check('the plate is graded', vp.width > 700 ? /sepia/.test(m.plateFilter || '') : m.plateFilter === 'none', m.plateFilter);
  check('the people carry the same wash', !!m.frameWash && m.frameWash !== 'none', m.frameWash);
  check('the title is masked, not faded', !!m.titleClip && m.titleClip !== 'none', String(m.titleClip).slice(0, 40));
  // The flash is the scroll's clock, not the writer's. Nothing has risen at the
  // top of the act, and the swap below must not light it either.
  check('no flash at the top of the act', m.flashState !== 'on', `data-helios-flash=${m.flashState}`);
  check('the swap is the reference cross-fade, not a cut', m.cellFade === '1.2s', `transition-duration=${m.cellFade}`);
  check('thesis and card do not overlap', !hits(m.thesis, m.copy), `thesisBottom=${Math.round(m.thesis?.b)} copyTop=${Math.round(m.copy?.y)}`);
  // A phone stacks the two as one block: the thesis hangs above the card rather
  // than off a percentage of the act, so the air between them is a constant.
  if (vp.width < 700) {
    const air = m.copy.y - m.thesis.b;
    check('the phone stacks the thesis above the card, one block', Math.abs(air - 48) <= 4,
      `${Math.round(air)}px of air (want 48)`);
  }
  // On a desktop the two are one block on an eye line, and it is the screen
  // being measured, not the act: the ticker is a seam *inside* the act, and the
  // eye does not know that. The seam between the boxes used to be the anchor,
  // which put a 280px thesis and a 108px card 6% too high.
  if (vp.width >= 700) {
    const centre = (m.thesis.y + m.copy.b) / 2;
    check('the copy block sits on the 45% eye line', Math.abs(centre - 0.45 * vp.height) <= 8,
      `centre ${Math.round(centre)}px of ${vp.height}px (${(centre / vp.height * 100).toFixed(1)}%)`);
  }
  // The hero carries no rail: the copy slot names the active clip and the
  // ticker beneath names all five, so a corner list of the same titles would
  // say it twice, and the hero has no empty corner to spend on a legend.
  check('the hero has no rail', m.rail === false, `rail=${m.rail}`);
  check('ticker renders and crawls', m.ticker && m.tickerAnim === 'helios-crawl', `anim=${m.tickerAnim}`);
  // "Doubles its list" is about the SEAM: the crawl wraps, so the tail has to be
  // the head or the loop visibly jumps. Asserting the halves are equal tests
  // that; asserting a count of 26 only recorded how long the list happened to be
  // on the day it was written.
  const ticker = m.tickerList || [];
  const half = ticker.length / 2;
  const doubles = ticker.length > 0 && ticker.length % 2 === 0 &&
    ticker.slice(0, half).join('|') === ticker.slice(half).join('|');
  check('ticker doubles its list', doubles, `${ticker.length} words, halves ${doubles ? 'equal' : 'DIFFER'}`);
  const titles = (m.cards || []).map(c => c.title);
  check('three distinct identities remain',
    titles.length === 3 && titles.every(Boolean) && new Set(titles).size === 3,
    titles.join(','));
  // The pairing is a property, not a cast list: every identity has footage of
  // its own, and no clip is shared between two identities. Which clip belongs to
  // which identity is the page's copy — see the note at the top of this file.
  const paired = (m.cards || []).map(c => c.clips || []);
  const fl = paired.flat();
  check('the paired footage stays with its identity',
    paired.length === 3 && paired.every(c => c.length >= 1) && fl.every(Boolean) &&
      new Set(fl).size === fl.length,
    `per card=${paired.map(c => c.length).join(',')} ids=${fl.join(',')}` +
      (new Set(fl).size === fl.length ? ' (none shared)' : ' (FOOTAGE SHARED)'));
  check('each card has visible width', m.cards.every(c => c.box.w > 120), m.cards.map(c => Math.round(c.box.w)).join(','));
  check('colophon and seal render', m.colophon && m.seal);
  check('identity renders', m.wordmark && m.wordmark.w > 80, m.wordmark && `w=${Math.round(m.wordmark.w)}`);
  check('air renders', m.air);
  check('exactly one active mark in the hero', m.active === 1, `${m.active}`);
  check('decode set is active + next', m.decode <= 2, `${m.decode}`);
  check('global decoder cap respected', m.attached <= 3, `${m.attached} attached of ${m.videos} videos`);
  check('exactly one shared player', m.players === 1, `${m.players}`);
  check('page-local decoration loaded', m.bootScript === 1, `${m.bootScript}`);

  // The nav keeps the keyboard stop; the look paints the ring on the visible
  // twin, because an outline on an opacity: 0 link is invisible. The earlier
  // rule used `nav + .helios-wordmark`, which matched nothing — the wordmark is
  // inside <main>, not a sibling of <nav>. Only a real Tab press can tell.
  if (vp.name === 'desktop') {
    await page.s('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    const focus = await page.evaluate(`(() => {
      const a = document.activeElement;
      const w = document.querySelector('.helios-wordmark');
      const cs = w ? getComputedStyle(w) : null;
      return {
        isMark: !!(a && a.matches && a.matches('[data-nav-mark]')),
        outline: cs ? cs.outlineStyle : null,
        width: cs ? parseFloat(cs.outlineWidth) || 0 : 0,
      };
    })()`);
    check('nav mark is the first keyboard stop', focus.isMark, `activeElement matches [data-nav-mark]: ${focus.isMark}`);
    check('focus ring lands on the drawn identity', focus.outline === 'solid' && focus.width > 0, `outline=${focus.outline} ${focus.width}px`);
  }

  // A still for a human to look at. The harness reports; a human adjudicates.
  const shot = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`/tmp/helios-${vp.name}-build.png`, Buffer.from(shot.data, 'base64'));
  // Drive the hero the only way it still offers: a clip runs out. The writer
  // must move the mark and rewrite the shared copy from the catalog, in order.
  const pre = await page.evaluate(probe);
  const drove = await page.evaluate(`(async () => {
    const v = document.querySelector('[data-media-group="how"] [data-media-active]');
    if (!v) return 'no active video';
    if (!v.duration || Number.isNaN(v.duration)) {
      await new Promise(r => v.addEventListener('loadedmetadata', r, { once: true }));
    }
    if (!v.duration || Number.isNaN(v.duration)) return 'no duration';
    try { await v.play(); } catch (e) { /* a blocked autoplay is not a page defect */ }
    v.currentTime = Math.max(0, v.duration - 0.25);
    return 'sought ' + v.currentTime.toFixed(2) + ' of ' + v.duration.toFixed(2);
  })()`);
  // Seeking near the end can need a fetch, so poll for the mark to move rather
  // than trusting one fixed wait; the swap then leaves a fresh clip for the fill
  // check below, which is where the timing matters.
  let after = pre;
  for (let i = 0; i < 25 && after.title === pre.title; i++) {
    await new Promise(r => setTimeout(r, 200));
    after = await page.evaluate(probe);
  }
  // The cycle, as the page declares it, plus the assertion that it IS a cycle: a
  // duplicate or a blank title would make "advances to the next" meaningless.
  const cycle = (after.heroCells || []).map(c => c.title);
  check('the hero declares a cycle of its own items',
    cycle.length >= 2 && cycle.every(Boolean) && new Set(cycle).size === cycle.length,
    cycle.join(' -> '));
  const next = cycle[(cycle.indexOf(pre.title) + 1) % cycle.length];
  check('a clip running out moves the mark', after.active === 1 && after.title === next,
    `${JSON.stringify(pre.title)} -> ${JSON.stringify(after.title)}, want ${JSON.stringify(next)}; ${drove}`);
  check('the swap keeps the decoder cap', after.attached <= 3, `${after.attached} attached`);
  check('a swap does not flash', after.flashState !== 'on', `data-helios-flash=${after.flashState} at p~0.54`);

  const f0 = await page.evaluate(clock);
  await new Promise(r => setTimeout(r, 1600));
  const f1 = await page.evaluate(clock);
  if (f0.playing && f1.playing) {
    check('play fill advances from the clip clock', f1.fill > f0.fill, `${f0.fill.toFixed(1)}% -> ${f1.fill.toFixed(1)}%`);
  } else {
    console.log('   skip  play fill — the browser did not autoplay in this run');
  }

  // Visit the people. The wide view must show the entire trio without a
  // horizontal gesture; each paired reel must hand its identity to the next
  // clip without adding a fourth active decoder or changing the title. On a
  // narrow screen the row is a loop: it opens on the middle identity and
  // wraps in both directions through two still-only clones of its edge cards.
  const wide = vp.width >= 900;
  // Which real card the strip is centred on (a clone at rest means a wrap is
  // in flight), or -1 when none is.
  const centred = `(() => {
    const track = document.querySelector('.helios-who__cards');
    const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
    const cards = Array.from(track.querySelectorAll('[data-who-card]'));
    let best = -1, dist = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(card.getBoundingClientRect().left + card.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return dist <= 2 ? best : -1;
  })()`;
  const whoState = await page.evaluate(`(async () => {
    const section = document.querySelector('.helios-who');
    section.scrollIntoView({ behavior: 'instant' });
    await new Promise(r => setTimeout(r, 400));
    const cards = Array.from(section.querySelectorAll('[data-who-card]'));
    const track = section.querySelector('.helios-who__cards');
    const focus = ${wide} ? 0 : Math.floor(cards.length / 2);
    const before = cards.map(card => Array.from(card.querySelectorAll('video')).findIndex(v => v.hasAttribute('data-media-active')));
    const clips = Array.from(cards[focus].querySelectorAll('video'));
    const old = before[focus];
    if (old >= 0) clips[old].dispatchEvent(new Event('ended'));
    const after = cards.map(card => Array.from(card.querySelectorAll('video')).findIndex(v => v.hasAttribute('data-media-active')));
    const r = section.getBoundingClientRect();
    return { focus, before, after, width: track.scrollWidth - track.clientWidth,
      inside: cards.every(card => { const c = card.getBoundingClientRect(); return c.left >= r.left - 1 && c.right <= r.right + 1; }),
      centred: ${centred},
      attached: document.querySelectorAll('[data-media="video"][data-media-attached="1"]').length };
  })()`);
  if (wide) check('the full trio fits on desktop', whoState.width <= 1 && whoState.inside,
    `overflow=${whoState.width}px, all inside=${whoState.inside}`);
  else check('the loop opens on the middle identity', whoState.centred === whoState.focus,
    `centred=${whoState.centred}, want ${whoState.focus}`);
  if (vp.name === 'desktop') {
    const shot = await page.s('Page.captureScreenshot', { format: 'png' });
    writeFileSync('/tmp/helios-who-desktop.png', Buffer.from(shot.data, 'base64'));
  }
  check('visible identities keep the decoder cap', whoState.before[whoState.focus] >= 0 &&
    (!wide || whoState.before.every(i => i >= 0)) && whoState.attached <= 3,
    `active=${whoState.before}, attached=${whoState.attached}`);
  check('the visible reel hands off to its second clip',
    whoState.before[whoState.focus] >= 0 && whoState.after[whoState.focus] === 1 - whoState.before[whoState.focus] &&
    whoState.after.every((v, i) => i === whoState.focus || v === whoState.before[i]),
    `${whoState.before} -> ${whoState.after}`);
  const advanceState = await page.evaluate(`(async () => {
    const track = document.querySelector('.helios-who__cards');
    const cards = Array.from(track.querySelectorAll('[data-who-card]'));
    const focus = ${wide} ? 0 : Math.floor(cards.length / 2);
    const oldScroll = track.scrollLeft;
    cards[focus].querySelectorAll('video')[1].dispatchEvent(new Event('ended'));
    await new Promise(r => setTimeout(r, 1100));
    const active = cards.map(card => Array.from(card.querySelectorAll('video')).findIndex(v => v.hasAttribute('data-media-active')));
    return { focus, oldScroll, newScroll: track.scrollLeft, active,
      posters: cards.every(card => Array.from(card.querySelectorAll('video')).every(v => /-start\\.webp$/.test(v.poster))) };
  })()`);
  check('each poster is the opening frame of its video', advanceState.posters);
  if (!wide) check('after both clips, the strip walks on to the next identity',
    advanceState.newScroll > advanceState.oldScroll + 50 &&
      advanceState.active[(advanceState.focus + 1) % advanceState.active.length] === 0,
    `scroll=${Math.round(advanceState.oldScroll)} -> ${Math.round(advanceState.newScroll)}, active=${advanceState.active}`);
  else check('desktop keeps all three in place', advanceState.newScroll === 0 && advanceState.active[0] === 0,
    `scroll=${advanceState.newScroll}, active=${advanceState.active}`);
  if (!wide) {
    // The last identity's clip runs out with the reader's hand already on the
    // strip: the sequence still walks on, and the walk wraps to the first
    // identity through the trailing clone.
    const manual = await page.evaluate(`(async () => {
      const track = document.querySelector('.helios-who__cards');
      const cards = Array.from(track.querySelectorAll('[data-who-card]'));
      const old = track.scrollLeft;
      track.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      cards[cards.length - 1].querySelector('video').dispatchEvent(new Event('ended'));
      await new Promise(r => setTimeout(r, 900));
      const active = cards.map(card => Array.from(card.querySelectorAll('video')).findIndex(v => v.hasAttribute('data-media-active')));
      return { old, left: track.scrollLeft, active, centred: ${centred} };
    })()`);
    check('a hand on the strip does not pause the endless sequence',
      manual.centred === 0 && manual.active[0] === 0,
      `scroll=${Math.round(manual.old)} -> ${Math.round(manual.left)}, active=${manual.active}`);
    // A clone at rest is the same still as its original, one card further
    // along in the loop; the seam is a reposition, not an animation.
    const wrap = await page.evaluate(`(async () => {
      const track = document.querySelector('.helios-who__cards');
      const cards = Array.from(track.querySelectorAll('[data-who-card]'));
      const lead = track.querySelector('[data-who-echo="lead"]');
      const trail = track.querySelector('[data-who-echo="trail"]');
      const frame = el => el.querySelector('[data-media-slot="frame"] img').getAttribute('src');
      const a = trail.getBoundingClientRect(), b = cards[0].getBoundingClientRect();
      return { active: cards[0].querySelectorAll('[data-media-active]').length,
        wrappedStill: frame(trail) === frame(cards[0]),
        openingFrames: /-start\\.webp$/.test(frame(trail)) && /-start\\.webp$/.test(frame(lead)),
        geometryMatch: Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1,
        clonesStillOnly: [lead, trail].every(c => c.getAttribute('aria-hidden') === 'true' && !c.querySelector('video')) };
    })()`);
    check('the wrap to the first identity has no visible jump',
      wrap.active === 1 && wrap.wrappedStill && wrap.openingFrames && wrap.geometryMatch,
      `active=${wrap.active}, frame=${wrap.wrappedStill}, opening=${wrap.openingFrames}, geometry=${wrap.geometryMatch}`);
    check('the edge clones are stills only', wrap.clonesStillOnly,
      `still only=${wrap.clonesStillOnly}`);
    // And the other way: the leading clone rests at the very start of the
    // scroll, and landing on it drops the reader on the last identity.
    const wrapLeft = await page.evaluate(`(async () => {
      const track = document.querySelector('.helios-who__cards');
      const cards = Array.from(track.querySelectorAll('[data-who-card]'));
      const lead = track.querySelector('[data-who-echo="lead"]');
      const frame = el => el.querySelector('[data-media-slot="frame"] img').getAttribute('src');
      track.scrollLeft = 0;
      await new Promise(r => setTimeout(r, 600));
      return { last: cards.length - 1, centred: ${centred}, left: track.scrollLeft,
        active: cards[cards.length - 1].querySelectorAll('[data-media-active]').length,
        wrappedStill: frame(lead) === frame(cards[cards.length - 1]) };
    })()`);
    check('the loop wraps left to the last identity just as quietly',
      wrapLeft.centred === wrapLeft.last && wrapLeft.active === 1 && wrapLeft.left > 50 && wrapLeft.wrappedStill,
      `centred=${wrapLeft.centred}, scroll=${Math.round(wrapLeft.left)}, last active=${wrapLeft.active}, frame=${wrapLeft.wrappedStill}`);
  }


  // Past the first act the mark is whole: the banner stands, the pieces go.
  // Read last, because it moves the page out of the hero.
  await page.evaluate('window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" })');
  await new Promise(r => setTimeout(r, 500));
  const rest = await page.evaluate(probe);
  check('the mark is whole once the act is past', rest.build.writing === null && rest.build.banner !== 'none',
    `writing=${rest.build.writing} banner=${rest.build.banner}`);
  check('the flash belongs to the scroll: it fires once the build is whole', rest.flashState === 'on',
    `data-helios-flash=${rest.flashState} after the scroll`);

  // The build's clock, MEASURED rather than assumed. It used to be asserted by
  // scrolling to 0.55 x 0.54 of the act — the constant the choreography ran on
  // — which said nothing about the shape of the rise and broke the moment the
  // clock was retimed (the rise was moved to complete at 80% of the act, so
  // the same scroll is now earlier in the build). What matters is the claim:
  // up through the act, whole at 80% of it, and not before.
  const rise = await page.evaluate(`(async () => {
    const hero = document.querySelector('.helios-hero');
    const h = hero.clientHeight;
    const wm = document.querySelector('.helios-wordmark');
    const pieces = Array.from(document.querySelectorAll('[data-helios-build]'));
    const out = [];
    for (const f of [0.3, 0.5, 0.7, 0.8, 0.9]) {
      window.scrollTo({ top: Math.round(h * f), behavior: 'instant' });
      await new Promise(r => setTimeout(r, 300));
      out.push({ f, writing: wm.getAttribute('data-helios-writing'),
        laid: pieces.filter(p => p.getAttribute('visibility') === 'visible').length, total: pieces.length });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    return out;
  })()`);
  const at = (f) => rise.find(r => r.f === f) || {};
  const byF = rise.map(r => `${r.f}:${r.laid}/${r.total}${r.writing ? '' : ' whole'}`).join('  ');
  // Gradual: under way at 30% of the act and still assembling at 70%.
  check('the build rises through the act', at(0.3).laid > 0 && at(0.7).writing === 'on', byF);
  check('the mark is whole at 80% of the act, not before', at(0.8).writing === null && at(0.9).writing === null, byF);
}

// Reduced motion: stills only. media-video.js returns before it binds, and
// the look's reduced-motion rules land the card at rest. Nothing to animate
// and nothing to undo.
console.log('\n### /helios @ 390x780, prefers-reduced-motion: reduce');
await setViewport(390, 780);
await page.s('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
const rmBefore = page.console.length;
await page.goto(BASE + ROUTE, 1600);
const rm = await page.evaluate(probe);
const rmErrs = page.console.slice(rmBefore).filter(x => x.type !== 'warning');
check('no JS errors', rmErrs.length === 0, rmErrs.slice(0, 3).map(e => String(e.text).slice(0, 120)).join(' | '));
check('poster is the page', rm.poster === true);
check('no decoder is attached', rm.attached === 0, `${rm.attached} attached`);
check('card copy is legible without motion', rm.titleOpacity === '1', `opacity=${rm.titleOpacity}`);
check('ticker does not crawl', rm.tickerAnim === 'none', rm.tickerAnim);
check('the mark stands whole without motion', rm.build.writing === null && rm.build.banner !== 'none', `writing=${rm.build.writing} banner=${rm.build.banner}`);
check('no wipe without motion', rm.titleClip === 'none', String(rm.titleClip));
await page.s('Emulation.setEmulatedMedia', { features: [] });

// A phone on its side. The act is short and the width is tablet-sized, which is
// the case a top-percentage thesis walked into the card: the hero token's vw
// would set the type off the width alone, and the anchor off the height.
console.log('\n### /helios @ 640x360, landscape phone');
await setViewport(640, 360);
const landBefore = page.console.length;
await page.goto(BASE + ROUTE, 1800);
await page.evaluate('window.scrollTo(0, 0)');
const land = await page.evaluate(probe);
const landAir = land.copy.y - land.thesis.b;
const landErrs = page.console.slice(landBefore).filter(x => x.type !== 'warning');
check('landscape: no JS errors', landErrs.length === 0, landErrs.slice(0, 2).map(e => String(e.text).slice(0, 100)).join(' | '));
check('landscape: the thesis stays inside the act', land.thesis.y >= 0, `thesisTop=${Math.round(land.thesis.y)}`);
check('landscape: thesis and card do not overlap', !hits(land.thesis, land.copy),
  `thesisBottom=${Math.round(land.thesis.b)} cardTop=${Math.round(land.copy.y)}`);
check('landscape: the block keeps its air', Math.abs(landAir - 48) <= 4, `${Math.round(landAir)}px of air (want 48)`);

cdp.close();
console.log(`\n${failures === 0 ? 'helios holds' : `${failures} check(s) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
