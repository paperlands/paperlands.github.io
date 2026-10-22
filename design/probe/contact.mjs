// Native contact dialog: render evidence and interaction checks, without dependencies.
// PROBE=contact.mjs OLD_SITE=/tmp/contact-baseline bash design/probe/run.sh
// CONTACT_EVIDENCE selects the output directory (default /tmp/contact-evidence).
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';

const dir = process.env.CONTACT_EVIDENCE || '/tmp/contact-evidence';
mkdirSync(dir, { recursive: true });
const cdp = await connect();
const page = await newPage(cdp);
const evidence = { checks: [], views: [] };
let failures = 0;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function check(label, ok, detail) {
  evidence.checks.push({ label, ok, detail });
  console.log(`${ok ? 'ok' : 'FAIL'} ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}
async function viewport(width, height) {
  await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
}
async function screenshot(name) {
  const shot = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${dir}/${name}.png`, Buffer.from(shot.data, 'base64'));
}
async function key(key, code = key, modifiers = 0) {
  const windowsVirtualKeyCode = { Tab: 9, Escape: 27 }[key];
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode });
}
const metrics = `(() => {
  const q = s => document.querySelector(s);
  const box = e => { const r = e.getBoundingClientRect(); return { x:r.x, y:r.y, w:r.width, h:r.height, right:r.right, bottom:r.bottom }; };
  const d = q('#contact-modal'), p = q('.contact__panel'), n = q('#contact-name-input');
  const cs = getComputedStyle(p);
  return { open:d.open, viewport:{w:innerWidth,h:innerHeight}, dialog:box(d), panel:box(p),
    scroll:{w:d.scrollWidth,h:d.scrollHeight,top:d.scrollTop}, close:box(q('[data-contact-close]')),
    submit:box(q('.contact__submit')), nameField:box(n),
    panelPaint:{background:cs.backgroundColor,border:cs.borderTopWidth,shadow:cs.boxShadow,filter:cs.filter,animation:cs.animationName,transform:cs.transform},
    inputPaint:{filter:getComputedStyle(n).filter,animation:getComputedStyle(n).animationName,fontSize:getComputedStyle(n).fontSize},
    lightAnimation:getComputedStyle(p,'::before').animationName,
    traceAnimation:getComputedStyle(p,'::after').animationName,
    traceContent:getComputedStyle(p,'::after').content,
    captchaChildren:q('[data-turnstile]').childElementCount,
    renderedCaptcha:q('[data-turnstile]').getAttribute('data-rendered'),
    captcha:box(q('[data-turnstile]')),
    active:document.activeElement.id || document.activeElement.className };
})()`;

try {
  await viewport(1440, 900);
  await page.goto('http://127.0.0.1:8802/#contact', 2200);
  await page.evaluate('document.fonts.ready');
  await screenshot('before-desktop');

  await page.goto('http://127.0.0.1:8801/', 1800);
  await page.evaluate('document.fonts.ready');
  check('closed and captcha not fetched at rest', await page.evaluate(`!document.querySelector('#contact-modal').open && !document.querySelector('script[src*="challenges.cloudflare.com"]')`));
  // The first /contact link in the DOM is in the inert mobile menu.
  await page.evaluate(`(() => { const a=document.querySelector('.folio-nav__links a[href="/contact"]'); a.focus(); a.click(); })()`);
  check('immediate sharp, usable name focus', await page.evaluate(`document.activeElement.id === 'contact-name-input' && getComputedStyle(document.querySelector('.contact__panel')).animationName === 'none'`));
  await screenshot('arrival');
  await delay(5000);
  check('dialog opens without navigation, body locks', await page.evaluate(`document.querySelector('#contact-modal').open && location.pathname==='/' && document.body.classList.contains('contact-open')`));
  check('captcha requested lazily', await page.evaluate(`!!document.querySelector('script[src*="challenges.cloudflare.com"]')`));
  await screenshot('after-desktop');
  const desktop = await page.evaluate(metrics);
  evidence.views.push({ name: 'desktop', ...desktop });
  check('reading measure has no card paint or text filter', desktop.panelPaint.background === 'rgba(0, 0, 0, 0)' && desktop.panelPaint.border === '0px' && desktop.panelPaint.shadow === 'none' && desktop.panelPaint.filter === 'none');
  check('desktop decoration animates, text does not', desktop.lightAnimation === 'contact-phosphor' && desktop.inputPaint.animation === 'none' && desktop.inputPaint.filter === 'none');

  check('no registration boundary remains', desktop.traceContent === 'none');
  // The copy is the PAGE's (_pages/helios.md front matter), not the include's
  // defaults: the probe reads what / renders, and the short letter is the claim.
  check('short letter salutation and invitation', await page.evaluate(`document.querySelector('#contact-modal-title').textContent.trim() === 'To PaperLand,' && document.querySelector('.contact__lede').textContent.trim().length > 0 && !document.querySelector('.contact__kicker')`));

  // THE LETTER ASKS FOR A NAME, AN ADDRESS AND A MESSAGE — its labels have said
  // so with an asterisk all along, and now the fields do too (`required`, native
  // validation, no script). Asserted in BOTH directions: an empty field is
  // refused, a line of prose is not, and nothing has turned the browser's own
  // validation off.
  check('a letter with no name, address or message cannot be sent', await page.evaluate(`(() => {
    const form = document.querySelector('#contact-modal form');
    const empty = ['name', 'email', 'message'].map(n => !form.elements[n].checkValidity());
    const message = form.elements['message'];
    message.value = 'A line about the workshop I have in mind.';
    const written = message.checkValidity();
    message.value = '';
    return empty.every(Boolean) && written && !form.hasAttribute('novalidate'); })()`));

  await page.evaluate(`document.querySelector('.contact__submit').focus()`);
  await key('Tab');
  check('direct email remains a keyboard-accessible alternative', await page.evaluate(`document.activeElement.matches('.contact__address a[href="mailto:info@paperland.sg"]')`));
  await key('Tab');
  // Chromium may move focus to browser chrome for one Tab at the boundary.
  // It must never focus inert page content; the next Tab returns to the dialog.
  const boundary = await page.evaluate(`document.activeElement.tagName`);
  if (boundary === 'BODY') await key('Tab');
  check('Tab returns within native dialog', await page.evaluate(`document.activeElement.hasAttribute('data-contact-close')`));
  check('close has visible keyboard focus', await page.evaluate(`getComputedStyle(document.activeElement).outlineStyle === 'solid'`));
  // Shift-Tab walks back around the dialog's stops. The walk is COUNTED from the
  // dialog's own focusables rather than fixed at one keystroke: the letter's prose
  // can carry links (`[[note|label]]` in _data/contact.yml, resolved by
  // _plugins/site_markup.rb), so how many stops the dialog has is the copy's
  // decision and not the probe's. Chromium hands focus to the dialog element and
  // then to the body at the boundary before it wraps, so the walk runs a step or
  // two longer than there are stops — and it must never reach the page behind.
  const stops = await page.evaluate(`document.querySelectorAll('#contact-modal a[href], #contact-modal button, #contact-modal input, #contact-modal textarea').length`);
  const backTo = async (matches) => {
    for (let step = 1; step <= stops + 2; step++) {
      await key('Tab', 'Tab', 8);
      const where = await page.evaluate(`(() => { const a = document.activeElement;
        if (a === document.body || a.id === 'contact-modal') return 'boundary';
        return a.closest('#contact-modal') ? 'stop' : 'page'; })()`);
      check(`Shift-Tab ${step} does not reach the page behind`, where !== 'page');
      if (where === 'stop' && await page.evaluate(matches)) return true;
    }
    return false;
  };
  check('Shift-Tab wraps back to direct email', await backTo(`document.activeElement.matches('.contact__address a')`));
  await key('Tab', 'Tab', 8);
  check('Shift-Tab wraps back to submit', await page.evaluate(`document.activeElement.classList.contains('contact__submit')`));
  check('submit has visible keyboard focus', await page.evaluate(`getComputedStyle(document.activeElement).outlineStyle === 'solid'`));
  const closed = page.evaluate(`new Promise(resolve => {
    const timer=setTimeout(() => resolve(false), 2500);
    document.querySelector('#contact-modal').addEventListener('close', () => { clearTimeout(timer); resolve(true); }, {once:true});
  })`);
  await key('Escape');
  check('native close event delivered', await closed);
  const escaped = await page.evaluate(`({open:document.querySelector('#contact-modal').open,locked:document.body.classList.contains('contact-open'),active:document.activeElement.outerHTML.slice(0,300),url:location.href})`);
  check('Escape closes, unlocks and restores trigger', !escaped.open && !escaped.locked && escaped.active.includes('href="/contact"'), escaped);
  await page.evaluate(`document.querySelector('.folio-nav__links a[href="/contact"]').click()`);
  await delay(900);
  check('reopens with existing captcha script', await page.evaluate(`document.querySelector('#contact-modal').open && document.querySelectorAll('script[src*="challenges.cloudflare.com"]').length === 1`));
  await page.s('Input.dispatchMouseEvent', { type:'mousePressed', x:10, y:450, button:'left', clickCount:1 });
  await page.s('Input.dispatchMouseEvent', { type:'mouseReleased', x:10, y:450, button:'left', clickCount:1 });
  check('outside atmospheric click dismisses', await page.evaluate(`!document.querySelector('#contact-modal').open`));
  await page.evaluate(`document.querySelector('a[href="/contact"]').click()`);
  await delay(900);

  for (const [name,w,h] of [['mobile',390,780],['narrow',320,640],['short-portrait',390,480],['landscape',844,390]]) {
    await viewport(w,h);
    await page.evaluate(`document.querySelector('#contact-modal').scrollTop=0`);
    await delay(300);
    const m = await page.evaluate(metrics);
    evidence.views.push({ name, ...m });
    await screenshot(`after-${name}`);
    // Measured against the viewport the browser ACTUALLY has: a headless window
    // clamps narrow overrides, and the claim is about overflow, not about the
    // number we asked for.
    check(`${name}: no horizontal overflow, top reachable`, m.scroll.w <= m.viewport.w && m.panel.y >= 0, { ...m.scroll, emulated: w, actual: m.viewport.w });
    check(`${name}: close hit area at least 44px`, m.close.w >= 44 && m.close.h >= 44);
    check(`${name}: captcha surface fits`, m.captcha.right <= w && m.captcha.x >= 0, m.captcha);
    check(`${name}: input >=16px`, parseFloat(m.inputPaint.fontSize) >= 16);
    await page.evaluate(`document.querySelector('#contact-name-input').focus(); document.querySelector('.contact__submit').focus()`);
    const bottom = await page.evaluate(metrics);
    // Native focus scrolling rounds to whole pixels; boxes can retain fractions.
    check(`${name}: submit reachable by keyboard`, bottom.submit.y >= -1 && bottom.submit.bottom <= h + 1, bottom.submit);
    await screenshot(`after-${name}-submit`);
  }

  await viewport(1440,900);
  await page.s('Emulation.setEmulatedMedia', { features:[{name:'prefers-reduced-motion',value:'reduce'}] });
  await page.evaluate(`document.querySelector('#contact-modal').close(); document.querySelector('a[href="/contact"]').click()`);
  const reduced = await page.evaluate(metrics);
  evidence.views.push({ name:'reduced-motion', ...reduced });
  check('reduced motion has final static light and no boundary', reduced.lightAnimation === 'none' && reduced.traceAnimation === 'none' && reduced.traceContent === 'none');
  // ...and the RECEIVED letter is drawn the same way, still: it is a drawing, so
  // reduced motion has nothing to change about it.
  await page.goto('http://127.0.0.1:8801/?sent=true', 2200);
  const drawn = await page.evaluate(`(() => { const d = document.querySelector('.contact__desk');
    return { desk: getComputedStyle(d).display !== 'none' && getComputedStyle(d, '::before').content !== 'none',
             letterhead: getComputedStyle(document.querySelector('.contact__title--received')).display !== 'none',
             animated: getComputedStyle(d).animationName !== 'none' }; })()`);
  check('reduced motion draws the received letter — letterhead, desk — still', drawn.desk && drawn.letterhead && !drawn.animated, drawn);
  // Back to the machine's own preference: the sections below are not about
  // reduced motion.
  await page.s('Emulation.setEmulatedMedia', { features: [] });
  await screenshot('after-reduced-motion');
  // The proxy hands the reader back to the page the form DECLARED, and the form
  // declares the page it is on (_includes/contact_form.html: `page.url |
  // absolute_url`) — so a reader who wrote from a note gets that note back, with
  // the receipt, not the mainpage. Asserted on a note, not on `/`, because `/`
  // is the one page where "the same page" and "the mainpage" are the same thing.
  for (const target of ['/?sent=true', '/beginnings?sent=true', '/beginnings?sent=false']) {
    await page.goto(`http://127.0.0.1:8801${target}`, 1800);
    const path = target.split('?')[0];
    check(`return to ${path} sent=${target.split('=')[1]}: opens there, displays status, consumes query`, await page.evaluate(`document.querySelector('#contact-modal').open && location.pathname===${JSON.stringify(path)} && location.search==='' && !document.querySelector('#contact-modal-status').hidden && document.querySelector('#contact-modal-status').classList.contains('contact__status--bad')===${target.endsWith('false')}`));
    // TWO LETTERS, ONE PANEL. A letter that ARRIVED is not the one that was
    // written: the letterhead turns around (From PaperLand, in the title's own
    // face), the invitation gives way to the thank-you (with the link the paper
    // form has always shown), the form is done with and goes, and the desk it
    // reached is drawn under it in the brand's accent — read back AS the accent,
    // not as a hex, so a token edit cannot break this. A letter that FAILED keeps
    // every one of those and is told so at the foot of the panel, in red, at the
    // end edge. The live region is out of sight in the received state: the
    // thank-you is the letter's own line, and the region only announces it.
    const receipt = await page.evaluate(`(() => {
      const s = document.querySelector('#contact-modal-status'), d = document.querySelector('#contact-modal');
      const shown = sel => getComputedStyle(document.querySelector(sel)).display !== 'none';
      const probe = document.createElement('span');
      probe.style.color = 'var(--contact-accent)';
      d.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      const box = s.getBoundingClientRect();
      return { words: s.textContent.trim(), linked: !!s.querySelector('a[href="/about"]'),
               state: d.className, letterhead: shown('.contact__title--received'),
               invitation: shown('.contact__lede'), thankYou: shown('.contact__lede--received'),
               form: shown('.contact__form'), desk: shown('.contact__desk'),
               deskIsAccent: getComputedStyle(document.querySelector('.contact__desk')).color === accent,
               decorative: document.querySelector('.contact__desk').getAttribute('aria-hidden'),
               outOfSight: box.width <= 1 && box.height <= 1, align: getComputedStyle(s).textAlign }; })()`);
    const received = !target.endsWith('false');
    check(`return to ${path} sent=${target.split('=')[1]}: ${received ? 'the letterhead turned around, the form gone, the desk in orange' : 'the form kept, the failure at the end of the panel in red'}`,
      received
        ? receipt.words.length > 0 && receipt.linked && receipt.letterhead && receipt.thankYou && !receipt.invitation
          && !receipt.form && receipt.desk && receipt.deskIsAccent && receipt.decorative === 'true' && receipt.outOfSight
          && receipt.state.includes('contact--received')
        : receipt.words.length > 0 && !receipt.linked && !receipt.letterhead && receipt.invitation && !receipt.thankYou
          && receipt.form && !receipt.desk && receipt.align === 'right' && receipt.state.includes('contact--failed'), receipt);
  }

  // A FAILED SEND DOES NOT COST THE READER THEIR LETTER. The proxy returns them to
  // a fresh document; the form takes a copy as it is submitted — the last moment
  // it is still on the page — and hands it back when the return says the send
  // failed. A receipt spends the copy, so a reader's words do not sit in the tab
  // afterwards. Typed on a NOTE and asserted on that note: the page is part of the
  // key, because the letter comes back to the reader's own page and two pages must
  // not hand each other's words back.
  const typed = { name: 'Alan Kay', email: 'alan@paperland.sg', message: 'A line about the workshop I have in mind.' };
  await page.goto('http://127.0.0.1:8801/beginnings', 2000);
  await page.evaluate(`(() => { const f = document.querySelector('#contact-modal form');
    f.elements['name'].value = ${JSON.stringify(typed.name)};
    f.elements['email'].value = ${JSON.stringify(typed.email)};
    f.elements['message'].value = ${JSON.stringify(typed.message)}; })()`);
  // A real submit would leave the page; the event is the same moment as far as the
  // form is concerned, and it is the moment the copy is taken.
  await page.evaluate(`document.querySelector('#contact-modal form').dispatchEvent(new Event('submit', { cancelable: true }))`);
  await page.goto('http://127.0.0.1:8801/beginnings?sent=false', 2200);
  const back = await page.evaluate(`(() => { const f = document.querySelector('#contact-modal form');
    return { name: f.elements['name'].value, email: f.elements['email'].value, message: f.elements['message'].value,
             named: document.querySelector('#contact-modal-status').classList.contains('contact__status--bad') }; })()`);
  check('a failed send hands the letter back, with the failure named',
    back.message === typed.message && back.email === typed.email && back.name === typed.name && back.named, back);
  // A receipt spends it: the same failure afterwards finds nothing to restore.
  await page.goto('http://127.0.0.1:8801/beginnings?sent=true', 2200);
  await page.goto('http://127.0.0.1:8801/beginnings?sent=false', 2200);
  const spent = await page.evaluate(`(() => { const f = document.querySelector('#contact-modal form');
    return { name: f.elements['name'].value, email: f.elements['email'].value, message: f.elements['message'].value }; })()`);
  check('a receipt spends the kept copy', spent.message === '' && spent.email === '' && spent.name === '', spent);

  // THE RETURN ADDRESS IS RELATIONAL. The markup ships the page's DEPLOYED
  // address — all a build can know, and the no-JavaScript answer — and the form
  // composes the live one at submit (`origin + pathname`). So the same build
  // returns a letter to localhost here and to paperland.sg in production.
  for (const [kind, url, deployed] of [['mainpage', '/', 'https://paperland.sg/'], ['Library', '/blog', 'https://paperland.sg/blog'], ['note', '/beginnings', 'https://paperland.sg/beginnings'], ['standing page', '/about', 'https://paperland.sg/about']]) {
    await page.goto(`http://127.0.0.1:8801${url}`, 1500);
    check(`${kind}: markup carries the deployed address as the no-JS answer`, await page.evaluate(`document.querySelector('#contact-modal input[name="return_url"]').value === ${JSON.stringify(deployed)}`));
    check(`${kind}: and submit composes the address the reader is on`, await page.evaluate(`(() => { const form = document.querySelector('#contact-modal form'); form.dispatchEvent(new Event('submit', { cancelable: true })); return document.querySelector('#contact-modal input[name="return_url"]').value; })()`) === 'http://127.0.0.1:8801' + url);
  }

  // The paper form composes its own the same way — it is the same include, and
  // /lesson-plans is the page where both forms' addresses are live at once.
  await page.goto('http://127.0.0.1:8801/lesson-plans', 1500);
  check('the paper form composes its address too, on the page that holds both', await page.evaluate(`(() => { const form = document.getElementById('lettertopaperland'); form.dispatchEvent(new Event('submit', { cancelable: true })); return document.querySelector('#lettertopaperland input[name="return_url"]').value; })()`) === 'http://127.0.0.1:8801/lesson-plans');

  // The receipt is the FILE's job now (assets/js/contact-form.js), not an inline
  // script: shown by ?sent=, hidden by its own close. Asserted on the paper skin,
  // which is the one that has toast elements at all.
  for (const [sent, shown, other] of [['true', 'toast-good', 'toast-bad'], ['false', 'toast-bad', 'toast-good']]) {
    await page.goto(`http://127.0.0.1:8801/lesson-plans?sent=${sent}`, 1500);
    check(`paper skin receipt sent=${sent}: shown, and only that one`, await page.evaluate(`getComputedStyle(document.getElementById('${shown}')).display !== 'none' && getComputedStyle(document.getElementById('${other}')).display === 'none'`));
    // The letter's own receipt is open too on this page — the two forms, one
    // submission (design/architecture.org, "known interactions"). Dismiss it,
    // then close the toast.
    await page.evaluate(`const letter = document.querySelector('dialog.contact'); if (letter.open) letter.close(); document.querySelector('#${shown} [data-toast-close]').click()`);
    check(`paper skin receipt sent=${sent}: closes`, await page.evaluate(`getComputedStyle(document.getElementById('${shown}')).display === 'none'`));
  }

  // THE LETTER IS LIT BY THE SURFACE. The sheet is one file with one exposure,
  // and the tokens answer with the surface's light roles where it has them —
  // measured against the role itself, not against a colour, so a token edit
  // does not break the assertion.
  for (const [kind, url, answers] of [['note: the letter is lit by the edition\u2019s ink', '/beginnings', true], ['unthemed page: the letter falls back to the landing\u2019s ink', '/blog', false]]) {
    await page.goto(`http://127.0.0.1:8801${url}`, 1500);
    const tokens = await page.evaluate(`(() => { const d = document.querySelector('dialog.contact'), cs = getComputedStyle(d);
      return { ink: cs.getPropertyValue('--contact-ink').trim(),
               role: getComputedStyle(document.body).getPropertyValue('--light-ink').trim(),
               title: getComputedStyle(document.querySelector('.contact__title')).color }; })()`);
    check(kind, answers ? (tokens.role !== '' && tokens.ink === tokens.role && tokens.title !== 'rgb(0, 0, 0)') : (tokens.role === '' && tokens.title !== 'rgb(0, 0, 0)'), tokens);
    // ...AND ITS OWN LINKS. The letter's links are the accent it exposes, on
    // every surface — not whatever the surface does to every anchor it holds.
    // The edition's blanket `a { color: inherit }` ties with the letter's own
    // rule on specificity and wins on sheet order, so this is the check that
    // the dialog exclusion in components/evening.css holds. The accent is read
    // as a COLOUR by painting one, because the token is a hex and the computed
    // paint is an rgb().
    const links = await page.evaluate(`(() => { const d = document.querySelector('dialog.contact');
      const probe = document.createElement('span');
      probe.style.color = 'var(--contact-accent)';
      d.append(probe);
      const accent = getComputedStyle(probe).color;
      probe.remove();
      return { accent,
               lede: getComputedStyle(document.querySelector('.contact__lede a')).color,
               address: getComputedStyle(document.querySelector('.contact__address a')).color }; })()`);
    check(`the letter's links are the letter's accent (${url})`, links.lede === links.accent && links.address === links.accent, links);
  }

  // THE NAV AND THE LETTER NAME THE SAME ADDRESS. The nav writes its hrefs
  // verbatim (site-root serving: _config.yml baseurl is ''), and the letter
  // compares location.pathname to the route it was handed — so a moved route that
  // missed _data/nav.yml would fail here rather than in a reader's click.
  for (const url of ['/', '/beginnings']) {
    await page.goto(`http://127.0.0.1:8801${url}`, 1500);
    const agreement = await page.evaluate(`(() => { const link = document.querySelector('.folio-nav__links a[href$="/contact"]'), d = document.querySelector('dialog.contact');
      const trim = p => p.replace(/\\/+$/, '');
      return { nav: trim(new URL(link.href).pathname), route: trim(d.getAttribute('data-contact-route')) }; })()`);
    check(`nav and letter agree on the route (${url})`, agreement.nav !== '' && agreement.nav === agreement.route, agreement);
  }
  // A fresh arrival, not a same-document fragment change after return_url.
  await page.goto('about:blank', 100);
  await page.goto('http://127.0.0.1:8801/#contact',1800);
  check('hash arrival opens and consumes hash', await page.evaluate(`document.querySelector('#contact-modal').open && location.hash===''`));

  // RELATIONAL: on any page that carries the nav — here a NOTE, a document with
  // its own theme sheet — a contact link opens the letter in place, and the
  // shared sheet paints it there. Only a cold arrival on /contact goes through
  // the redirect.
  await page.goto('http://127.0.0.1:8801/beginnings', 1800);
  await page.evaluate(`document.querySelector('.folio-nav__links a[href="/contact"]').click()`);
  await delay(600);
  check('a note opens the letter in place, painted by the shared sheet', await page.evaluate(`document.querySelector('#contact-modal').open && location.pathname==='/beginnings' && document.body.classList.contains('contact-open') && getComputedStyle(document.querySelector('#contact-modal')).backgroundColor !== 'rgba(0, 0, 0, 0)'`));
  await screenshot('note-arrival');
  await key('Escape');

  // Two forms on one page: /lesson-plans has the paper form, and the letter is
  // on every page. Field ids must not collide, or the letter's own labels point
  // at the field behind it.
  await page.goto('http://127.0.0.1:8801/lesson-plans', 1800);
  check('paper form and letter share a page without an id collision', await page.evaluate(`['name-input','email-input','message-input'].every(id => document.querySelectorAll('#' + id).length === 1) && ['contact-name-input','contact-email-input','contact-message-input'].every(id => document.querySelectorAll('#' + id).length === 1)`));
  await page.evaluate(`document.querySelector('.folio-nav__links a[href="/contact"]').click()`);
  await delay(500);
  check('the letter opens over the lesson page too', await page.evaluate(`document.querySelector('#contact-modal').open && location.pathname==='/lesson-plans'`));
  await key('Escape');

  // The link a NOTE's own prose carries is the same door: /experiences has one
  // ("Book a call about the free pilot"), and it opens the letter in place too.
  await page.goto('http://127.0.0.1:8801/experiences', 1800);
  await page.evaluate(`document.querySelector('a.internal-link[href="/contact"]').click()`);
  await delay(500);
  check('a link inside the prose opens the letter in place', await page.evaluate(`document.querySelector('#contact-modal').open && location.pathname==='/experiences'`));
  await key('Escape');
  evidence.console = page.console.filter(c => ['exception','error'].includes(c.type));
  evidence.networkFailures = page.failed;
  evidence.captchaNote = desktop.captchaChildren ? 'Real Turnstile rendered; localhost shows an unable-to-connect state. Successful challenge/submission remains unverified.' : 'Turnstile did not render on this host; live challenge remains unverified.';
  console.log(evidence.captchaNote);
  console.log(`Evidence: ${dir}`);
} finally {
  writeFileSync(`${dir}/results.json`, JSON.stringify(evidence,null,2));
  cdp.close();
}
process.exitCode = failures ? 1 : 0;
