/* ==========================================================================
   nav.js — mobile menu behaviour for every .site-nav on the page
   --------------------------------------------------------------------------
   Extracted from an inline <script> that lived in _includes/nav.html. That
   version queried #mobile-menu, #mobile-menu-overlay and #mobile-menu-close by
   global id, so a second nav anywhere on a page would silently bind to the
   first one's elements. This scopes to [data-nav-root] and wires by data
   attributes, which is the P6 contract: modules take a root and touch nothing
   outside it.

   Every mobile surface shares the logo-lit navigation. Page branches recede
   before the words arrive; focus, scroll and pre-existing inert states are
   returned on closing. The same hamburger opens and closes it.

   No teardown is exported: the nav lives for the lifetime of the document and
   has nothing to release. If a page ever mounts navs dynamically, add
   destroy() rather than guessing at one now.
   ========================================================================== */
(function () {
  'use strict';

  function mount(root) {
    var menu = root.querySelector('[data-nav-menu]');
    var list = root.querySelector('[data-nav-panel]');
    var toggle = root.querySelector('[data-nav-open]');
    if (!menu || !list || !toggle) return;

    var open = false;
    var returnTimer = 0;
    var backgroundState = [];
    var mq = window.matchMedia('(min-width: 1024px)');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Mark content branches, not text selectors: headings, captions, footers and
    // embedded apps all recede. Never fade/inert an ancestor of the real logo,
    // the nav itself, or a native dialog (Join Us must still open immediately).
    function collectBackground(element, result) {
      if (element.matches('[data-nav-root], [data-nav-light-source], dialog, script, style, link, template')) return;
      if (element.querySelector('[data-nav-root], [data-nav-light-source], dialog')) {
        Array.prototype.forEach.call(element.children, function (child) { collectBackground(child, result); });
      } else {
        element.setAttribute('data-nav-background', '');
        result.push(element);
      }
    }

    function restoreBackground() {
      window.clearTimeout(returnTimer);
      returnTimer = 0;
      backgroundState.forEach(function (state) { state.element.inert = state.inert; });
      backgroundState = [];
    }

    function measureLamp() {
      var source = document.querySelector('[data-nav-light-source]') || root.querySelector('[data-nav-mark]');
      if (!source) return;
      var box = source.getBoundingClientRect();
      document.body.style.setProperty('--nav-lamp-x', (box.left + box.width * .075) + 'px');
      document.body.style.setProperty('--nav-lamp-y', (box.top + box.height * .5) + 'px');
    }

    function setState(next) {
      // Hidden desktop controls cannot open a modal by script or a stale tap.
      next = next && !mq.matches;
      if (!next && list.contains(document.activeElement)) toggle.focus({ preventScroll: true });
      if (next && !open) {
        restoreBackground();
        var backgrounds = [];
        Array.prototype.forEach.call(document.body.children, function (child) { collectBackground(child, backgrounds); });
        backgroundState = backgrounds.map(function (element) { return { element: element, inert: element.inert }; });
        backgroundState.forEach(function (state) { state.element.inert = true; });
        measureLamp();
      }
      open = next;
      menu.classList.toggle('is-open', open);
      list.setAttribute('aria-hidden', String(!open));
      list.inert = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.querySelector('.sr-only').textContent = toggle.getAttribute(open ? 'data-nav-close-label' : 'data-nav-label');
      document.body.setAttribute('data-nav-state', open ? 'open' : 'closed');
      if (open) {
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-modal', 'true');
        menu.setAttribute('aria-label', toggle.getAttribute('data-nav-label'));
      } else {
        menu.removeAttribute('role');
        menu.removeAttribute('aria-modal');
        menu.removeAttribute('aria-label');
        // CSS returns the page over 320ms. Don't expose invisible keyboard stops
        // during that return. Desktop/reduced-motion hand back immediately.
        if (mq.matches || reducedMotion.matches) restoreBackground();
        else if (backgroundState.length) returnTimer = window.setTimeout(restoreBackground, 340);
      }
    }

    toggle.addEventListener('click', function () { setState(!open); });
    list.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) setState(false);
    });
    document.addEventListener('click', function (e) {
      if (open && !menu.contains(e.target)) setState(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setState(false);
        toggle.focus({ preventScroll: true });
      } else if (e.key === 'Tab') {
        var links = list.querySelectorAll('a[href]');
        var last = links[links.length - 1] || toggle;
        if (e.shiftKey && (document.activeElement === toggle || !menu.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {
          e.preventDefault();
          toggle.focus();
        }
      }
    });
    window.addEventListener('resize', function () { if (open && !mq.matches) measureLamp(); }, { passive: true });
    window.addEventListener('pageshow', function (event) { if (event.persisted) { setState(false); restoreBackground(); } });

    // Must equal the breakpoint in components/nav.css that shows the plates and
    // hides the menu. It was 640px; the plates need ~900px to fit beside the
    // banner, so both moved to 1024 together.
    var onChange = function (e) { if (e.matches && open) setState(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);


    // ---- the brand retracts, and the links stand down -------------------
    // One fact — the reader has left the top of the page — published where a
    // stylesheet can read it. Two thresholds rather than one, because a
    // trackpad reports fractions of a pixel and a single threshold strobes the
    // banner open and shut under the finger. The gap is the point.
    var COLLAPSE_AT = 96;   // px scrolled before the word retracts
    var EXPAND_AT = 24;     // ...and the slack before it comes back
    var frame = 0;
    var scrollPosition = window.scrollY || 0;

    function syncBrand() {
      frame = 0;
      var y = scrollPosition;
      var collapsed = root.getAttribute('data-nav-collapsed') === 'true';
      if (!collapsed && y > COLLAPSE_AT) {
        setCollapsed(true);
      } else if (collapsed && y < EXPAND_AT) {
        setCollapsed(false);
      }
    }

    // Two attributes, one fact. `data-nav-collapsed` is the bar's own state and
    // nav.css reads it to clip the banner; `data-helios-collapsed` is the DRAWN
    // identity's state, and it carries helios's name only because the look has to
    // read it: design/probe/looks.py refuses a look that pins a value no built
    // page publishes, and this value is written at runtime, so a neutral name
    // could not be bound in components/helios.css at all. Own-namespace state is
    // the same exemption `data-helios-writing` already uses.
    //
    // It is set from here and not from helios.js because the reader leaving the
    // top is ONE fact, and two modules running two sets of thresholds is how one
    // gesture becomes two behaviours.
    function setCollapsed(next) {
      var value = next ? 'true' : 'false';
      root.setAttribute('data-nav-collapsed', value);
      if (document.body) document.body.setAttribute('data-helios-collapsed', value);
    }

    function onScroll() {
      scrollPosition = window.scrollY || 0;
      if (frame) return;
      frame = window.requestAnimationFrame(syncBrand);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // A reload part-way down the page has to arrive already collapsed rather
    // than animating into place.
    syncBrand();
    setState(false);
  }

  function init() {
    var roots = document.querySelectorAll('[data-nav-root]');
    for (var i = 0; i < roots.length; i++) mount(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
