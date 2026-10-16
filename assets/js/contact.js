/* ==========================================================================
   contact.js — the contact modal's opener
   --------------------------------------------------------------------------
   THE LETTER IS FOUR FILES: the markup (_includes/contact_modal.html), the skin
   (components/contact.css, in the shared app.css entry), this script, and
   _data/contact.yml — the words and the addresses. Placement is the layouts'
   job: the three that carry the nav each include the markup once.

   The modal is RELATIONAL: clicking a link to the letter's route opens it where
   the reader already is, and nothing navigates. The route is only for the
   reader who has no relation to a page to begin with — an external link, a
   bookmark, a share, no JavaScript — and that route redirects to the letter's
   arrival, which the branch at the foot of this file opens the dialog from.

   THIS SCRIPT HOLDS NO ADDRESS. The route and the arrival are declared in
   _data/contact.yml and written onto the dialog as data-contact-route and
   data-contact-arrival; everything below reads them back. A moved route, or a
   second surface for the letter, is a data edit — not a search through here.

   Four jobs, and only four:

     1. A link that resolves to the letter's `route` — or to its `arrival`
        fragment — opens the dialog instead of navigating. The href is left
        alone, so a modifier-click, a middle-click, or no JavaScript at all
        still resolves it, and the arrival branch at the foot of this file opens
        the dialog from there.

     2. Turnstile is loaded the FIRST time the dialog opens. The form ships
        without the script (see _includes/contact_modal.html), so a reader who
        never opens the dialog never pays for the challenge. `render=explicit`
        plus an onload hook means the widget lands in our container rather than
        wherever the script finds a `.cf-turnstile`.

     3. The return from the proxy. The form's `return_url` is the page the
        reader was on, and the proxy appends `?sent=true|false`; this reads it,
        opens the dialog and writes the receipt the markup carries into the live
        region. The receipt's WORDS are _data/contact.yml's, like every other word
        in the letter, and the markup renders them into <template>s; the copy is
        the script's only job here, and it has to be a write to be announced.

     4. The lock. `contact-open` on <body> stops the page scrolling behind the
        top layer; components/contact.css reads it.

   Nothing here knows what the form does: it hands state to the dialog and the
   browser owns the focus trap, Escape and the modal stack.
   ========================================================================== */
(function () {
  'use strict';

  // Found by its class, not an id: `contact` is the component's published name —
  // the same one components/contact.css binds and the probe asserts — so the JS
  // shares the markup's vocabulary and no id has to be kept in step with it.
  var dialog = document.querySelector('dialog.contact');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  var status = dialog.querySelector('.contact__status');
  var slot = dialog.querySelector('[data-turnstile]');
  var lastFocus = null;
  var turnstileRequested = false;

  // ---- Turnstile, only when it is needed -------------------------------
  function renderTurnstile() {
    if (!slot || slot.getAttribute('data-rendered') === 'true') return;
    if (!window.turnstile || typeof window.turnstile.render !== 'function') return;
    try {
      window.turnstile.render(slot, {
        sitekey: slot.getAttribute('data-sitekey'),
        theme: slot.getAttribute('data-theme') || 'dark'
      });
      slot.setAttribute('data-rendered', 'true');
    } catch (error) {
      // A challenge that cannot load — a blocked script, or a key that is not
      // valid on this host — must not take the rest of the form down with it.
      // Turnstile draws its own retry; the fields above keep working.
    }
  }

  function loadTurnstile() {
    if (window.turnstile) {
      renderTurnstile();
      return;
    }
    if (turnstileRequested) return;
    turnstileRequested = true;
    // The script calls this once it is up. The name is fixed so a second
    // dialog on the page would find the loader already spent, not load twice.
    window.__paperlandTurnstileReady = renderTurnstile;
    var script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__paperlandTurnstileReady&render=explicit';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }
  // ---- the status line, owned here rather than by the form -------------
  // THE WORDS ARE NOT HERE. The receipt is the letter's, so it is written with
  // the letter's other words in _data/contact.yml and marked up like them —
  // which is how @paperland is a link. The include renders the two receipts into
  // <template data-contact-receipt>s and this only COPIES one into the live
  // region. The copy has to be a write: a receipt that CSS merely revealed is
  // never announced, and that announcement is the whole receipt for a reader who
  // THE WORDS ARE NOT HERE. The receipt is the letter's, so it is written with
  // the letter's other words in _data/contact.yml and marked up like them —
  // which is how @paperland is a link. The include renders the two receipts into
  // <template data-contact-receipt>s, and this copies the one that arrived into
  // the live region. The copy has to be a write: a receipt that CSS merely
  // revealed is never announced, and that announcement is the whole receipt for a
  // reader who cannot see the letter. Read at the moment of use — a reader who
  // never receives one never touches the templates, and this file does no work
  // when the page loads.
  // THE STATE IS ONE CLASS ON THE DIALOG, and the skin does the rest: a letter
  // that arrived turns its letterhead around, gives its invitation to the
  // thank-you, drops the form (it is done with) and draws the desk (from
  // PaperLand, in the brand's orange). A letter that failed keeps all of it and
  // is told so at the foot. Nothing here decides what a receipt LOOKS like —
  // this only says which state the letter is in, which is a fact it is the only
  // one holding.
  function setStatus(state) {
    if (!status) return;
    dialog.classList.toggle('contact--received', state === 'sent');
    dialog.classList.toggle('contact--failed', state === 'bad');
    if (state === 'sent' || state === 'bad') {
      var sheet = dialog.querySelector('template[data-contact-receipt="' + state + '"]');
      status.innerHTML = sheet ? sheet.innerHTML : '';
      status.classList.toggle('contact__status--bad', state === 'bad');
      status.hidden = false;
    } else {
      status.hidden = true;
      status.innerHTML = '';
      status.classList.remove('contact__status--bad');
    }
  }

  // ---- open / close ----------------------------------------------------
  function open() {
    if (dialog.open) return;
    lastFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('contact-open');
    loadTurnstile();
    // `contact-` is the form's id_prefix (_includes/contact_form.html): the paper
    // form keeps the bare ids, so a page holding both has no duplicate ids.
    var field = dialog.querySelector('#contact-name-input') || dialog.querySelector('input:not([type="hidden"])');
    if (field) field.focus();
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
  }

  dialog.addEventListener('close', function () {
    document.body.classList.remove('contact-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  });

  // Escape is native. A click on the dialog's own padding is not.
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) close();
  });

  var closers = dialog.querySelectorAll('[data-contact-close]');
  for (var i = 0; i < closers.length; i++) {
    closers[i].addEventListener('click', close);
  }

  // ---- the letter's addresses, declared in the markup -------------------
  // _data/contact.yml is the one place they are written; the include hands them
  // to the dialog as data-contact-route / data-contact-arrival and they are read
  // back here. There is no fallback address in this file on purpose: markup that
  // declares none intercepts nothing, the route's own page still resolves, and a
  // cold arrival simply lands on the site — a degrade, not a wrong address.
  var route = (dialog.getAttribute('data-contact-route') || '').replace(/\/+$/, '');
  var arrival = dialog.getAttribute('data-contact-arrival') || '';
  // Everything from the '#': '' when the arrival is a bare path or absent.
  var arrivalHash = arrival.slice(arrival.indexOf('#'));

  // ---- a link to the letter opens instead of navigating ----------------
  // Both addresses open it in place, on whatever page the reader is on, so a
  // reader already somewhere on the site never leaves the page they were
  // reading. Only a link the site itself owns counts: an off-site href that
  // happens to end in the route is someone else's page, and navigates like one.
  function isContactLink(link) {
    var raw = link.getAttribute('href');
    if (!raw) return false;
    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (error) {
      return false;
    }
    if (url.origin !== window.location.origin) return false;
    var path = url.pathname.replace(/\/+$/, '');
    if (route && path === route) return true;
    // The arrival fragment names the letter, not a page, so it opens wherever
    // the reader is.
    return !!arrivalHash && url.hash === arrivalHash;
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest ? event.target.closest('a[href]') : null;
    if (!link || !isContactLink(link)) return;
    event.preventDefault();
    setStatus(null);
    open();
  });

  // ---- how the dialog was asked for on arrival -------------------------
  // `?sent=` is the proxy handing the reader back to the page they wrote from;
  // the arrival hash is the route's redirect (a cold arrival, with no page to
  // open the letter on). Both are spent once read: the trigger is dropped from
  // the address bar so a reload or a share does not reopen the dialog.
  var params = new URLSearchParams(window.location.search);
  var sent = params.get('sent');
  if (sent === 'true' || sent === 'false' ||
      (!!arrivalHash && window.location.hash === arrivalHash)) {
    setStatus(sent === 'true' ? 'sent' : sent === 'false' ? 'bad' : null);
    open();
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }
})();
