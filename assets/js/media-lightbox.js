// One media viewer lifecycle: the browser owns modality; we own content only.
// No third-party request until activation. No animation clock or timeout.
(() => {
  for (const dialog of document.querySelectorAll('dialog[data-lightbox]')) {
    if (typeof dialog.showModal !== 'function') continue;
    const image = dialog.querySelector('[data-lightbox-image]');
    const caption = dialog.querySelector('[data-lightbox-caption]');
    const screen = dialog.querySelector('[data-lightbox-screen]');
    const slot = dialog.querySelector('[data-lightbox-player]');
    let opener = null;
    let outside = false;

    const stop = () => {
      // Keep the still under the departing player: never an empty black box.
      slot?.replaceChildren();
      screen.removeAttribute('aria-busy');
    };
    const close = () => {
      if (!dialog.open) return;
      stop(); // Audio stops immediately, not after the darkness has lifted.
      dialog.close();
    };
    const open = (invitation, source, description = '') => {
      if (dialog.open) return;
      opener = invitation;
      outside = false;
      image.src = source?.currentSrc || source?.src || dialog.dataset.lightboxPoster;
      image.alt = source?.alt || '';
      caption.textContent = description;
      caption.hidden = !description;
      dialog.showModal();
      if (!slot) return;

      // The cached thumbnail is immediate; decode its full still in the dark.
      // Upgrade beneath the player without ever blanking the visible image.
      const poster = new Image();
      poster.src = dialog.dataset.lightboxPoster;
      poster.decode().then(() => {
        if (dialog.open && opener === invitation) image.src = poster.src;
      }).catch(() => {});

      screen.setAttribute('aria-busy', 'true');
      const player = document.createElement('iframe');
      player.title = dialog.getAttribute('aria-label');
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      player.allowFullscreen = true;
      player.inert = true;
      player.addEventListener('load', () => {
        if (!dialog.open || !player.isConnected) return;
        player.inert = false;
        player.dataset.lightboxReady = '';
        screen.removeAttribute('aria-busy');
      }, { once: true });
      player.src = dialog.dataset.lightboxEmbed;
      slot.replaceChildren(player);
    };

    dialog.querySelector('[data-lightbox-close]').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    if (!slot) image.addEventListener('click', close);
    dialog.addEventListener('pointerdown', event => { outside = event.target === dialog; });
    dialog.addEventListener('pointercancel', () => { outside = false; });
    dialog.addEventListener('click', event => {
      if (outside && event.target === dialog) close();
      outside = false;
    });
    dialog.addEventListener('close', () => {
      // A queued close event must not dismantle a rapid reopening.
      if (dialog.open) return;
      stop();
      opener?.focus({ preventScroll: true });
    });
    addEventListener('pagehide', () => { close(); stop(); });

    for (const invitation of document.querySelectorAll('[data-lightbox-open]')) {
      if (invitation.dataset.lightboxOpen !== dialog.id) continue;
      invitation.setAttribute('aria-haspopup', 'dialog');
      invitation.setAttribute('aria-controls', dialog.id);
      invitation.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        open(invitation, invitation.querySelector('img'));
      });
    }

    if (!dialog.dataset.lightboxGallery) continue;
    const mark = dialog.querySelector('[data-lightbox-expand-mark]');
    for (const window of document.querySelectorAll(dialog.dataset.lightboxGallery)) {
      const source = window.querySelector('img');
      if (!source) continue;
      const description = window.querySelector(dialog.dataset.lightboxCaptionSelector || 'figcaption')?.textContent.trim() || '';
      const invitation = document.createElement('button');
      invitation.type = 'button';
      invitation.className = 'media-lightbox-invitation';
      invitation.setAttribute('aria-label', source.alt ? `Enlarge image: ${source.alt}` : 'Enlarge image');
      invitation.setAttribute('aria-haspopup', 'dialog');
      invitation.setAttribute('aria-controls', dialog.id);
      source.before(invitation);
      invitation.append(source, mark.content.cloneNode(true));
      invitation.addEventListener('click', () => open(invitation, source, description));
    }
  }
})();
