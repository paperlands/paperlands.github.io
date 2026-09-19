/* ==========================================================================
   nav.js — mobile menu behaviour for every .site-nav on the page
   --------------------------------------------------------------------------
   Extracted from an inline <script> that lived in _includes/nav.html. That
   version queried #mobile-menu, #mobile-menu-overlay and #mobile-menu-close by
   global id, so a second nav anywhere on a page would silently bind to the
   first one's elements. This scopes to [data-nav-root] and wires by data
   attributes, which is the P6 contract: modules take a root and touch nothing
   outside it.

   The panel is hidden by CSS (transform), not by toggling Tailwind utility
   classes, so there is no class-name coupling between JS and CSS.

   No teardown is exported: the nav lives for the lifetime of the document and
   has nothing to release. If a page ever mounts navs dynamically, add
   destroy() rather than guessing at one now.
   ========================================================================== */
(function () {
  'use strict';

  function mount(root) {
    var panel = root.querySelector('[data-nav-panel]');
    var overlay = root.querySelector('[data-nav-overlay]');
    var openBtn = root.querySelector('[data-nav-open]');
    var closeBtn = root.querySelector('[data-nav-close]');
    if (!panel || !overlay || !openBtn || !closeBtn) return;

    var open = false;

    function setState(next) {
      open = next;
      panel.classList.toggle('is-open', open);
      overlay.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      openBtn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    }

    openBtn.addEventListener('click', function () { setState(!open); });
    closeBtn.addEventListener('click', function () { setState(false); });
    overlay.addEventListener('click', function () { setState(false); });

    // Escape closes, and returns focus where the user left it.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) {
        setState(false);
        openBtn.focus();
      }
    });

    // A resize past the sm breakpoint must not leave the body locked.
    var mq = window.matchMedia('(min-width: 640px)');
    var onChange = function (e) { if (e.matches && open) setState(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);

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
