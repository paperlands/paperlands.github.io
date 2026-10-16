(function () {
  function sync() {
    if (window.paperlandMedia && window.paperlandMedia.sync) window.paperlandMedia.sync();
    else document.dispatchEvent(new Event('media:sync'));
  }

  function cells(root) {
    return Array.prototype.slice.call(root.querySelectorAll('[data-media-cell]'));
  }

  function videoOf(cell) {
    return cell.querySelector('[data-media="video"]');
  }

  function bind(root) {
    var kind = root.dataset.mediaCarousel;
    var list = cells(root);
    if (!list.length) return;
    var track = root.querySelector('[data-media-track]') || root;
    var i = 0;
    var on = false;
    var scrolling = false;

    function copyFrom(cell) {
      root.querySelectorAll('[data-media-copy]').forEach(function (el) {
        var key = el.getAttribute('data-media-copy');
        if (!key) return;
        var val = cell.getAttribute('data-' + key);
        if (val != null) el.textContent = val;
      });
    }

    function mark(j, v) {
      v.removeAttribute('data-media-active');
      v.removeAttribute('data-media-decode');
      if (!on) return;
      var n = list.length;
      if (j === i) {
        v.setAttribute('data-media-active', '');
        v.setAttribute('data-media-decode', '');
      } else if (j === (i + 1) % n) {
        v.setAttribute('data-media-decode', '');
      } else if (kind === 'strip' && j === (i - 1 + n) % n) {
        v.setAttribute('data-media-decode', '');
      }
    }

    function align() {
      if (kind !== 'strip' || scrolling) return;
      var cell = list[i];
      if (!cell || !track.scrollTo) return;
      var left = cell.offsetLeft - (track.clientWidth - cell.offsetWidth) / 2;
      track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }

    function paint(next, reason) {
      var n = list.length;
      if (!n) return;
      i = ((next % n) + n) % n;
      list.forEach(function (cell, j) {
        var v = videoOf(cell);
        if (v) mark(j, v);
      });
      copyFrom(list[i]);
      root.querySelectorAll('[data-media-to]').forEach(function (btn) {
        var hit = String(i) === btn.getAttribute('data-media-to');
        btn.classList.toggle('is-on', hit);
        if (hit) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
      });
      sync();
      /* x is the strip's axis. Write it only when the reader asked (rail).
         enter/ended/init must not steal a drag; native snap rests the pane. */
      if (reason === 'rail') align();
      root.dispatchEvent(new CustomEvent('media:carousel', {
        bubbles: true,
        detail: { index: i, kind: kind, group: root.dataset.mediaGroup || '', reason: reason || 'go' }
      }));
    }

    list.forEach(function (cell, idx) {
      var v = videoOf(cell);
      if (!v) return;
      v.addEventListener('ended', function () {
        if (!on) return;
        if (videoOf(list[i]) !== v) return;
        paint(idx + 1, 'ended');
      });
    });

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-media-to]');
      if (!btn || !root.contains(btn)) return;
      var to = parseInt(btn.getAttribute('data-media-to'), 10);
      if (isNaN(to)) return;
      paint(to, 'rail');
    });

    if (kind === 'strip') {
      var tick = false;
      track.addEventListener('scroll', function () {
        if (tick) return;
        tick = true;
        requestAnimationFrame(function () {
          tick = false;
          if (!on) return;
          var mid = track.getBoundingClientRect().left + track.clientWidth / 2;
          var best = i;
          var dist = Infinity;
          list.forEach(function (cell, j) {
            var r = cell.getBoundingClientRect();
            var d = Math.abs(r.left + r.width / 2 - mid);
            if (d < dist) { dist = d; best = j; }
          });
          if (best !== i) {
            scrolling = true;
            paint(best, 'scroll');
            scrolling = false;
          }
        });
      }, { passive: true });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var next = e.intersectionRatio >= 0.25;
        if (next === on) return;
        on = next;
        paint(i, on ? 'enter' : 'leave');
      });
    }, { threshold: [0, 0.25] });
    io.observe(root);
    paint(0, 'init');
  }

  function boot() {
    document.querySelectorAll('[data-media-carousel]').forEach(bind);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
