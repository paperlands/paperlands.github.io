/* A reel per identity; on small screens the identities also move in sequence.
   The shared player still owns attaching and playing each marked clip.

   On small screens the row is a loop in both directions: it opens on the
   middle card and wraps either way through still-only clones of its two edge
   cards. */
(function () {
  function sync() {
    if (window.paperlandMedia && window.paperlandMedia.sync) window.paperlandMedia.sync();
    else document.dispatchEvent(new Event('media:sync'));
  }

  function boot() {
    var section = document.querySelector('.helios-who');
    if (!section) return;
    var track = section.querySelector('.helios-who__cards');
    var mobile = window.matchMedia('(max-width: 899px)');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var cards = Array.prototype.slice.call(section.querySelectorAll('[data-who-card]'));
    // The loop is two still-only clones, one of each edge card, placed past
    // either end. Arriving at a clone and jumping to its identical original is
    // imperceptible; a clone never gets a decoder or a second accessible
    // identity.
    function edgeClone(card, side) {
      var clone = card.cloneNode(true);
      clone.removeAttribute('data-who-card');
      clone.classList.add('helios-who__card--echo');
      clone.setAttribute('data-who-echo', side);
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      clone.querySelectorAll('.helios-who__shot').forEach(function (shot, i) {
        if (i) shot.remove();
        else {
          var video = shot.querySelector('video');
          if (video) video.remove();
        }
      });
      return clone;
    }
    var lead = edgeClone(cards[cards.length - 1], 'lead');
    var trail = edgeClone(cards[0], 'trail');
    track.insertBefore(lead, track.firstChild);
    track.appendChild(trail);
    var reels = [];
    var visible = false;
    var selected = -1;
    var tick = false;

    // Centre a card in the strip. Instant, unless the reader asked for the
    // move: a clip running out may not steal a drag.
    function center(card, smooth) {
      if (!card || !track.scrollTo) return;
      var left = track.scrollLeft + card.getBoundingClientRect().left - track.getBoundingClientRect().left
        - (track.clientWidth - card.offsetWidth) / 2;
      track.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
    }

    function isCentered(el) {
      var box = el.getBoundingClientRect();
      var mid = track.getBoundingClientRect().left + track.clientWidth / 2;
      return Math.abs(box.left + box.width / 2 - mid) <= 2;
    }

    // A clone at rest shows the same still as its original, further along the
    // strip. Jump there, silently, and the loop has no seam in either
    // direction.
    function normalize() {
      if (!mobile.matches) return;
      if (isCentered(lead)) center(cards[cards.length - 1], false);
      else if (isCentered(trail)) center(cards[0], false);
    }

    function activeCard() {
      var mid = track.getBoundingClientRect().left + track.clientWidth / 2;
      var best = 0;
      var distance = Infinity;
      cards.forEach(function (card, i) {
        var rect = card.getBoundingClientRect();
        var delta = Math.abs(rect.left + rect.width / 2 - mid);
        if (delta < distance) { distance = delta; best = i; }
      });
      return best;
    }

    function update() {
      if (mobile.matches) {
        var next = activeCard();
        if (next !== selected) {
          selected = next;
          reels[next].reset();
        }
        reels.forEach(function (reel, i) { reel.setActive(visible && i === selected); });
      } else {
        selected = -1;
        reels.forEach(function (reel) { reel.setActive(visible); });
      }
    }

    function advance(index) {
      if (!mobile.matches || !visible || document.hidden || reduced.matches) return false;
      center(index === cards.length - 1 ? trail : cards[index + 1], true);
      return true;
    }

    cards.forEach(function (card, cardIndex) {
      var shots = Array.prototype.slice.call(card.querySelectorAll('.helios-who__shot'));
      var videos = shots.map(function (shot) { return shot.querySelector('[data-media="video"]'); });
      var posters = videos.map(function (video) { return video.getAttribute('poster'); });
      var current = 0;
      var active = false;
      var previousTimer;

      function restore(index) {
        var poster = posters[index];
        if (!poster) return;
        videos[index].poster = poster;
        var still = shots[index].querySelector('[data-media-slot="frame"] img');
        if (still && still.getAttribute('src') !== poster) still.src = poster;
      }

      function paint() {
        shots.forEach(function (shot, index) {
          var shown = index === current;
          shot.toggleAttribute('data-who-current', shown);
          if (shown) shot.removeAttribute('aria-hidden');
          else shot.setAttribute('aria-hidden', 'true');
          videos[index].toggleAttribute('data-media-active', active && shown);
        });
        sync();
      }

      // A clip handing over to the next one dissolves; a reel restarting is a
      // cut. The clone that carried the reader here shows exactly the still
      // the card lands on, and a dissolve would be the one thing to see.
      function select(index, cut) {
        restore(index);
        if (index === current) return;
        clearTimeout(previousTimer);
        shots.forEach(function (shot) { shot.classList.remove('helios-who__shot--previous'); });
        if (!cut) shots[current].classList.add('helios-who__shot--previous');
        if (cut) shots[index].style.transition = 'none';
        current = index;
        paint();
        if (cut) {
          void shots[index].offsetWidth;
          shots[index].style.transition = '';
          return;
        }
        previousTimer = setTimeout(function () {
          shots.forEach(function (shot) { shot.classList.remove('helios-who__shot--previous'); });
        }, 450);
      }

      reels.push({
        reset: function () { select(0, true); },
        setActive: function (next) {
          if (active === next) return;
          active = next;
          paint();
        }
      });

      videos.forEach(function (video, index) {
        video.addEventListener('ended', function () {
          if (!active || index !== current) return;
          if (index + 1 < shots.length) {
            select(index + 1);
          } else if (!advance(cardIndex)) {
            if (shots.length > 1) select(0);
            else { restore(index); video.currentTime = 0; sync(); }
          }
        });
      });
    });

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.25;
      update();
    }, { threshold: [0, 0.25] }).observe(section);

    track.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () {
        tick = false;
        if (mobile.matches) { normalize(); update(); }
      });
    }, { passive: true });
    // The strip opens on the middle card: a real neighbour on each side, and
    // the loop reachable in either direction from the first frame.
    function open() {
      if (mobile.matches) center(cards[Math.floor(cards.length / 2)], false);
    }

    mobile.addEventListener('change', function () { open(); update(); });
    document.addEventListener('visibilitychange', update);
    open();
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
