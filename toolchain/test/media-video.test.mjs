import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../assets/js/media-video.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

function target() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    emit(type) { for (const fn of listeners.get(type) || []) fn(); },
  };
}

// Execute the shipped player. Media promises, frame presentation and observer
// delivery are independent, so the tests can exercise mobile startup races.
function harness({ reduced = false, saveData = false, effectiveType = '4g',
  reducedData = false, compact = true, hidden = false, frameCallbacks = false,
  clips = [{}] } = {}) {
  const timers = new Map(), observers = [], calls = [];
  let serial = 0;
  function element() {
    const attrs = new Map();
    return {
      ...target(), dataset: {}, children: [], isConnected: true,
      setAttribute(name, value) { attrs.set(name, value); },
      hasAttribute(name) { return attrs.has(name); },
      getAttribute(name) { return attrs.get(name) ?? null; },
      removeAttribute(name) {
        attrs.delete(name);
        if (name === 'data-media-attached') delete this.dataset.mediaAttached;
      },
      appendChild(child) { this.children.push(child); child.parentElement = this; },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
      remove() { this.parentElement.removeChild(this); },
      get firstChild() { return this.children[0]; },
      querySelector(selector) { return selector === 'source' ? this.children[0] || null : null; },
      querySelectorAll(selector) { return selector === 'source' ? this.children.slice() : []; },
      closest() { return null; },
    };
  }
  const videos = clips.map(({ group = 'how', active = true, priority = false, hover = false } = {}) => {
    const video = Object.assign(element(), {
      dataset: { src: '/clip.mp4', srcCompact: '/compact.mp4', mediaGroup: group, mediaMode: hover ? 'hover' : 'loop' },
      readyState: 0, currentTime: 0, videoWidth: 0, paused: true, ended: false,
      autoplay: priority, loads: 0, plays: [], frames: new Map(), error: null,
      load() { this.loads++; this.readyState = 0; this.paused = true; this.error = null; },
      pause() { this.paused = true; },
      play() {
        this.paused = false;
        const call = { video: this, readyState: this.readyState, muted: this.muted,
          inline: this.playsInline, autoplay: this.autoplay };
        calls.push(call); this.plays.push(call);
        return new Promise((resolve, reject) => { call.resolve = resolve; call.reject = reject; });
      },
    });
    if (active) video.setAttribute('data-media-active', '');
    if (priority) {
      video.dataset.mediaPriority = '1';
      video.dataset.mediaAttached = '1';
      const src = element(); src.src = '/priority.mp4'; video.appendChild(src);
    }
    if (frameCallbacks) {
      video.requestVideoFrameCallback = fn => { video.frames.set(++serial, fn); return serial; };
      video.cancelVideoFrameCallback = id => video.frames.delete(id);
    }
    return video;
  });
  const document = Object.assign(target(), {
    hidden,
    querySelectorAll(selector) {
      return selector === '[data-media-priority]' ? videos.filter(v => v.dataset.mediaPriority) : videos;
    },
    createElement: element,
  });
  const window = Object.assign(target(), {
    scrollX: 0, scrollY: 0, scrollTo() {},
    matchMedia(query) {
      return { matches: query.includes('max-width') ? compact :
        query.includes('reduced-data') ? reducedData : query.includes('reduced-motion') ? reduced : false };
    },
  });
  runInNewContext(source, {
    window, document, navigator: { connection: { saveData, effectiveType } },
    setTimeout(fn) { timers.set(++serial, fn); return serial; },
    clearTimeout(id) { timers.delete(id); },
    IntersectionObserver: class {
      constructor(fn) { observers.push(fn); }
      observe() {}
    },
  });
  return {
    videos, calls, timers, window, document,
    sync: () => window.paperlandMedia.sync(),
    visibility(value) { document.hidden = value; document.emit('visibilitychange'); },
    intersect(video, visible) {
      const entries = [{ target: video, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }];
      observers.forEach(fn => fn(entries));
    },
    flushTimers() { const batch = [...timers.values()]; timers.clear(); batch.forEach(fn => fn()); },
    start(video = videos[0]) {
      video.paused = false; video.readyState = 4;
      video.emit('playing');
      video.plays.at(-1)?.resolve();
    },
    frame(video = videos[0]) { const batch = [...video.frames.values()]; video.frames.clear(); batch.forEach(fn => fn()); },
    reject(name = 'NotAllowedError', video = videos[0]) {
      video.paused = true;
      video.plays.at(-1).reject(Object.assign(new Error(name), { name }));
    },
  };
}

test('autoplay requests play at HAVE_NOTHING without waiting for canplay', () => {
  const h = harness(); h.sync();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].readyState, 0);
  assert.ok(h.calls[0].muted && h.calls[0].inline && h.calls[0].autoplay);
  assert.equal(h.videos[0].listeners.has('canplay'), false);
  assert.equal(h.videos[0].children[0].src, '/compact.mp4');
  assert.equal(h.videos[0].hasAttribute('data-ready'), false);
});

test('pending play requests are not duplicated by observer/sync callbacks', () => {
  const h = harness(); h.sync();
  for (let i = 0; i < 8; i++) h.sync();
  assert.equal(h.calls.length, 1);
});

test('a first frame, not preloading, reveals the video and unlocks its neighbour', () => {
  const h = harness({ frameCallbacks: true, clips: [{}, { active: false }] });
  const [first, next] = h.videos;
  next.setAttribute('data-media-decode', '');
  h.sync();
  assert.equal(next.dataset.mediaAttached, undefined);
  h.start();
  assert.equal(first.hasAttribute('data-ready'), false);
  h.frame();
  assert.equal(first.hasAttribute('data-ready'), true);
  assert.equal(next.dataset.mediaAttached, '1');
  assert.equal(next.autoplay, false, 'warming must not autoplay the next clip');
  assert.equal(next.plays.length, 0);
});

test('a fulfilled play promise reveals on browsers without frame callbacks', async () => {
  const h = harness(); h.sync();
  const v = h.videos[0]; v.readyState = 4;
  h.calls[0].resolve(); await tick();
  assert.equal(v.hasAttribute('data-ready'), true);
  assert.equal(v.dataset.mediaPlayback, 'playing');
});

test('Reduce Motion still plays videos', () => {
  const h = harness({ reduced: true, clips: [{ priority: true }] });
  assert.equal(h.calls.length, 1);
  h.start();
  assert.equal(h.videos[0].hasAttribute('data-ready'), true);
});

for (const options of [{ saveData: true }, { reducedData: true }, { effectiveType: '2g' }]) {
  test(`data-saving remains still-only: ${JSON.stringify(options)}`, () => {
    const h = harness({ ...options, clips: [{ priority: true }] });
    assert.equal(h.calls.length, 0);
    assert.equal(h.videos[0].children.length, 0);
    assert.equal(h.timers.size, 0);
  });
}

test('policy denial is observable without a retry storm or a play button', async () => {
  const h = harness(); h.sync(); h.reject(); await tick();
  for (let i = 0; i < 8; i++) h.sync();
  assert.equal(h.calls.length, 1);
  assert.equal(h.videos[0].dataset.mediaPlayback, 'blocked');
  assert.equal(h.videos[0].hasAttribute('data-ready'), false);
  assert.equal(h.timers.size, 0);
  assert.ok(h.videos[0].children.every(node => node.type !== 'button'));
});

test('a transient abort retries automatically once, not forever', async () => {
  const h = harness(); h.sync(); h.reject('AbortError'); await tick();
  assert.equal(h.timers.size, 1);
  h.sync(); assert.equal(h.calls.length, 1);
  h.flushTimers(); assert.equal(h.calls.length, 2);
  h.reject('AbortError'); await tick(); h.flushTimers(); h.sync();
  assert.equal(h.calls.length, 2);
  assert.equal(h.timers.size, 0);
});

test('a synchronous play failure is contained and bounded', () => {
  const h = harness();
  h.videos[0].play = () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); };
  assert.doesNotThrow(() => h.sync());
  assert.equal(h.videos[0].dataset.mediaPlayback, 'blocked');
  assert.equal(h.timers.size, 0);
});

test('leaving cancels retries and releases sources and native autoplay', async () => {
  const h = harness(); h.sync(); h.reject('AbortError'); await tick();
  const v = h.videos[0]; v.removeAttribute('data-media-active'); h.sync();
  assert.equal(h.timers.size, 0);
  assert.equal(v.dataset.mediaAttached, '0');
  assert.equal(v.autoplay, false);
  h.flushTimers(); assert.equal(h.calls.length, 1);
});

test('a stale rejection after detach/reattach cannot block the new request', async () => {
  const h = harness(); h.sync(); const old = h.calls[0];
  const v = h.videos[0]; v.removeAttribute('data-media-active'); h.sync();
  v.setAttribute('data-media-active', ''); h.sync();
  old.reject(Object.assign(new Error('old denied'), { name: 'NotAllowedError' })); await tick();
  assert.equal(v.dataset.mediaPlayback, 'loading');
  h.sync(); assert.equal(h.calls.length, 2, 'new request is still pending');
  h.start(); assert.equal(v.dataset.mediaPlayback, 'playing');
});

test('hidden tabs stay paused and return to automatic playback', () => {
  const h = harness(); h.sync(); h.start();
  h.visibility(true); h.sync();
  assert.equal(h.calls.length, 1);
  assert.equal(h.videos[0].autoplay, false);
  assert.equal(h.videos[0].paused, true);
  h.visibility(false);
  assert.equal(h.calls.length, 2);
  assert.equal(h.videos[0].autoplay, true);
});

test('pagehide suspends despite observers; pageshow restores autoplay', async () => {
  const h = harness(); h.sync(); h.reject(); await tick();
  h.window.emit('pagehide'); h.sync();
  assert.equal(h.calls.length, 1);
  h.window.emit('pageshow');
  assert.equal(h.calls.length, 2);
});

test('restoring connectivity reloads failed visible media and retries', async () => {
  const h = harness(); h.sync(); h.reject('NetworkError'); await tick();
  const v = h.videos[0], loads = v.loads; v.error = { code: 2 };
  h.window.emit('online');
  assert.ok(v.loads > loads);
  assert.equal(v.error, null);
  assert.equal(h.calls.length, 2);
  assert.equal(h.timers.size, 0);
});

test('ungrouped offscreen media stays idle and resumes when visible', () => {
  const h = harness({ clips: [{ group: '' }] }); h.sync();
  assert.equal(h.calls.length, 0);
  h.intersect(h.videos[0], true); assert.equal(h.calls.length, 1);
  h.start(); h.intersect(h.videos[0], false);
  assert.equal(h.videos[0].paused, true);
  assert.equal(h.videos[0].autoplay, false);
});

test('the shared decoder cap remains bounded', () => {
  const h = harness({ clips: Array.from({ length: 5 }, (_, i) => ({ group: `group-${i}` })) }); h.sync();
  assert.equal(h.videos.filter(v => v.dataset.mediaAttached === '1').length, 3);
  assert.equal(h.calls.length, 3);
});

test('an outgoing warm clip stops while the incoming clip is still loading', async () => {
  const h = harness({ clips: [{}, { active: false }] }); h.sync();
  const [outgoing, incoming] = h.videos;
  const old = h.calls[0];
  outgoing.removeAttribute('data-media-active'); outgoing.setAttribute('data-media-decode', '');
  incoming.setAttribute('data-media-active', ''); h.sync();
  assert.equal(outgoing.paused, true);
  assert.equal(outgoing.autoplay, false);
  assert.equal(incoming.plays.length, 1);
  old.reject(Object.assign(new Error('cancelled warm request'), { name: 'AbortError' })); await tick();
  assert.equal(h.timers.size, 0);
});

test('an already-attached warm clip cannot overflow the decoder cap', () => {
  const h = harness({ clips: [{}, { group: 'two' }, { group: 'three' },
    { group: 'four', active: false, priority: true }] });
  h.videos[3].setAttribute('data-media-decode', ''); h.sync();
  assert.equal(h.videos.filter(v => v.dataset.mediaAttached === '1').length, 3);
  assert.equal(h.videos[3].autoplay, false);
});

test('a stale fulfilled request cannot reveal a detached video', async () => {
  const h = harness(); h.sync(); const old = h.calls[0];
  h.videos[0].removeAttribute('data-media-active'); h.sync();
  old.resolve(); await tick();
  assert.equal(h.videos[0].hasAttribute('data-ready'), false);
  assert.equal(h.videos[0].dataset.mediaAttached, '0');
});

test('legacy players without play promises reveal through the playing event', () => {
  const h = harness();
  h.videos[0].play = () => { h.videos[0].paused = false; };
  h.sync(); h.start();
  assert.equal(h.videos[0].hasAttribute('data-ready'), true);
});

test('priority markup and reduced-motion styles permit native autoplay', () => {
  const template = readFileSync(new URL('../../_includes/media/video.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../assets/css/core/media.css', import.meta.url), 'utf8');
  assert.match(template, /if media_priority %}autoplay preload="auto"/);
  assert.doesNotMatch(template, /prefers-reduced-motion/);
  const reducedVideoRule = css.match(/@media \(prefers-reduced-motion: reduce\)\s*{\s*\.media-hero-video,\s*\.media-clip-el\s*{([^}]+)}/);
  assert.ok(reducedVideoRule);
  assert.doesNotMatch(reducedVideoRule[1], /opacity|display|visibility/);
  assert.match(reducedVideoRule[1], /transition: none/);
});
