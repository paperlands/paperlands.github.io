(function () {
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
  if (reduced || poor) return;

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
      addSource(video, video.dataset.srcAv1, 'video/mp4; codecs="av01.0.05M.08"');
    }
    if (video.dataset.srcWebm && video.dataset.srcWebm !== src) {
      addSource(video, video.dataset.srcWebm, 'video/webm');
    }
    addSource(video, src, typeFor(src));
    video.load();
    video.dataset.mediaAttached = '1';
  }

  function captureStill(video) {
    var host = video.closest('.media-clip');
    if (!host) return;
    if (video.readyState < 2 || !video.videoWidth) return;
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    try {
      canvas.getContext('2d').drawImage(video, 0, 0);
    } catch (e) {
      return;
    }
    var img = host.querySelector('.media-clip-poster');
    if (!img) {
      img = document.createElement('img');
      img.className = 'media-clip-poster';
      img.alt = '';
      img.decoding = 'async';
      img.setAttribute('aria-hidden', 'true');
      host.insertBefore(img, video);
    }
    img.src = canvas.toDataURL('image/jpeg', 0.72);
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
    video.setAttribute('data-ready', '');
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
        var p = policy(video);
        if (p === 'drop' || p === 'warm') return;
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

  // A group is carousel-owned. Unmarked members stay on the still.
  function policy(video) {
    var group = video.dataset.mediaGroup || '';
    if (!group) return 'io';
    if (video.hasAttribute('data-media-active')) return 'play';
    if (video.hasAttribute('data-media-decode')) return 'warm';
    return 'drop';
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
    if (p === 'drop') return false;
    if (p === 'play' || p === 'warm') return true;
    return !!nearOf.get(video);
  }

  function reconcileAll() {
    var list = nodes().filter(function (v) {
      return (v.dataset.mediaMode || 'loop') !== 'hover';
    });
    var ranked = list.map(function (v) {
      var p = policy(v);
      return { v: v, p: p, s: score(v, p), want: wantsAttach(p, v) };
    }).sort(function (a, b) { return b.s - a.s; });

    var attached = 0;
    ranked.forEach(function (row) {
      var video = row.v;
      var p = row.p;
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
    video.preload = 'none';
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
