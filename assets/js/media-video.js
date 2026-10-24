(function () {
  // Decoders, not clips: every attached clip holds one, and the hero's stack is
  // already four. Whatever the reader can see plus what the writer bet on fits
  // inside this; the clip over the line stays on its still until its turn.
  var MAX_ATTACH = 3;
  var api = { sync: function () {} };
  window.paperlandMedia = api;

  var saveData = false;
  try {
    saveData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
  } catch (e) {}
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var poor = !!(saveData || (conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')));
  // A 4G estimate can still be a 1.5Mbps phone. There the active compact clip
  // is 63KB; its neighbour is 152KB. Warming the neighbour before the reader
  // has seen the active one puts the first frame behind it. Lean keeps the
  // active clip only: the next attaches when the carousel makes it active.
  var downlink = conn && typeof conn.downlink === 'number' ? conn.downlink : Infinity;
  var lean = !poor && downlink < 2;
  if (poor) {
    // Data-saving remains a still-only mode. Reduce Motion affects decoration
    // and transitions, not video playback. Reclaim any priority fetch here.
    Array.prototype.slice.call(document.querySelectorAll('[data-media-priority]')).forEach(function (video) {
      Array.prototype.slice.call(video.querySelectorAll('source')).forEach(function (s) { s.remove(); });
      video.removeAttribute('data-media-attached');
      video.autoplay = false;
      video.pause();
      video.preload = 'none';
      try { video.load(); } catch (e) {}
    });
    return;
  }

  var nearOf = new WeakMap();
  var visOf = new WeakMap();
  var genOf = new WeakMap();
  var playback = new WeakMap();
  var suspended = false;

  function stateOf(video) {
    if (!playback.has(video)) playback.set(video, { pending: null, timer: null, blocked: false, retries: 0 });
    return playback.get(video);
  }

  function clearAttempt(video) {
    var state = stateOf(video);
    clearTimeout(state.timer);
    state.timer = null;
    state.pending = null;
  }

  function resetPlayback(video) {
    var state = stateOf(video);
    state.blocked = false;
    state.retries = 0;
    delete video.dataset.mediaPlayback;
  }

  function pause(video) {
    bump(video);
    clearAttempt(video);
    resetPlayback(video);
    video.autoplay = false;
    video.pause();
  }

  function nodes() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-media="video"]'));
  }

  function addSource(video, src, type) {
    var el = document.createElement('source');
    el.src = src;
    if (type) el.type = type;
    video.appendChild(el);
  }

  function typeFor(src) {
    if (/\.webm(?:$|\?)/i.test(src)) return 'video/webm';
    if (/\.mp4(?:$|\?)/i.test(src)) return 'video/mp4';
    return '';
  }

  function bump(video) {
    genOf.set(video, (genOf.get(video) || 0) + 1);
    return genOf.get(video);
  }

  function attach(video, preload) {
    var src = video.dataset.src;
    if (!src) return;
    video.preload = preload || 'auto';
    if (video.dataset.mediaAttached === '1') return;
    // The compact pair is the phone portrait, not a device ladder. It is
    // chosen once, when the decoder attaches: a live resize across 640px
    // keeps the source it started with rather than interrupting playback.
    var compact = video.dataset.srcCompact && window.matchMedia('(max-width: 640px)').matches;
    if (compact) {
      if (video.dataset.srcAv1Compact) {
        addSource(video, video.dataset.srcAv1Compact, 'video/mp4; codecs="av01.0.04M.08"');
      }
      if (video.dataset.srcWebmCompact && video.dataset.srcWebmCompact !== video.dataset.srcCompact) {
        addSource(video, video.dataset.srcWebmCompact, 'video/webm');
      }
      addSource(video, video.dataset.srcCompact, typeFor(video.dataset.srcCompact));
    } else {
      if (video.dataset.srcAv1) {
        addSource(video, video.dataset.srcAv1, 'video/mp4; codecs="av01.0.04M.08"');
      }
      if (video.dataset.srcWebm && video.dataset.srcWebm !== src) {
        addSource(video, video.dataset.srcWebm, 'video/webm');
      }
      addSource(video, src, typeFor(src));
    }
    video.load();
    video.dataset.mediaAttached = '1';
  }

  // A still is the picture the clip is LEAVING, so it is only worth taking when
  // the clip actually advanced: media/video.html already carries a poster, and
  // that poster is the first frame. Taking a still of frame zero rewrote the
  // same picture as a JPEG and paid for it — measured on the built page, 1x CPU:
  // drawImage 10-30ms and a 21-45ms toDataURL at 1920x1080, inside the scroll or
  // inside the first frame of the hero. Guarded twice: never for a clip that
  // never moved, and never twice for one frame (`ended` is followed by `unbind`
  // at the same currentTime).
  var capturedAt = new WeakMap();
  var stills = new WeakMap();
  var revealWait = new WeakMap();
  var STILL_MAX = 960;

  function stillSize(video) {
    var width = video.videoWidth;
    var height = video.videoHeight;
    var css = video.clientWidth;
    var dpr = window.devicePixelRatio || 1;
    var wanted = css > 0 ? Math.min(width, Math.round(css * dpr)) : width;
    if (wanted < STILL_MAX) {
      height = Math.round(height * wanted / width);
      width = wanted;
    } else if (width > STILL_MAX) {
      height = Math.round(height * STILL_MAX / width);
      width = STILL_MAX;
    }
    return { width: Math.max(1, width), height: Math.max(1, height) };
  }

  function captureStill(video) {
    var host = video.closest('.media-clip');
    if (!host) return;
    if (video.readyState < 2 || !video.videoWidth) return;
    var poster = host.querySelector('.media-clip-poster');
    if (video.currentTime === 0 && poster) return;
    if (capturedAt.get(video) === video.currentTime) return;
    var box = stillSize(video);
    var canvas = document.createElement('canvas');
    canvas.width = box.width;
    canvas.height = box.height;
    var context = canvas.getContext('2d');
    try {
      context.drawImage(video, 0, 0, box.width, box.height);
    } catch (e) {
      return;
    }
    // A stalled or detached decoder can hand back a black frame. The authored
    // still is a better fallback than a black one; keep it.
    try {
      var sample = context.getImageData(0, 0, Math.min(32, box.width), Math.min(18, box.height)).data;
      var sum = 0;
      for (var i = 0; i < sample.length; i += 4) sum += sample[i] + sample[i + 1] + sample[i + 2];
      if (sum / (sample.length / 4 * 3) < 6) return;
    } catch (e) {}
    capturedAt.set(video, video.currentTime);
    var img = poster;
    if (!img) {
      img = document.createElement('img');
      img.className = 'media-clip-poster';
      img.alt = '';
      img.decoding = 'async';
      img.setAttribute('aria-hidden', 'true');
      host.insertBefore(img, video);
    }
    // The draw has to happen while the frame is live, the encode does not:
    // toBlob hands the JPEG to a worker, where toDataURL encoded it on this
    // thread and inflated the bytes by a third on the way out as base64.
    if (!canvas.toBlob) {
      img.src = canvas.toDataURL('image/jpeg', 0.72);
      return;
    }
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var previous = stills.get(img);
      var url = URL.createObjectURL(blob);
      stills.set(img, url);
      img.src = url;
      if (previous) URL.revokeObjectURL(previous);
    }, 'image/jpeg', 0.72);
  }

  function unbind(video) {
    clearAttempt(video);
    resetPlayback(video);
    video.autoplay = false;
    if (video.dataset.mediaAttached !== '1' && !video.getAttribute('src') && !video.querySelector('source')) {
      video.removeAttribute('data-ready');
      return;
    }
    if (revealWait.has(video)) {
      try { video.cancelVideoFrameCallback(revealWait.get(video)); } catch (e) {}
      revealWait.delete(video);
    }
    captureStill(video);
    bump(video);
    video.pause();
    video.removeAttribute('src');
    while (video.firstChild) video.removeChild(video.firstChild);
    try { video.load(); } catch (e) {}
    video.preload = 'none';
    video.removeAttribute('data-ready');
    video.dataset.mediaAttached = '0';
  }

  function reveal(video) {
    if (video.hasAttribute('data-ready')) return;
    if (!video.requestVideoFrameCallback) {
      video.setAttribute('data-ready', '');
      reconcileAll();
      return;
    }
    if (revealWait.has(video)) return;
    var handle = video.requestVideoFrameCallback(function () {
      revealWait.delete(video);
      if (video.dataset.mediaAttached !== '1' || !video.isConnected) return;
      if (video.hasAttribute('data-ready')) return;
      // Reveal only after a frame has actually been presented, so a lagging
      // decoder shows the authored still rather than a black video box.
      video.setAttribute('data-ready', '');
      reconcileAll();
    });
    revealWait.set(video, handle);
  }

  // play() can jump the document (Safari/iOS). Undo that jump only,
  // synchronously. A next-frame restore writes y the reader is driving
  // — exactly when the hero leaves and the next clips call play().
  function pinScroll(fn) {
    var x = window.scrollX;
    var y = window.scrollY;
    fn();
    if (window.scrollX === x && window.scrollY === y) return;
    try {
      window.scrollTo({ left: x, top: y, behavior: 'auto' });
    } catch (e) {
      window.scrollTo(x, y);
    }
  }

  function canPlay(video) {
    if (document.hidden || suspended || video.dataset.mediaAttached !== '1' || !video.isConnected) return false;
    if ((video.dataset.mediaMode || 'loop') === 'hover') return true;
    var p = policy(video, markedGroups());
    return p === 'play' || (p === 'io' && !!visOf.get(video));
  }

  function play(video) {
    if (!canPlay(video)) return;
    var state = stateOf(video);
    if (state.blocked || state.pending) return;
    video.autoplay = true;
    if (!video.paused && !video.ended) {
      if (video.readyState >= 2) reveal(video);
      return;
    }
    clearAttempt(video);
    var attempt = {};
    var gen = genOf.get(video) || 0;
    state.pending = attempt;
    video.dataset.mediaPlayback = 'loading';
    function current() {
      return state.pending === attempt && (genOf.get(video) || 0) === gen;
    }
    function failed(error) {
      if (!current()) return;
      clearAttempt(video);
      state.blocked = true;
      var denied = error && error.name === 'NotAllowedError';
      video.dataset.mediaPlayback = denied ? 'blocked' : 'error';
      // A browser policy denial cannot be overridden by script. Do not spin
      // on it. A transient load/abort gets one retry, never an endless timer.
      if (denied || state.retries >= 1 || !canPlay(video)) return;
      state.retries += 1;
      state.timer = setTimeout(function () {
        state.timer = null;
        if ((genOf.get(video) || 0) !== gen || !canPlay(video)) return;
        state.blocked = false;
        play(video);
      }, 1000);
    }
    function started() {
      if (!current()) return;
      clearAttempt(video);
      if (!canPlay(video) || video.paused) return;
      resetPlayback(video);
      video.dataset.mediaPlayback = 'playing';
      reveal(video);
    }
    try {
      // Request playback even at HAVE_NOTHING. Mobile preload is only a hint;
      // waiting for canplay before play can leave it waiting on itself forever.
      video.muted = true;
      video.playsInline = true;
      pinScroll(function () {
        var playing = video.play();
        if (playing && playing.then) playing.then(started, failed);
        // Older players without a promise are handled by the playing event.
      });
    } catch (e) {
      failed(e);
    }
  }

  // A group is carousel-owned. Unmarked members stay on the still — but only
  // once the writer has SPOKEN for that group. `marked` is "some member of this
  // group carries a mark", computed once per reconcile.
  //
  // The distinction is a measured bug, not tidiness. Both observers live in this
  // file; the writer's first marks are published by media-carousel's own
  // IntersectionObserver, and on a cold load this file's callback is delivered
  // first. With unmarked read as `drop`, that callback unbound the priority clip
  // the markup had deliberately started at parse (media/video.html preloads it),
  // took a still of it on the way out (drawImage 36.6ms + toDataURL 32.7ms at
  // 1x), threw away the 257KB it had already fetched, and re-attached it 60ms
  // later. `hold` says what `policy` meant: the player has no opinion until the
  // carousel has one.
  function policy(video, marked) {
    var group = video.dataset.mediaGroup || '';
    if (!group) return 'io';
    if (video.hasAttribute('data-media-active')) return 'play';
    if (video.hasAttribute('data-media-decode')) return lean ? 'drop' : 'warm';
    return marked[group] ? 'drop' : 'hold';
  }
  function score(video, p) {
    var n = 0;
    if (p === 'play') n += 40;
    else if (p === 'warm') n += 20;
    if (visOf.get(video)) n += 10;
    if (nearOf.get(video)) n += 5;
    if ((video.dataset.mediaMode || '') === 'hero') n += 2;
    return n;
  }

  function wantsAttach(p, video) {
    if (p === 'drop' || p === 'hold') return false;
    if (p === 'play' || p === 'warm') return true;
    return !!nearOf.get(video);
  }
  // Which groups the writer has ever spoken for. Read from the marks themselves —
  // the writer publishes them synchronously when it boots, so no second channel
  // can disagree with it — and remembered, because the writer also WITHDRAWS them
  // when the carousel leaves the viewport. "Hold" is only for a group that has
  // never been marked at all; a group whose marks are merely gone is still
  // carousel-owned, and its clips must be released as before.
  var written = {};
  function markedGroups() {
    nodes().forEach(function (v) {
      if (v.hasAttribute('data-media-active') || v.hasAttribute('data-media-decode')) {
        written[v.dataset.mediaGroup || ''] = true;
      }
    });
    return written;
  }
  function reconcileAll() {
    var list = nodes().filter(function (v) {
      return (v.dataset.mediaMode || 'loop') !== 'hover';
    });
    var marked = markedGroups();
    var ranked = list.map(function (v) {
      var p = policy(v, marked);
      return { v: v, p: p, s: score(v, p), want: wantsAttach(p, v) };
    }).sort(function (a, b) { return b.s - a.s; });

    // Warm is a bet on what the reader will look at next. It is only worth
    // placing once the thing they ARE looking at has a first frame: measured on
    // a throttled phone, warming the hero's second clip pulled 531KB down the
    // same 1.6Mbps pipe as the first clip's 755KB, and the first frame the
    // reader was waiting for arrived behind it. A clip left unwarmed shows its
    // own still, which is the same picture, so the cost of being wrong is a
    // slower handover — never a hole.
    // Per group, not globally: another carousel's clip coming up to its first
    // frame is no reason to spend this one's bandwidth — the "see" act's 33KB
    // still opened the door for the hero's 531KB next clip while the hero itself
    // had not painted yet.
    var readyGroups = {};
    ranked.forEach(function (row) {
      if (row.p === 'play' && row.v.hasAttribute('data-ready')) {
        readyGroups[row.v.dataset.mediaGroup || ''] = true;
      }
    });

    var attached = 0;
    ranked.forEach(function (row) {
      var video = row.v;
      var p = row.p;
      // The player has no opinion on this clip yet (see policy): do not start
      // it, and do not tear down what the markup started.
      if (p === 'hold') return;
      if (p === 'warm' && !readyGroups[video.dataset.mediaGroup || '']) {
        // A warm clip that is already attached still holds a decoder, so it
        // counts against the cap even while the bet is not worth placing. It
        // used to return without counting, which let the cap leak to four.
        if (video.dataset.mediaAttached === '1') {
          if (attached >= MAX_ATTACH) unbind(video);
          else {
            attached += 1;
            pause(video);
          }
        }
        return;
      }
      if (!row.want || attached >= MAX_ATTACH) {
        unbind(video);
        return;
      }
      attached += 1;
      if (p === 'warm' || document.hidden || suspended || (p === 'io' && !visOf.get(video))) {
        attach(video, p === 'play' || visOf.get(video) ? 'auto' : 'metadata');
        pause(video);
        if (video.ended) {
          captureStill(video);
          video.removeAttribute('data-ready');
        }
        return;
      }
      attach(video, 'auto');
      play(video);
    });
  }

  function bind(video) {
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    if (video.dataset.mediaAttached !== '1') video.preload = 'none';
    var mode = video.dataset.mediaMode || 'loop';

    video.addEventListener('playing', function () {
      if (!canPlay(video)) return;
      clearAttempt(video);
      resetPlayback(video);
      video.dataset.mediaPlayback = 'playing';
      reveal(video);
    });
    video.addEventListener('pause', function () {
      if (!video.ended) play(video);
    });

    if (mode === 'hover') {
      var host = video.closest('[data-media-hover]') || video;
      host.addEventListener('pointerenter', function () {
        attach(video, 'auto');
        play(video);
      });
      host.addEventListener('pointerleave', function () { unbind(video); });
      return;
    }

    video.addEventListener('ended', function () {
      captureStill(video);
      video.removeAttribute('data-ready');
    });
    near.observe(video);
    vis.observe(video);

    // The clip in the reader's first viewport does not wait for an observer to
    // tell it so. Everything else here is discovered: the observers are how a
    // clip that is off screen stays UNfetched. But the first one is known —
    // media/video.html marked it — and an IntersectionObserver's callback needs
    // a frame the main thread may not have: measured on a throttled phone, the
    // hero's own bytes were asked for 1267ms in, after the stylesheet had been
    // parsed and laid out, which is most of the way to a first frame that the
    // reader is already looking at a still of. Attaching here starts the
    // request in the same task as this script, before either observer fires.
    if (video.dataset.mediaPriority === '1') {
      attach(video, 'auto');
      // The first clip is known, not discovered. Start it in the same task as
      // the attach; the writer's first mark will agree a moment later, and the
      // poster stays until reveal() has a presented frame.
      play(video);
    }
  }

  var near = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      nearOf.set(e.target, e.isIntersecting);
    });
    reconcileAll();
  }, { rootMargin: '160px' });

  var vis = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      visOf.set(e.target, e.isIntersecting && e.intersectionRatio > 0);
    });
    reconcileAll();
  }, { threshold: 0 });

  nodes().forEach(bind);
  api.sync = reconcileAll;
  document.addEventListener('media:sync', reconcileAll);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) nodes().forEach(pause);
    else reconcileAll();
  });
  window.addEventListener('pagehide', function () {
    suspended = true;
    nodes().forEach(pause);
  });
  window.addEventListener('pageshow', function () {
    suspended = false;
    reconcileAll();
  });
  window.addEventListener('online', function () {
    nodes().forEach(function (video) {
      if (!canPlay(video)) return;
      clearAttempt(video);
      resetPlayback(video);
      if (video.error) {
        unbind(video);
        attach(video, 'auto');
      }
    });
    reconcileAll();
  });
})();
