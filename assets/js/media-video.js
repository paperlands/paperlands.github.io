(function () {
  // Decoders, not clips: every attached clip holds one, and the hero's stack is
  // already four. Whatever the reader can see plus what the writer bet on fits
  // inside this; the clip over the line stays on its still until its turn.
  var MAX_ATTACH = 3;
  var api = { sync: function () {} };
  window.paperlandMedia = api;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = false;
  try {
    saveData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
  } catch (e) {}
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var poor = !!(saveData || (conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')));
  if (reduced || poor) {
    // The priority clip carries its sources in the markup so its bytes start at
    // parse rather than after this script. A reader who has asked for reduced
    // motion matches no <source> (the `media` attribute sees to that) — but a
    // reader on a poor connection cannot be seen from CSS, so the sources the
    // markup started are taken back here. A still is the whole picture either
    // way; there is no reason to spend their data on a clip that will not play.
    Array.prototype.slice.call(document.querySelectorAll('[data-media-priority]')).forEach(function (video) {
      Array.prototype.slice.call(video.querySelectorAll('source')).forEach(function (s) { s.remove(); });
      video.removeAttribute('data-media-attached');
      video.preload = 'none';
      try { video.load(); } catch (e) {}
    });
    return;
  }

  var nearOf = new WeakMap();
  var visOf = new WeakMap();
  var genOf = new WeakMap();

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
    if (video.dataset.srcAv1) {
      addSource(video, video.dataset.srcAv1, 'video/mp4; codecs="av01.0.04M.08"');
    }
    if (video.dataset.srcWebm && video.dataset.srcWebm !== src) {
      addSource(video, video.dataset.srcWebm, 'video/webm');
    }
    addSource(video, src, typeFor(src));
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
    try {
      canvas.getContext('2d').drawImage(video, 0, 0, box.width, box.height);
    } catch (e) {
      return;
    }
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
    if (video.dataset.mediaAttached !== '1' && !video.getAttribute('src') && !video.querySelector('source')) {
      video.removeAttribute('data-ready');
      return;
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
    video.dataset.mediaPlayWait = '0';
  }

  function reveal(video) {
    var first = !video.hasAttribute('data-ready');
    video.setAttribute('data-ready', '');
    // ...and that is the moment warming may begin. See reconcileAll.
    if (first) reconcileAll();
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

  function play(video) {
    var gen = genOf.get(video) || 0;
    var go = function () {
      if ((genOf.get(video) || 0) !== gen) return;
      if (video.dataset.mediaAttached !== '1') return;
      if ((video.dataset.mediaMode || 'loop') !== 'hover') {
        if (document.hidden) return;
        var p = policy(video, markedGroups());
        if (p === 'drop' || p === 'warm' || p === 'hold') return;
        if (p === 'io' && visOf.has(video) && !visOf.get(video)) return;
      }
      if (!video.paused && !video.ended) {
        reveal(video);
        return;
      }
      pinScroll(function () {
        var playing = video.play();
        if (playing && playing.then) {
          playing.then(function () {
            if ((genOf.get(video) || 0) !== gen) return;
            reveal(video);
          }).catch(function () {});
        } else {
          reveal(video);
        }
      });
    };
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) go();
    else if (video.dataset.mediaPlayWait !== '1') {
      video.dataset.mediaPlayWait = '1';
      video.addEventListener('canplay', function () {
        video.dataset.mediaPlayWait = '0';
        go();
      }, { once: true });
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
    if (video.hasAttribute('data-media-decode')) return 'warm';
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
        if (video.dataset.mediaAttached === '1') attached += 1;
        return;
      }
      if (!row.want || attached >= MAX_ATTACH) {
        unbind(video);
        return;
      }
      attached += 1;
      if (p === 'warm' || document.hidden || (p === 'io' && !visOf.get(video))) {
        attach(video, p === 'play' || visOf.get(video) ? 'auto' : 'metadata');
        video.pause();
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
    if (video.dataset.mediaPriority === '1') attach(video, 'auto');
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
  document.addEventListener('visibilitychange', reconcileAll);
})();
