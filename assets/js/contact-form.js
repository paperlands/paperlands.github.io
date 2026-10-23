/* ==========================================================================
   contact-form.js — the letter form's own behaviour
   --------------------------------------------------------------------------
   `_includes/contact_form.html` is one form in two skins: the Library's paper
   card (the lesson page) and the letter's night panel, which is the same form
   wearing `contact__*`. Its markup is declarative; the two jobs that belong to
   the form rather than to whoever places it live here.

     1. THE RETURN ADDRESS. The proxy sends the reader back to the hidden
        `return_url`. The markup can only carry the page's DEPLOYED address
        (`page.url | absolute_url`) — the one answer a build without a browser
        can give, and the no-JavaScript answer — so this replaces it at submit
        with `origin + pathname`: where the form actually is. One build then
        returns a reader to localhost in development, to a preview host on a
        preview and to the live site in production, with nothing to keep in
        step. The query and the fragment are dropped deliberately: the proxy
        appends `?sent=`, and an appended query after a `#` would land inside
        the fragment.

     2. THE RECEIPT. `?sent=true|false` is the proxy handing the reader back.
        The paper skin answers with a toast; the night skin has no toast
        elements at all — the letter answers in the dialog's own status line
        (assets/js/contact.js), because a receipt inside a closed <dialog> is
        not a receipt.

     3. THE READER'S WORDS COME BACK FROM A FAILURE. The proxy returns the reader
        to the page they wrote from — a fresh document, so every field is empty
        again and a captcha that failed once would cost them the whole letter.
        The form therefore keeps what was typed at the moment of submitting (the
        last moment it is still on the page) and puts it back when `sent=false`
        brings the reader home. A receipt spends the copy, so nothing of theirs
        lingers in the tab.

        sessionStorage, and never a server: the words are the reader's, they are
        already going to the proxy, and the one place they need to survive is
        their own tab. Storage can be denied — a private window, a locked-down
        browser — and then this does nothing at all: a form that asks the reader
        to retype is a form that works, which is the floor. Keyed by form id,
        because /lesson-plans holds two of these.
   A page may hold two of these forms: /lesson-plans carries the paper one and
   the letter. Each form is marked `data-contact-form` in the markup, and each is
   set up once (`data-contact-ready`), so the second include — the same file,
   cached, run again — cannot attach twice.
   ========================================================================== */
(function () {
  'use strict';

  var forms = document.querySelectorAll('form[data-contact-form]');
  if (!forms.length) return;

  var sent = new URLSearchParams(window.location.search).get('sent');

  // Composed at submit, not read from the markup: see the note above.
  function composeReturnAddress(form) {
    var field = form.querySelector('input[name="return_url"]');
    if (!field) return;
    form.addEventListener('submit', function () {
      field.value = window.location.origin + window.location.pathname;
    });
  }

  // The paper skin's receipt. The markup emits the toasts AFTER the </form>, as
  // siblings — a <button> with no type inside a form would submit it — so this
  // is looked up for the page rather than from the form, and there is one
  // receipt per page because only the paper skin emits toast elements at all.
  // `hidden` is a Tailwind class on the same element, so presence is inline
  // style, exactly as that surface has always shown it.
  function showReceipt() {
    if (sent !== 'true' && sent !== 'false') return;
    var toast = document.querySelector('[data-toast="' + (sent === 'true' ? 'sent' : 'failed') + '"]');
    if (toast) toast.style.display = 'block';
  }

  // ---- the reader's words, kept across the trip ---------------------------
  // One key per form per page, so the paper card and the letter on
  // /lesson-plans never overwrite each other's copy.
  function keepKey(form) {
    return 'contact:' + window.location.pathname + ':' + (form.id || 'form');
  }

  var KEPT = ['name', 'email', 'message'];

  // EVERY call is wrapped, and that is the design rather than a precaution:
  // storage can be denied outright, and a reader whose browser says no still has
  // a form that works. It just asks them to type it again.
  function keepForRecovery(form) {
    form.addEventListener('submit', function () {
      var kept = {};
      for (var i = 0; i < KEPT.length; i++) {
        if (form.elements[KEPT[i]]) kept[KEPT[i]] = form.elements[KEPT[i]].value;
      }
      try { window.sessionStorage.setItem(keepKey(form), JSON.stringify(kept)); } catch (e) {}
    });

    // A receipt spends the copy: the letter arrived, so nothing of the reader's
    // stays behind in the tab.
    if (sent === 'true') {
      try { window.sessionStorage.removeItem(keepKey(form)); } catch (e) {}
      return;
    }
    if (sent !== 'false') return;

    // The failure: hand it back, field by field, and never blank a field the
    // reader had left empty.
    var kept = null;
    try { kept = JSON.parse(window.sessionStorage.getItem(keepKey(form))); } catch (e) { kept = null; }
    if (!kept) return;
    for (var j = 0; j < KEPT.length; j++) {
      if (form.elements[KEPT[j]] && kept[KEPT[j]]) form.elements[KEPT[j]].value = kept[KEPT[j]];
    }
  }
  for (var i = 0; i < forms.length; i++) {
    var form = forms[i];
    if (form.getAttribute('data-contact-ready') === 'true') continue;
    form.setAttribute('data-contact-ready', 'true');
    composeReturnAddress(form);
    keepForRecovery(form);
  }

  showReceipt();

  document.addEventListener('click', function (event) {
    var closer = event.target.closest ? event.target.closest('[data-toast-close]') : null;
    if (!closer) return;
    var toast = closer.closest('[data-toast]');
    if (toast) toast.style.display = 'none';
  });
})();
