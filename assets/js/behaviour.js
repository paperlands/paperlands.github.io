/* behaviour.js — document behaviour events. Not a visit tracker.
   --------------------------------------------------------------------------
   Nine names: page, act, exit, dwell, cta, contact, carousel, runtime, perf.
   `page` is one document execution. It is not a session, landing, or campaign
   denominator. Those denominators are native Plausible entry visits. This file
   does not emit them and does not sanitise the async loader, which still reads
   raw UTMs on its own pageview.

   `v` is this kernel's contract shape ('1'), not `rel` and not the pageview.
   `epg`/`esrc` are tab-entry context, not native visit context. Refreshed on an
   observable external or direct arrival (no sent query); preserved across
   internal navigation and receipt returns; `unavailable` when this tab did not
   observe the arrival. A direct load and a reload are ambiguous — do not infer
   a visit. A new external/direct arrival replaces campaign context; an untagged
   or tainted one clears it. Allowlisted campaign is kept only across internal
   navigation and receipt returns.

   `exit.max` is the deepest act reached, not the exit location. Dwell and
   exit.t count visible time only. contact step=receipt is the client `sent`
   flag, not an accepted enquiry. `paired` is a prior same-tab attempt marker
   bound to the submitting pathname, not authenticated pairing. perf.event_max
   is the maximum Event Timing duration, not INP. Unobserved perf is
   `unavailable`, not a fast band. Properties are strings. Silent without
   window.plausible. */
(function () {
  'use strict';

  var plausible = window.plausible;
  if (typeof plausible !== 'function') return;

  var doc = document;
  var budget = 80;
  var sent = Object.create(null);
  var TAG = { us: 'utm_source', um: 'utm_medium', uc: 'utm_campaign', ux: 'utm_content' };
  var SLOT = ['us', 'um', 'uc', 'ux'];

  function cut(value, max) {
    var s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max) : s;
  }

  function bucket(n, edges, names) {
    for (var i = 0; i < edges.length; i++) if (n < edges[i]) return names[i];
    return names[names.length - 1];
  }

  function device() {
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse) return 'desktop';
    return Math.min(screen.width, screen.height) < 768 ? 'phone' : 'tablet';
  }

  function viewport() {
    var w = window.innerWidth;
    return w < 480 ? 'lt480' : w < 768 ? 'lt768' : w < 1200 ? 'lt1200' : 'gte1200';
  }

  function pageKey() {
    var path = location.pathname.replace(/^\/+|\/+$/g, '');
    return cut(path || 'home', 60);
  }

  function source() {
    if (!doc.referrer) return 'direct';
    try {
      var url = new URL(doc.referrer);
      return url.host === location.host ? 'internal' : cut(url.host, 60);
    } catch (e) { return 'other'; }
  }

  function parseQuery(search) {
    var q = search || '';
    if (q.charAt(0) === '?') q = q.slice(1);
    if (!q) return [];
    var parts = q.split('&');
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var eq = parts[i].indexOf('=');
      var rawKey = eq < 0 ? parts[i] : parts[i].slice(0, eq);
      var rawVal = eq < 0 ? '' : parts[i].slice(eq + 1);
      try {
        out.push([
          decodeURIComponent(rawKey.replace(/\+/g, ' ')),
          decodeURIComponent(rawVal.replace(/\+/g, ' '))
        ]);
      } catch (e) { return null; }
    }
    return out;
  }

  function cleanValue(value) {
    if (!value || typeof value !== 'string') return false;
    if (value.length > 40) return false;
    if (/[@\s/?#&%]/.test(value)) return false;
    return true;
  }

  var CONFIG = {
    acts: [
      ['wordmark', '#wordmark, .helios-wordmark'],
      ['hero', '.helios-hero'],
      ['ticker', '.helios-ticker'],
      ['see', '#see'],
      ['create', '.helios-create'],
      ['possibilities', '.helios-possibilities'],
      ['fourthturn', '#fourth-turn'],
      ['colophon', '.helios-colophon']
    ],
    probes: { ink: '[data-ink-scene]', fault: '#fault', fallback: '#enable-runtime', contact: 'dialog.contact' }
  };
  var allow = { us: [], um: [], uc: [], ux: [] };
  var configState = 'fallback';
  var releaseMeta = doc.querySelector('meta[name="paperland-release"]');
  var RELEASE = (releaseMeta && releaseMeta.getAttribute('content')) || 'unreleased';

  function allowList(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] === 'string' && value[i]) out.push(value[i]);
    }
    return out;
  }

  var configEl = doc.getElementById('behaviour-config');
  if (configEl) {
    configState = 'invalid';
    try {
      var supplied = JSON.parse(configEl.textContent);
      if (supplied && supplied.schema === 1) {
        configState = 'ok';
        var declared = [];
        var listed = Array.isArray(supplied.acts) ? supplied.acts : [];
        for (var d = 0; d < listed.length; d++) {
          var one = listed[d];
          if (!one || !one.selector) continue;
          declared.push([cut(one.name || one.selector, 24), one.selector]);
        }
        CONFIG.acts = declared;
        if (supplied.probes) {
          for (var p in supplied.probes) {
            if (typeof supplied.probes[p] === 'string' && supplied.probes[p]) CONFIG.probes[p] = supplied.probes[p];
          }
        }
        if (!releaseMeta && supplied.release) RELEASE = cut(supplied.release, 24);
        var campaign = supplied.campaign || {};
        allow = {
          us: allowList(campaign.source),
          um: allowList(campaign.medium),
          uc: allowList(campaign.campaign),
          ux: allowList(campaign.content)
        };
      }
    } catch (e) { configState = 'invalid'; }
  }
  if (configState === 'invalid') RELEASE = 'unavailable';

  function allowed(slot, value) {
    if (!cleanValue(value)) return false;
    var list = allow[slot] || [];
    for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
    return false;
  }

  function emptyCamp() {
    return { us: '', um: '', uc: '', ux: '' };
  }

  function campClean(obj) {
    if (!obj || typeof obj !== 'object') return null;
    for (var key in obj) {
      if (SLOT.indexOf(key) < 0) return null;
    }
    var next = emptyCamp();
    for (var i = 0; i < SLOT.length; i++) {
      var slot = SLOT[i];
      if (obj[slot] == null || obj[slot] === '') continue;
      if (typeof obj[slot] !== 'string' || !allowed(slot, obj[slot])) return null;
      next[slot] = obj[slot];
    }
    return next.uc ? next : null;
  }

  function scrubCampaign() {
    try {
      var raw = sessionStorage.getItem('pl.campaign');
      if (!raw) return null;
      var clean = campClean(JSON.parse(raw));
      if (!clean) {
        sessionStorage.removeItem('pl.campaign');
        return null;
      }
      return clean;
    } catch (e) {
      try { sessionStorage.removeItem('pl.campaign'); } catch (e2) {}
      return null;
    }
  }

  function storeCampaign(camp) {
    var blob = {};
    for (var i = 0; i < SLOT.length; i++) if (camp[SLOT[i]]) blob[SLOT[i]] = camp[SLOT[i]];
    try {
      if (!blob.uc) sessionStorage.removeItem('pl.campaign');
      else sessionStorage.setItem('pl.campaign', JSON.stringify(blob));
    } catch (e) {}
  }

  function clearCampaign() {
    try { sessionStorage.removeItem('pl.campaign'); } catch (e) {}
  }

  function readUrlCampaign(search) {
    var entries = parseQuery(search);
    if (!entries) return { state: 'tainted' };
    var counts = { us: 0, um: 0, uc: 0, ux: 0 };
    var values = emptyCamp();
    for (var i = 0; i < entries.length; i++) {
      var slot = null;
      for (var key in TAG) if (TAG[key] === entries[i][0]) slot = key;
      if (!slot) continue;
      counts[slot]++;
      values[slot] = entries[i][1];
    }
    var present = false;
    for (var s in counts) if (counts[s]) present = true;
    if (!present) return { state: 'absent' };
    for (var s2 in counts) if (counts[s2] > 1) return { state: 'tainted' };
    var next = emptyCamp();
    for (var s3 in values) {
      if (!counts[s3]) continue;
      if (!allowed(s3, values[s3])) return { state: 'tainted' };
      next[s3] = values[s3];
    }
    if (!next.uc) return { state: 'tainted' };
    return { state: 'ok', camp: next };
  }

  function sentState(search) {
    var entries = parseQuery(search);
    if (!entries) {
      var rawSent = /(?:^|[?&])sent(?:=|&|$)/.test(search || '');
      return { blockEntry: rawSent, flag: '', duplicate: false, present: rawSent };
    }
    var found = [];
    for (var i = 0; i < entries.length; i++) if (entries[i][0] === 'sent') found.push(entries[i][1]);
    if (!found.length) return { blockEntry: false, flag: '', duplicate: false, present: false };
    if (found.length > 1) return { blockEntry: true, flag: '', duplicate: true, present: true };
    if (found[0] === 'true' || found[0] === 'false') {
      return { blockEntry: true, flag: found[0] === 'true' ? 'sent' : 'unsent', duplicate: false, present: true };
    }
    return { blockEntry: true, flag: '', duplicate: false, present: true };
  }

  var query = sentState(location.search);
  var srcNow = source();
  var pgNow = pageKey();
  var newArrival = !query.blockEntry && srcNow !== 'internal';
  var CAMP = emptyCamp();

  if (configState === 'invalid') {
    clearCampaign();
  } else if (newArrival) {
    var urlCamp = readUrlCampaign(location.search);
    if (urlCamp.state === 'ok') {
      CAMP = urlCamp.camp;
      storeCampaign(CAMP);
    } else {
      CAMP = emptyCamp();
      clearCampaign();
    }
  } else {
    var heldCamp = scrubCampaign();
    if (heldCamp) CAMP = heldCamp;
  }

  var EPG = 'unavailable';
  var ESRC = 'unavailable';

  function entryOk(value, max) {
    return !!value && value.length <= max && value !== 'unavailable' && !/[@\s?#&%]/.test(value);
  }

  if (newArrival) {
    EPG = pgNow;
    ESRC = srcNow;
    try {
      sessionStorage.setItem('pl.entry', JSON.stringify({ epg: EPG, esrc: ESRC }));
    } catch (e) {}
  } else {
    try {
      var heldEntry = JSON.parse(sessionStorage.getItem('pl.entry') || 'null');
      if (heldEntry && entryOk(heldEntry.epg, 60) && entryOk(heldEntry.esrc, 60) && heldEntry.esrc !== 'internal') {
        EPG = cut(heldEntry.epg, 60);
        ESRC = cut(heldEntry.esrc, 60);
      } else if (heldEntry) {
        sessionStorage.removeItem('pl.entry');
      }
    } catch (e) {}
  }

  var BASE = {
    v: '1',
    rel: RELEASE,
    dev: device(),
    vw: viewport(),
    pg: pgNow,
    src: srcNow,
    epg: EPG,
    esrc: ESRC
  };
  if (configState === 'fallback') BASE.config = 'fallback';
  for (var tag in CAMP) if (CAMP[tag]) BASE[tag] = CAMP[tag];

  function send(name, props) {
    if (budget <= 0) return;
    budget--;
    var payload = {};
    var key;
    for (key in BASE) payload[key] = BASE[key];
    if (props) {
      for (key in props) {
        if (props[key] === undefined || props[key] === null || props[key] === '') continue;
        payload[key] = cut(props[key], 120);
      }
    }
    try { plausible(name, { props: payload }); } catch (e) {}
  }

  function once(id, name, props) {
    if (sent[id]) return;
    sent[id] = true;
    send(name, props);
  }

  function cleanSentOnLoad() {
    /* contact.js reads `sent` when it runs. Do not strip before `load`. */
    addEventListener('load', function () {
      try {
        var url = new URL(location.href);
        url.searchParams['delete']('sent');
        var qs = url.searchParams.toString();
        history.replaceState(null, '', url.pathname + (qs ? '?' + qs : '') + url.hash);
      } catch (e) {}
    });
  }

  doc.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.querySelector) return;
    var slot = form.querySelector('input[name="campaign"]');
    if (!slot) return;
    slot.value = [CAMP.uc, CAMP.ux, CAMP.us].filter(Boolean).join('/') || 'untagged';
  }, true);

  if (query.present) cleanSentOnLoad();

  if (configState === 'invalid') {
    try { console.error('behaviour: invalid config'); } catch (e) {}
    send('page', { config: 'invalid' });
    return;
  }

  var ACTS = CONFIG.acts;
  var acts = [];
  for (var a = 0; a < ACTS.length; a++) {
    var actEl = doc.querySelector(ACTS[a][1]);
    if (actEl) acts.push({ name: ACTS[a][0], el: actEl, seen: false, ms: 0, since: null });
  }
  acts.sort(function (x, y) {
    if (x.el === y.el) return 0;
    return (x.el.compareDocumentPosition(y.el) & 4) ? -1 : 1;
  });

  send('page');

  var seenCount = 0;
  var deepest = -1;
  var visible = doc.visibilityState !== 'hidden';
  var watching = false;

  function geometryHit(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight || 0;
    if (!(vh > 0)) return false;
    var top = rect.top > 0 ? rect.top : 0;
    var bottom = rect.bottom < vh ? rect.bottom : vh;
    var shown = bottom - top;
    if (shown < 0) shown = 0;
    return shown >= Math.min(rect.height * 0.5, vh * 0.4);
  }

  function noteHit(record, index, now) {
    if (!visible) return;
    if (!record.seen) {
      record.seen = true;
      seenCount++;
      if (index > deepest) deepest = index;
      send('act', { act: record.name });
    }
    if (record.since == null) record.since = now;
  }

  function noteMiss(record, now) {
    if (record.since == null) return;
    record.ms += now - record.since;
    record.since = null;
  }

  function onGeometry() {
    var keep = false;
    var now = performance.now();
    for (var j = 0; j < acts.length; j++) {
      var record = acts[j];
      var hit = false;
      var overlaps = false;
      try {
        hit = geometryHit(record.el);
        var rect = record.el.getBoundingClientRect();
        overlaps = rect.bottom > 0 && rect.top < (window.innerHeight || 0);
      } catch (e) {}
      if (hit) noteHit(record, j, now);
      else noteMiss(record, now);
      if (!record.seen && overlaps) keep = true;
    }
    if (keep) arm();
    else disarm();
  }

  function arm() {
    if (watching) return;
    watching = true;
    addEventListener('scroll', onGeometry, { passive: true });
  }

  function disarm() {
    if (!watching) return;
    watching = false;
    removeEventListener('scroll', onGeometry);
  }

  function thresholdsFor(el) {
    var height = 0;
    try { height = el.getBoundingClientRect().height; } catch (e) {}
    var vh = window.innerHeight || 1;
    var ratio = height > 0 ? Math.min(0.5, (vh * 0.4) / height) : 0.5;
    if (ratio < 0) ratio = 0;
    if (ratio > 1) ratio = 1;
    var raw = [0, ratio, 0.5, 1];
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var seenT = false;
      for (var k = 0; k < out.length; k++) if (Math.abs(out[k] - raw[i]) < 1e-6) seenT = true;
      if (!seenT) out.push(raw[i]);
    }
    out.sort(function (x, y) { return x - y; });
    return out;
  }

  function entryHit(entry) {
    var shown = entry.isIntersecting ? entry.intersectionRect.height : 0;
    var half = entry.boundingClientRect.height * 0.5;
    var vh = window.innerHeight || 0;
    if (!(vh > 0)) return false;
    return shown >= Math.min(half, vh * 0.4);
  }

  if (acts.length && 'IntersectionObserver' in window) {
    for (var o = 0; o < acts.length; o++) {
      (function (index) {
        new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var now = performance.now();
            if (entryHit(entry)) noteHit(acts[index], index, now);
            else noteMiss(acts[index], now);
            if (entry.isIntersecting && !acts[index].seen) arm();
          }
        }, { threshold: thresholdsFor(acts[index].el) }).observe(acts[index].el);
      })(o);
    }
  }
  if (acts.length) {
    addEventListener('resize', onGeometry, { passive: true });
    onGeometry();
  }

  function actOf(el) {
    for (var i = 0; i < acts.length; i++) if (acts[i].el.contains(el)) return acts[i].name;
    return '';
  }

  function hrefKey(href) {
    if (!href) return 'other';
    try {
      var url = new URL(href, location.href);
      var scheme = url.protocol.replace(':', '');
      if (scheme === 'mailto' || scheme === 'tel') return scheme;
      if (scheme !== 'http' && scheme !== 'https') return cut(scheme + ':other', 60);
      if (url.host === location.host) return cut(url.pathname.replace(/^\/+|\/+$/g, '') || 'home', 60);
      return cut(url.host + url.pathname, 60);
    } catch (e) { return 'other'; }
  }

  var dialog = doc.querySelector(CONFIG.probes.contact || 'dialog.contact');
  var contactRoute = (dialog && dialog.getAttribute('data-contact-route')) || '';
  var pendingWhere = '';

  function itemOf(el) {
    var cell = el.closest('[data-media-cell]');
    return cell ? cell.getAttribute('data-title') : '';
  }

  doc.addEventListener('click', function (event) {
    var from = event.target;
    if (!from || !from.closest) return;
    var link = from.closest('a[href]');
    if (!link) return;
    var inLetter = !!(dialog && dialog.contains(link));
    var where = inLetter ? 'letter' : (actOf(link) || 'frame');
    if (contactRoute && link.getAttribute('href') === contactRoute) pendingWhere = where;
    send('cta', {
      where: where,
      target: hrefKey(link.getAttribute('href')),
      label: cut(link.textContent, 48),
      item: itemOf(link)
    });
  }, true);

  /* paired is a prior same-tab attempt marker bound to the submitting pathname.
     It is not authenticated pairing and not server acceptance. */
  if (dialog) {
    var letterOpen = false;
    new MutationObserver(function () {
      var open = doc.body.classList.contains('contact-open');
      if (open === letterOpen) return;
      letterOpen = open;
      if (!open) return;
      once('letter-open', 'contact', { step: 'open', where: pendingWhere || 'unknown' });
      pendingWhere = '';
    }).observe(doc.body, { attributes: true, attributeFilter: ['class'] });

  }

  doc.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.getAttribute || form.getAttribute('data-contact-form') == null) return;
    try { sessionStorage.setItem('pl.receipt', pageKey()); } catch (e) {}
    once('letter-submit', 'contact', { step: 'submit' });
  }, true);

  if (query.flag) {
    var paired = '0';
    try {
      var marker = sessionStorage.getItem('pl.receipt');
      if (marker && marker === pageKey()) paired = '1';
      if (marker) sessionStorage.removeItem('pl.receipt');
    } catch (e) { paired = 'unavailable'; }
    send('contact', { step: 'receipt', flag: query.flag, paired: paired });
  }

  doc.addEventListener('media:carousel', function (event) {
    var detail = event.detail || {};
    var group = detail.group || '';
    var id = 'reel-' + group + '-' + detail.index;
    var title = event.target && event.target.querySelector('[data-media-slot="title"]');
    once(id, 'carousel', {
      group: group,
      idx: detail.index,
      why: detail.reason,
      item: title ? cut(title.textContent, 40) : ''
    });
  });

  var scenes = [].slice.call(doc.querySelectorAll(CONFIG.probes.ink || '[data-ink-scene]'));
  var inkPainted = 0;
  var inkStart = performance.now();
  for (var s = 0; s < scenes.length; s++) {
    (function (scene, index) {
      new MutationObserver(function () {
        if (scene.__painted) return;
        scene.__painted = true;
        inkPainted++;
        once('ink-' + index, 'runtime', {
          ok: 'ink',
          scene: scene.getAttribute('data-ink-scene') || '',
          ms: bucket(performance.now() - inkStart, [1000, 2500, 5000], ['lt1s', 'lt2.5s', 'lt5s', 'gte5s'])
        });
      }).observe(scene, { attributes: true, attributeFilter: ['data-ink-frame'] });
    })(scenes[s], s);
  }

  var sceneSeen = false;
  if (scenes.length && 'IntersectionObserver' in window) {
    var sceneIO = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) if (entries[i].isIntersecting) sceneSeen = true;
    }, { threshold: [0.1] });
    for (var q = 0; q < scenes.length; q++) sceneIO.observe(scenes[q]);
  }

  var fault = doc.querySelector(CONFIG.probes.fault || '#fault');
  if (fault) {
    new MutationObserver(function () {
      var why = cut(fault.textContent, 80);
      if (why) once('fault', 'runtime', { ok: 'false', why: why });
    }).observe(fault, { childList: true, characterData: true, subtree: true });
  }

  var fallback = doc.querySelector(CONFIG.probes.fallback || '#enable-runtime');
  if (fallback) {
    fallback.addEventListener('click', function () {
      once('fallback', 'runtime', { ok: 'fallback', why: 'reader-opened' });
    });
  }

  var perf = { lcp: 0, cls: 0, eventMax: 0 };
  var perfSeen = { lcp: false, cls: false, eventMax: false };
  var firstGesture = -1;

  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (type) {
    addEventListener(type, function () {
      if (firstGesture < 0) firstGesture = performance.now();
    }, { capture: true, passive: true, once: true });
  });

  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      perf.lcp = entries[entries.length - 1].startTime;
      perfSeen.lcp = true;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}

  function supports(type) {
    try {
      var types = PerformanceObserver.supportedEntryTypes;
      if (!types) return false;
      for (var i = 0; i < types.length; i++) if (types[i] === type) return true;
    } catch (e) {}
    return false;
  }

  try {
    if (supports('layout-shift')) {
      new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].hadRecentInput) perf.cls += entries[i].value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      perfSeen.cls = true;
    }
  } catch (e) {}

  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        perfSeen.eventMax = true;
        if (entries[i].duration > perf.eventMax) perf.eventMax = entries[i].duration;
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (e) {}

  function perfBand(seenBand, value, edges, names) {
    if (!seenBand) return 'unavailable';
    return bucket(value, edges, names);
  }

  function sendPerf() {
    once('perf', 'perf', {
      lcp: perfBand(perfSeen.lcp, perf.lcp, [1000, 2500, 4000], ['lt1s', 'lt2.5s', 'lt4s', 'gte4s']),
      event_max: perfBand(perfSeen.eventMax, perf.eventMax, [100, 200, 500], ['lt100', 'lt200', 'lt500', 'gte500']),
      cls: perfBand(perfSeen.cls, perf.cls, [0.01, 0.1, 0.25], ['lt0.01', 'lt0.1', 'lt0.25', 'gte0.25']),
      fg: firstGesture < 0 ? 'none' : bucket(firstGesture, [1000, 2000, 5000], ['lt1s', 'lt2s', 'lt5s', 'gte5s'])
    });
  }

  var start = performance.now();
  var hiddenMs = 0;
  var hiddenAt = visible ? null : performance.now();
  var closed = false;

  function onHidden() {
    visible = false;
    var now = performance.now();
    for (var i = 0; i < acts.length; i++) {
      if (acts[i].since != null) {
        acts[i].ms += now - acts[i].since;
        acts[i].since = null;
      }
    }
    if (hiddenAt == null) hiddenAt = performance.now();
  }

  function onVisible() {
    if (closed) return;
    if (hiddenAt != null) {
      hiddenMs += performance.now() - hiddenAt;
      hiddenAt = null;
    }
    visible = true;
    onGeometry();
  }

  doc.addEventListener('visibilitychange', function () {
    if (doc.visibilityState === 'hidden') {
      onHidden();
      sendPerf();
    } else {
      onVisible();
    }
  });

  function close() {
    if (closed) return;
    closed = true;
    var now = performance.now();
    var live = now - start - hiddenMs - (hiddenAt != null ? now - hiddenAt : 0);
    if (live < 0) live = 0;
    send('exit', {
      max: deepest >= 0 ? acts[deepest].name : 'none',
      acts: seenCount + '/' + acts.length,
      t: bucket(live, [3000, 10000, 30000, 90000], ['lt3s', 'lt10s', 'lt30s', 'lt90s', 'gte90s'])
    });
    for (var i = 0; i < acts.length; i++) {
      var record = acts[i];
      if (!record.seen) continue;
      var held = record.ms + (record.since != null ? now - record.since : 0);
      record.since = null;
      send('dwell', {
        act: record.name,
        ms: bucket(held, [1000, 3000, 10000, 30000], ['lt1s', 'lt3s', 'lt10s', 'lt30s', 'gte30s'])
      });
    }
    if (scenes.length && !inkPainted && sceneSeen) once('no-frame', 'runtime', { ok: 'false', why: 'no-frame' });
    sendPerf();
  }

  /* Flush on pagehide and freeze, once. visibility-hidden pauses clocks; it is
     not an exit. If the page resumes after that flush (BFCache pageshow or
     resume), there is no second page and no second exit. Restored time is not
     added. That residual is deliberate. */
  doc.addEventListener('freeze', close);
  addEventListener('pagehide', close);
})();
