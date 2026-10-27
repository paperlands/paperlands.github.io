import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../assets/js/home/helios.js', import.meta.url), 'utf8');
function target() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    emit(type, detail = {}) { for (const fn of listeners.get(type) || []) fn({ type, ...detail }); },
  };
}
function clip() {
  return Object.assign(target(), {
    duration: 10, currentTime: 2, playbackRate: 1, readyState: 4,
    paused: true, ended: false, seeking: false, hasAttribute: () => true,
  });
}
function harness({ reduced = false, animate = true } = {}) {
  const animations = [], writes = [], motion = Object.assign(target(), { matches: reduced });
  const video = clip(); let active = video;
  const fill = { style: { setProperty: (...args) => writes.push(args) } };
  if (animate) fill.animate = (frames, options) => {
    const animation = {
      frames, options, playState: 'running', playbackRate: 1, seeks: 0, plays: 0,
      get currentTime() { return this.time ?? 0; },
      set currentTime(value) { this.time = value; this.seeks++; },
      pause() { this.playState = 'paused'; },
      play() { this.playState = 'running'; this.plays++; },
      cancel() { this.playState = 'idle'; },
    };
    animations.push(animation); return animation;
  };
  const hero = {
    contains: () => true,
    querySelector: selector => selector === '[data-media-active]' ? active :
      selector === '[data-media="video"]' ? video : selector === '[data-helios-play]' ? fill : null,
  };
  const root = {
    querySelector: selector => selector === '.helios-hero' ? hero :
      selector === '[data-helios-play]' ? fill : null,
    querySelectorAll: () => [],
  };
  const document = Object.assign(target(), { hidden: false, querySelector: () => root });
  const window = Object.assign(target(), {
    matchMedia: () => motion, scrollY: 0, setTimeout() {},
    requestAnimationFrame() { throw new Error('progress must not schedule frame callbacks'); },
  });
  runInNewContext(source, { document, window });
  return { video, animations, writes, document, motion,
    swap(next) { active = next; document.emit('media:carousel', { target: hero }); },
    visible(value) { document.hidden = !value; document.emit('visibilitychange'); },
  };
}

test('one linear transform animation follows media time without frame callbacks', () => {
  const h = harness(), a = h.animations[0];
  assert.equal(a.playState, 'paused');
  assert.equal(a.currentTime, 2000);
  assert.equal(a.options.duration, 10000);
  assert.equal(a.options.easing, 'linear');
  assert.deepEqual(Object.keys(a.frames[0]), ['transform']);
  h.video.paused = false; h.video.emit('playing');
  assert.equal(a.playState, 'running');
  a.time = 2260; h.video.currentTime = 2.25;
  const seeks = a.seeks, plays = a.plays;
  h.video.emit('timeupdate'); h.swap(h.video);
  assert.equal(a.seeks, seeks, 'healthy animation is not restarted by routine events');
  assert.equal(a.plays, plays);
  assert.equal(h.animations.length, 1);
  a.time = 2600; h.video.currentTime = 3;
  h.video.emit('timeupdate');
  assert.equal(a.currentTime, 3000, 'correct meaningful drift against the media clock');
});

test('pause and buffering freeze at the actual clock; playing resumes', () => {
  const h = harness(), a = h.animations[0];
  h.video.paused = false; h.video.emit('playing');
  h.video.currentTime = 3; h.video.emit('waiting');
  assert.equal(a.playState, 'paused'); assert.equal(a.currentTime, 3000);
  h.video.emit('timeupdate');
  assert.equal(a.playState, 'paused', 'timeupdate alone cannot undo waiting');
  h.video.emit('playing'); assert.equal(a.playState, 'running');
  h.video.paused = true; h.video.currentTime = 4; h.video.emit('pause');
  assert.equal(a.playState, 'paused'); assert.equal(a.currentTime, 4000);
});

test('seeking, rate changes and completion use exact media time, not eased interpolation', () => {
  const h = harness(), a = h.animations[0];
  h.video.paused = false; h.video.emit('playing');
  h.video.seeking = true; h.video.currentTime = 7; h.video.emit('seeking');
  assert.equal(a.currentTime, 7000); assert.equal(a.playState, 'paused');
  h.video.seeking = false; h.video.emit('seeked');
  assert.equal(a.playState, 'running');
  h.video.playbackRate = 2; h.video.emit('ratechange');
  assert.equal(a.playbackRate, 2); assert.equal(a.currentTime, 7000);
  h.video.ended = true; h.video.currentTime = 10; h.video.emit('ended');
  assert.equal(a.playState, 'paused'); assert.equal(a.currentTime, 10000);
  assert.equal(h.writes.at(-1)[1], '1');
});

test('clip swaps cancel the previous animation and remove its event listeners', () => {
  const h = harness(), old = h.animations[0], next = clip();
  next.currentTime = 0; h.swap(next);
  assert.equal(old.playState, 'idle');
  assert.equal(h.animations[1].currentTime, 0, 'reset does not animate backwards');
  assert.ok([...h.video.listeners.values()].every(listeners => listeners.size === 0));
  const writes = h.writes.length;
  h.video.currentTime = 9; h.video.emit('timeupdate');
  assert.equal(h.writes.length, writes);
  h.swap(null);
  assert.equal(h.animations[1].playState, 'idle', 'leaving the carousel stops its animation');
});

test('hidden documents stop animation and returning reanchors before resuming', () => {
  const h = harness(), a = h.animations[0];
  h.video.paused = false; h.video.emit('playing');
  h.visible(false); assert.equal(a.playState, 'paused');
  h.video.currentTime = 6; h.visible(true);
  assert.equal(a.currentTime, 6000); assert.equal(a.playState, 'running');
});

test('invalid metadata cancels animation; a new duration rebuilds the timeline', () => {
  const h = harness(), old = h.animations[0];
  h.video.duration = Infinity; h.video.emit('durationchange');
  assert.equal(old.playState, 'idle'); assert.equal(h.writes.at(-1)[1], '0');
  h.video.duration = 20; h.video.emit('loadedmetadata');
  assert.equal(h.animations.at(-1).options.duration, 20000);
  h.video.duration = 30; h.video.emit('durationchange');
  assert.equal(h.animations.at(-2).playState, 'idle');
  assert.equal(h.animations.at(-1).options.duration, 30000);
  h.video.currentTime = NaN; h.video.emit('emptied');
  assert.equal(h.animations.at(-1).playState, 'idle');
});

test('reduced motion and missing Web Animations retain event-driven static progress', () => {
  for (const options of [{ reduced: true }, { animate: false }]) {
    const h = harness(options);
    h.video.paused = false; h.video.currentTime = 5; h.video.emit('playing');
    assert.equal(h.animations.length, 0); assert.equal(h.writes.at(-1)[1], '0.5');
    const writes = h.writes.length; h.video.emit('timeupdate');
    assert.equal(h.writes.length, writes, 'unchanged progress needs no write');
  }
  const h = harness(); h.motion.matches = true; h.motion.emit('change');
  assert.equal(h.animations[0].playState, 'idle', 'live reduced-motion changes cancel smoothing');
});
