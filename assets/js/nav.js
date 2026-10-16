/* ==========================================================================
   nav.js — mobile menu behaviour for every .site-nav on the page
   --------------------------------------------------------------------------
   Extracted from an inline <script> that lived in _includes/nav.html. That
   version queried #mobile-menu, #mobile-menu-overlay and #mobile-menu-close by
   global id, so a second nav anywhere on a page would silently bind to the
   first one's elements. This scopes to [data-nav-root] and wires by data
   attributes, which is the P6 contract: modules take a root and touch nothing
   outside it.

   The menu is one box: the burger IS the sheet. CSS opens it. A click outside
   or Escape closes it. No overlay, no second close control.

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

    function setState(next) {
      open = next;
      menu.classList.toggle('is-open', open);
      list.setAttribute('aria-hidden', String(!open));
      if (open) list.removeAttribute('inert');
      else list.setAttribute('inert', '');
      toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', function () { setState(!open); });

    document.addEventListener('click', function (e) {
      if (open && !menu.contains(e.target)) setState(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) {
        setState(false);
        toggle.focus();
      }
    });

    // Must equal the breakpoint in components/nav.css that shows the plates and
    // hides the menu. It was 640px; the plates need ~900px to fit beside the
    // banner, so both moved to 1024 together.
    var mq = window.matchMedia('(min-width: 1024px)');
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

    function syncBrand() {
      frame = 0;
      var y = window.scrollY || window.pageYOffset || 0;
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
