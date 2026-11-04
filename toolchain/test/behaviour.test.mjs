import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../assets/js/behaviour.js', import.meta.url), 'utf8');

function memoryStorage(seed = {}) {
  const data = { ...seed };
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
    setItem(key, value) { data[key] = String(value); },
    removeItem(key) { delete data[key]; },
    data,
  };
}

function blockedStorage() {
  const fail = () => { throw new Error('blocked'); };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

function listen(map, type, fn) {
  if (!map.has(type)) map.set(type, new Set());
  map.get(type).add(fn);
}

function emit(map, type, event) {
  for (const fn of [...(map.get(type) || [])]) fn(event || {});
}

function rect(top, height) {
  return { top, bottom: top + height, height, left: 0, right: 1000, width: 1000 };
}

function makeEl(spec = {}) {
  const el = {
    rect: spec.rect || rect(2000, 400),
    attrs: spec.attrs || {},
    order: spec.order || 0,
    textContent: spec.text || '',
    getBoundingClientRect() { return this.rect; },
    getAttribute(name) { return this.attrs[name] || null; },
    setAttribute() {},
    contains() { return false; },
    compareDocumentPosition(other) {
      if (other === this) return 0;
      return other.order > this.order ? 4 : 2;
    },
    querySelector() { return null; },
    closest() { return null; },
  };
  return el;
}

function contract(extra = {}) {
  return {
    schema: 1,
    release: 'helios-2',
    campaign: extra.campaign || { source: [], medium: [], campaign: [], content: [] },
    acts: extra.acts || [],
  };
}

function contactForm() {
  return {
    getAttribute(name) { return name === 'data-contact-form' ? '' : null; },
    querySelector() { return null; },
  };
}

function run(opts = {}) {
  const clock = opts.clock || { now: 0, date: 0 };
  const events = [];
  const errors = [];
  const history = [];
  const storage = opts.storage || memoryStorage();
  const windowListeners = new Map();
  const documentListeners = new Map();
  const dialogListeners = new Map();
  const ios = [];
  const host = opts.host || 'paperland.sg';
  const path = opts.path || '/';
  const search = opts.search || '';
  const elements = {};
  for (const [sel, spec] of Object.entries(opts.elements || {})) elements[sel] = makeEl(spec);
  const dialog = opts.dialog ? {
    getAttribute(name) { return name === 'data-contact-route' ? '#contact' : null; },
    contains() { return false; },
    addEventListener(type, fn) { listen(dialogListeners, type, fn); },
    removeEventListener() {},
    querySelector() { return null; },
  } : null;
  const classes = new Set();
  const body = {
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
  };
  const meta = opts.release ? { getAttribute: () => opts.release } : null;
  let configEl = null;
  if (!opts.noConfig) {
    const text = opts.configText != null ? opts.configText : JSON.stringify(opts.config || contract(opts));
    configEl = { textContent: text };
  }
  const document = {
    referrer: opts.referrer || '',
    visibilityState: 'visible',
    body,
    hidden: false,
    addEventListener(type, fn) { listen(documentListeners, type, fn); },
    removeEventListener(type, fn) { documentListeners.get(type)?.delete(fn); },
    getElementById(id) { return id === 'behaviour-config' ? configEl : null; },
    querySelector(sel) {
      if (sel === 'meta[name="paperland-release"]') return meta;
      if (sel === 'dialog.contact') return dialog;
      return Object.prototype.hasOwnProperty.call(elements, sel) ? elements[sel] : null;
    },
    querySelectorAll() { return []; },
  };
  function IO(cb, options) {
    this.cb = cb;
    this.options = options;
    this.targets = [];
    ios.push(this);
  }
  IO.prototype.observe = function (el) { this.targets.push(el); };
  IO.prototype.unobserve = function () {};
  IO.prototype.disconnect = function () {};
  function MO(cb) { this.cb = cb; }
  MO.prototype.observe = function () {};
  MO.prototype.disconnect = function () {};
  const location = {
    pathname: path,
    search,
    host,
    hash: opts.hash || '',
    href: `https://${host}${path}${search}${opts.hash || ''}`,
  };
  const sandbox = {
    document,
    location,
    history: { replaceState(_s, _t, url) { history.push(url); } },
    sessionStorage: storage,
    performance: { now() { return clock.now; } },
    screen: { width: 1440, height: 900 },
    innerWidth: opts.innerWidth || 1400,
    innerHeight: opts.innerHeight || 800,
    matchMedia: () => ({ matches: false }),
    IntersectionObserver: IO,
    MutationObserver: MO,
    addEventListener(type, fn) { listen(windowListeners, type, fn); },
    removeEventListener(type, fn) { windowListeners.get(type)?.delete(fn); },
    plausible: opts.plausible === null ? undefined : (name, data) => {
      events.push({ name, props: { ...(data && data.props) } });
    },
    console: { error(...args) { errors.push(args.join(' ')); } },
    URL, URLSearchParams,
  };
  sandbox.window = sandbox;
  sandbox.Date = { now() { return clock.date; } };
  if (opts.PerformanceObserver) sandbox.PerformanceObserver = opts.PerformanceObserver;
  runInNewContext(source, sandbox, { filename: 'assets/js/behaviour.js' });
  return {
    events, errors, history, storage, clock, elements, ios, dialog, document, window: sandbox,
    emitWindow(type, event) { emit(windowListeners, type, event); },
    emitDocument(type, event) { emit(documentListeners, type, event); },
    emitDialog(type, event) { emit(dialogListeners, type, event); },
    hide() { document.visibilityState = 'hidden'; emit(documentListeners, 'visibilitychange'); },
    show() { document.visibilityState = 'visible'; emit(documentListeners, 'visibilitychange'); },
  };
}

function named(h, name) {
  return h.events.filter((event) => event.name === name);
}

function one(h, name) {
  const found = named(h, name);
  assert.equal(found.length, 1, `${name} x${found.length}`);
  return found[0].props;
}

function strings(props) {
  for (const [key, value] of Object.entries(props)) {
    assert.equal(typeof value, 'string', key);
  }
}

const approved = {
  source: ['paperland-outreach'],
  medium: ['email'],
  campaign: ['alpha', 'beta'],
  content: ['student-artifact-a'],
};

test('page is one document execution and never a visit denominator', () => {
  const storage = memoryStorage();
  const names = [];
  for (let i = 0; i < 3; i++) {
    const h = run({
      storage,
      path: '/experiences',
      referrer: i ? 'https://paperland.sg/experiences' : '',
    });
    names.push(...h.events.map((event) => event.name));
    strings(h.events[0].props);
    assert.equal(h.events[0].props.v, '1');
  }
  assert.deepEqual(names.filter((name) => name === 'page'), ['page', 'page', 'page']);
  assert.equal(names.includes('session'), false);
  assert.equal(names.includes('landing'), false);
  assert.equal(names.includes('visit'), false);
});

test('tab entry survives internal navigation and is not copied from the current page', () => {
  const storage = memoryStorage();
  const first = run({
    storage,
    path: '/experiences',
    referrer: 'https://news.example/story',
  });
  assert.equal(one(first, 'page').epg, 'experiences');
  assert.equal(one(first, 'page').esrc, 'news.example');
  assert.equal(one(first, 'page').src, 'news.example');
  const second = run({
    storage,
    path: '/our-approach',
    referrer: 'https://paperland.sg/experiences',
  });
  const page = one(second, 'page');
  assert.equal(page.pg, 'our-approach');
  assert.equal(page.src, 'internal');
  assert.equal(page.epg, 'experiences');
  assert.equal(page.esrc, 'news.example');
  assert.notEqual(page.epg, page.pg);
});

test('a new external campaign replaces tab entry and does not keep the previous campaign', () => {
  const storage = memoryStorage();
  const config = contract({ campaign: approved });
  run({
    storage,
    config,
    path: '/experiences',
    referrer: 'https://mail.example/inbox',
    search: '?utm_source=paperland-outreach&utm_medium=email&utm_campaign=alpha&utm_content=student-artifact-a',
  });
  const next = run({
    storage,
    config,
    path: '/notes',
    referrer: 'https://other.example/link',
    search: '?utm_campaign=beta',
  });
  const page = one(next, 'page');
  assert.equal(page.epg, 'notes');
  assert.equal(page.esrc, 'other.example');
  assert.equal(page.uc, 'beta');
  assert.equal(page.us, undefined);
  assert.equal(page.um, undefined);
  assert.equal(page.ux, undefined);
  assert.equal(JSON.parse(storage.getItem('pl.campaign')).uc, 'beta');
});

test('untagged or tainted external arrival clears the previous campaign instead of inheriting it', () => {
  const storage = memoryStorage();
  const config = contract({ campaign: approved });
  run({
    storage,
    config,
    path: '/experiences',
    referrer: 'https://mail.example/',
    search: '?utm_campaign=alpha',
  });
  const untagged = run({ storage, config, path: '/notes', referrer: '' });
  assert.equal(one(untagged, 'page').epg, 'notes');
  assert.equal(one(untagged, 'page').uc, undefined);
  assert.equal(storage.getItem('pl.campaign'), null);
  assert.equal(untagged.events.some((event) => event.name === 'visit'), false);

  storage.setItem('pl.campaign', JSON.stringify({ uc: 'alpha' }));
  storage.setItem('pl.entry', JSON.stringify({ epg: 'experiences', esrc: 'direct' }));
  const tainted = run({
    storage,
    config,
    path: '/other',
    referrer: 'https://mail.example/',
    search: '?utm_campaign=alpha&utm_content=person@school.edu',
  });
  assert.equal(one(tainted, 'page').uc, undefined);
  assert.equal(storage.getItem('pl.campaign'), null);
});

test('duplicate UTM keys are rejected rather than taking the first value', () => {
  const storage = memoryStorage();
  storage.setItem('pl.campaign', JSON.stringify({ uc: 'alpha' }));
  const h = run({
    storage,
    config: contract({ campaign: approved }),
    path: '/experiences',
    referrer: 'https://mail.example/',
    search: '?utm_campaign=alpha&utm_campaign=person%40school.edu',
  });
  assert.equal(one(h, 'page').uc, undefined);
  assert.equal(storage.getItem('pl.campaign'), null);
});

test('malformed external query clears the previous campaign and is not a receipt', () => {
  const storage = memoryStorage({
    'pl.campaign': JSON.stringify({ uc: 'alpha' }),
    'pl.entry': JSON.stringify({ epg: 'experiences', esrc: 'direct' }),
  });
  const h = run({
    storage,
    config: contract({ campaign: approved }),
    path: '/notes',
    referrer: 'https://mail.example/',
    search: '?utm_campaign=%ZZ',
  });
  assert.equal(one(h, 'page').uc, undefined);
  assert.equal(one(h, 'page').epg, 'notes');
  assert.equal(storage.getItem('pl.campaign'), null);
  assert.equal(named(h, 'contact').length, 0);

  storage.setItem('pl.campaign', JSON.stringify({ uc: 'alpha' }));
  const disguised = run({
    storage,
    config: contract({ campaign: approved }),
    path: '/other',
    referrer: 'https://mail.example/',
    search: '?notsent=1&utm_campaign=%ZZ',
  });
  assert.equal(one(disguised, 'page').uc, undefined);
  assert.equal(storage.getItem('pl.campaign'), null);
  assert.equal(named(disguised, 'contact').length, 0);
});

test('internal navigation and receipt returns keep allowlisted context; URL tags on those loads do not replace it', () => {
  const storage = memoryStorage();
  const config = contract({ campaign: approved });
  run({
    storage,
    config,
    path: '/experiences',
    referrer: 'https://mail.example/',
    search: '?utm_campaign=alpha&utm_source=paperland-outreach',
  });
  const internal = run({
    storage,
    config,
    path: '/our-approach',
    referrer: 'https://paperland.sg/experiences',
    search: '?utm_campaign=beta',
  });
  assert.equal(one(internal, 'page').uc, 'alpha');
  assert.equal(one(internal, 'page').epg, 'experiences');
  const receipt = run({
    storage,
    config,
    path: '/beginnings',
    referrer: '',
    search: '?sent=true',
  });
  const page = one(receipt, 'page');
  assert.equal(page.pg, 'beginnings');
  assert.equal(page.epg, 'experiences');
  assert.equal(page.esrc, 'mail.example');
  assert.equal(page.uc, 'alpha');
  assert.notEqual(page.src, 'internal');
});

test('legacy or invalid stored campaign is removed and not copied onto events', () => {
  const storage = memoryStorage({
    'pl.campaign': JSON.stringify({ uc: 'alpha', name: 'Ada Lovelace' }),
  });
  const h = run({
    storage,
    config: contract({ campaign: approved }),
    path: '/our-approach',
    referrer: 'https://paperland.sg/experiences',
  });
  assert.equal(one(h, 'page').uc, undefined);
  assert.equal(storage.getItem('pl.campaign'), null);

  const empty = memoryStorage({ 'pl.campaign': JSON.stringify({ uc: 'alpha' }) });
  run({ storage: empty, path: '/our-approach', referrer: 'https://paperland.sg/' });
  assert.equal(empty.getItem('pl.campaign'), null);
});

test('blocked storage does not throw, does not invent entry, and does not claim a receipt pair', () => {
  const storage = blockedStorage();
  const arrival = run({ storage, path: '/experiences', referrer: '' });
  assert.equal(one(arrival, 'page').epg, 'experiences');
  assert.equal(one(arrival, 'page').esrc, 'direct');
  const later = run({ storage, path: '/our-approach', referrer: 'https://paperland.sg/experiences' });
  assert.equal(one(later, 'page').epg, 'unavailable');
  assert.equal(one(later, 'page').esrc, 'unavailable');
  assert.notEqual(one(later, 'page').epg, one(later, 'page').pg);
  const receipt = run({ storage, path: '/experiences', search: '?sent=true', referrer: '' });
  const props = one(receipt, 'contact');
  assert.equal(props.step, 'receipt');
  assert.equal(props.paired, 'unavailable');
  assert.equal(typeof props.paired, 'string');
});

test('a crafted receipt is not acceptance and is not an entry', () => {
  const h = run({ path: '/experiences', search: '?sent=true&utm_campaign=person@school.edu', referrer: '' });
  const receipt = one(h, 'contact');
  strings(receipt);
  assert.equal(receipt.step, 'receipt');
  assert.equal(receipt.flag, 'sent');
  assert.equal(receipt.paired, '0');
  assert.equal(receipt.ok, undefined);
  assert.equal(h.events.some((event) => event.props.step === 'result'), false);
  assert.equal(h.events.some((event) => event.props.ok != null), false);
  assert.equal(one(h, 'page').epg, 'unavailable');
  assert.equal(h.history.length, 0, 'sent is still present before load');
  h.emitWindow('load');
  assert.equal(h.history.length, 1);
  assert.equal(h.history[0].includes('sent='), false);
  assert.equal(h.history[0].includes('utm_campaign='), true);
});

test('receipt consumes only a matching same-tab pathname marker', () => {
  const storage = memoryStorage();
  const opened = run({ storage, path: '/experiences' });
  opened.emitDocument('submit', { target: contactForm() });
  assert.equal(one(opened, 'contact').step, 'submit');
  assert.equal(storage.getItem('pl.receipt'), 'experiences');
  const other = run({ storage, path: '/notes' });
  other.emitDocument('submit', { target: { getAttribute() { return null; }, querySelector() { return null; } } });
  assert.equal(named(other, 'contact').length, 0);
  assert.equal(storage.getItem('pl.receipt'), 'experiences');
  const back = run({
    storage,
    path: '/experiences',
    search: '?sent=false',
    referrer: 'https://paperland.sg/experiences',
  });
  const receipt = one(back, 'contact');
  assert.equal(receipt.step, 'receipt');
  assert.equal(receipt.flag, 'unsent');
  assert.equal(receipt.paired, '1');
  assert.equal(receipt.ok, undefined);
  assert.equal(storage.getItem('pl.receipt'), null);
  const replay = run({ storage, path: '/experiences', search: '?sent=true' });
  assert.equal(one(replay, 'contact').paired, '0');

  storage.setItem('pl.receipt', 'other');
  const mismatch = run({ storage, path: '/experiences', search: '?sent=true' });
  assert.equal(one(mismatch, 'contact').paired, '0');
  assert.equal(storage.getItem('pl.receipt'), null);
});

test('hidden campaign field receives allowlisted context, never a raw query', () => {
  const storage = memoryStorage();
  const h = run({
    storage,
    config: contract({ campaign: approved }),
    path: '/experiences',
    referrer: 'https://mail.example/',
    search: '?utm_campaign=alpha&utm_content=student-artifact-a&utm_source=paperland-outreach',
  });
  const input = { value: 'person@school.edu' };
  const form = { querySelector: (sel) => sel === 'input[name="campaign"]' ? input : null };
  h.emitDocument('submit', { target: form });
  assert.equal(input.value, 'alpha/student-artifact-a/paperland-outreach');

  const tainted = run({
    path: '/experiences',
    referrer: 'https://mail.example/',
    search: '?utm_campaign=person@school.edu',
    config: contract({ campaign: approved }),
  });
  const slot = { value: 'keep-me' };
  tainted.emitDocument('submit', { target: { querySelector: () => slot } });
  assert.equal(slot.value, 'untagged');
  assert.equal(slot.value.includes('@'), false);
});

test('ten visible seconds plus 120 hidden seconds stay in the visible band', () => {
  const clock = { now: 0, date: 0 };
  const h = run({
    clock,
    elements: { '.overture': { rect: rect(0, 400), order: 0 } },
    config: contract({ acts: [{ name: 'overture', selector: '.overture' }] }),
  });
  assert.equal(one(h, 'act').act, 'overture');
  clock.now = 10000;
  clock.date = 10000;
  h.hide();
  assert.equal(named(h, 'exit').length, 0);
  clock.now = 130000;
  clock.date = 130000;
  h.emitWindow('pagehide');
  assert.equal(one(h, 'dwell').ms, 'lt30s');
  assert.notEqual(one(h, 'dwell').ms, 'gte30s');
  assert.equal(one(h, 'exit').t, 'lt30s');
  assert.equal(one(h, 'exit').max, 'overture');
  assert.equal(one(h, 'exit').act, undefined);
});

test('visible time resumes after a hidden interval and still excludes it', () => {
  const clock = { now: 0, date: 0 };
  const h = run({
    clock,
    elements: { '.overture': { rect: rect(0, 400), order: 0 } },
    config: contract({ acts: [{ name: 'overture', selector: '.overture' }] }),
  });
  clock.now = 2000;
  clock.date = 2000;
  h.hide();
  clock.now = 122000;
  clock.date = 122000;
  h.show();
  clock.now = 124000;
  clock.date = 124000;
  h.emitWindow('pagehide');
  assert.equal(one(h, 'dwell').ms, 'lt10s');
  assert.notEqual(one(h, 'dwell').ms, 'lt3s');
  assert.notEqual(one(h, 'dwell').ms, 'gte30s');
});

test('a very tall section can pass the pixel rule below a 0.25 ratio', () => {
  const h = run({
    innerHeight: 800,
    elements: { '.tall': { rect: rect(20000, 10000), order: 0 } },
    config: contract({ acts: [{ name: 'movements', selector: '.tall' }] }),
  });
  assert.equal(named(h, 'act').length, 0);
  const thresholds = h.ios[0].options.threshold;
  assert.equal(thresholds.some((value) => value > 0 && value < 0.25), true);
  h.ios[0].cb([{
    isIntersecting: true,
    intersectionRect: { height: 1 },
    boundingClientRect: { height: 10000 },
  }]);
  assert.equal(named(h, 'act').length, 0);
  h.elements['.tall'].rect = rect(400, 10000);
  h.emitWindow('scroll');
  const act = one(h, 'act');
  assert.equal(act.act, 'movements');
  assert.equal(act.pct, undefined);
});

test('exit.max is maximum depth, not the act visible at leave', () => {
  const h = run({
    elements: {
      '.overture': { rect: rect(0, 200), order: 0 },
      '.finale': { rect: rect(200, 200), order: 1 },
    },
    config: contract({
      acts: [
        { name: 'overture', selector: '.overture' },
        { name: 'finale', selector: '.finale' },
      ],
    }),
  });
  h.elements['.finale'].rect = rect(5000, 200);
  h.emitWindow('pagehide');
  const exit = one(h, 'exit');
  assert.equal(exit.max, 'finale');
  assert.equal(exit.act, undefined);
  assert.equal(exit.acts, '2/2');
});

test('visibility hidden is not an exit; pagehide and freeze flush once; restore adds nothing', () => {
  const h = run({ path: '/experiences' });
  h.hide();
  assert.equal(named(h, 'exit').length, 0);
  h.emitWindow('pagehide', { persisted: true });
  assert.equal(named(h, 'exit').length, 1);
  assert.equal(named(h, 'page').length, 1);
  const total = h.events.length;
  h.emitWindow('pageshow', { persisted: true });
  h.emitDocument('resume');
  h.emitWindow('pagehide', { persisted: false });
  h.emitDocument('freeze');
  assert.equal(h.events.length, total);
  assert.equal(named(h, 'page').length, 1);
  assert.equal(named(h, 'exit').length, 1);

  const frozen = run({ path: '/experiences' });
  frozen.emitDocument('freeze');
  assert.equal(named(frozen, 'exit').length, 1);
  const frozenTotal = frozen.events.length;
  frozen.emitDocument('resume');
  frozen.show();
  assert.equal(frozen.events.length, frozenTotal);
});

test('invalid config fails visibly and does not measure the homepage spine', () => {
  const storage = memoryStorage({ 'pl.campaign': JSON.stringify({ uc: 'alpha', name: 'Ada' }) });
  const elements = { '#wordmark, .helios-wordmark': { rect: rect(0, 400) } };
  for (const configText of ['{', '{"acts":[{"name":"hero","selector":"#hero"}]}', '{"schema":2}']) {
    const h = run({ configText, elements, release: 'helios-2', storage });
    assert.equal(h.events.length, 1);
    const page = one(h, 'page');
    strings(page);
    assert.equal(page.config, 'invalid');
    assert.equal(page.v, '1');
    assert.equal(page.rel, 'unavailable');
    assert.equal(named(h, 'act').length, 0);
    assert.equal(h.errors.length, 1);
    assert.match(h.errors[0], /behaviour: invalid config/);
  }
  assert.equal(storage.getItem('pl.campaign'), null);
});

test('missing config is the standalone fallback; an empty act list is not the homepage', () => {
  const fallback = run({
    noConfig: true,
    elements: { '#wordmark, .helios-wordmark': { rect: rect(0, 400) } },
  });
  assert.equal(one(fallback, 'page').config, 'fallback');
  assert.equal(one(fallback, 'page').rel, 'unreleased');
  assert.equal(one(fallback, 'act').act, 'wordmark');

  const empty = run({
    elements: { '#wordmark, .helios-wordmark': { rect: rect(0, 400) } },
    config: contract({ acts: [] }),
    release: 'helios-2',
  });
  assert.equal(named(empty, 'act').length, 0);
  assert.equal(one(empty, 'page').config, undefined);
  assert.equal(one(empty, 'page').rel, 'helios-2');
  assert.equal(one(empty, 'page').v, '1');
});

test('unobserved perf is unavailable and fg=none stays distinct from a fast band', () => {
  const h = run({ path: '/experiences' });
  h.emitWindow('pagehide');
  const perf = one(h, 'perf');
  strings(perf);
  assert.equal(perf.fg, 'none');
  assert.equal(perf.event_max, 'unavailable');
  assert.equal(perf.lcp, 'unavailable');
  assert.equal(perf.cls, 'unavailable');
  assert.equal(perf.inp, undefined);

  function PO(cb) { this.cb = cb; }
  PO.prototype.observe = function (options) {
    if (options.type === 'event') this.cb({ getEntries: () => [{ duration: 150 }] });
  };
  const observed = run({ path: '/experiences', PerformanceObserver: PO });
  observed.emitWindow('pagehide');
  const band = one(observed, 'perf');
  assert.equal(band.event_max, 'lt200');
  assert.equal(band.inp, undefined);
  assert.equal(band.lcp, 'unavailable');
  assert.equal(band.cls, 'unavailable');

  function Supported(cb) { this.cb = cb; }
  Supported.supportedEntryTypes = ['layout-shift'];
  Supported.prototype.observe = function () {};
  const stable = run({ path: '/experiences', PerformanceObserver: Supported });
  stable.emitWindow('pagehide');
  assert.equal(one(stable, 'perf').cls, 'lt0.01');
});

test('resize refreshes exposure after the scroll watch has disarmed', () => {
  const clock = { now: 0, date: 0 };
  const h = run({
    clock,
    innerHeight: 800,
    elements: { '.finale': { rect: rect(400, 1000), order: 0 } },
    config: contract({ acts: [{ name: 'finale', selector: '.finale' }] }),
  });
  assert.equal(named(h, 'act').length, 1);
  clock.now = 5000;
  h.window.innerHeight = 500;
  h.emitWindow('resize');
  clock.now = 45000;
  h.emitWindow('pagehide');
  assert.equal(one(h, 'dwell').ms, 'lt10s');
  assert.notEqual(one(h, 'dwell').ms, 'gte30s');

  const grown = run({
    innerHeight: 800,
    elements: { '.movements': { rect: rect(900, 500), order: 0 } },
    config: contract({ acts: [{ name: 'movements', selector: '.movements' }] }),
  });
  assert.equal(named(grown, 'act').length, 0);
  grown.window.innerHeight = 1200;
  grown.emitWindow('resize');
  assert.equal(one(grown, 'act').act, 'movements');
});

test('the kernel does not call the network', () => {
  assert.equal(source.includes('fetch('), false);
  assert.equal(source.includes("send('session'"), false);
  assert.equal(source.includes("step: 'result'"), false);
  const h = run({ path: '/experiences' });
  assert.equal(h.events.length > 0, true);
});
