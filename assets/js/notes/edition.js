/* The notes edition, behaviour only. Reading is server-rendered.

   Three enhancements, and none is required to read a note:

     - location: the contents rail marks the section being read
       (aria-current="location"), the way a ribbon marks a page;
     - air: the spirits and the side-link traveller move only while their
       .evening-field is on screen, and only while motion is allowed —
       reduced-motion, print, and hidden tabs all keep the air still;
     - viewer: a window in the rail opens its picture in a native <dialog>
       (see notes/lightbox.html), the browser owning the focus trap and
       Escape, and the window getting focus back when it closes. */
(() => {
  const links = [...document.querySelectorAll('.toc a')];
  const sections = links.map(link => document.getElementById(decodeURIComponent(link.hash.slice(1))));
  const fields = [...document.querySelectorAll('.evening-field')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const print = matchMedia('print');
  const visible = new Set();
  let scheduled = false;

  function updateLocation() {
    scheduled = false;
    let active = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.3) active = index;
    });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function scheduleLocation() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateLocation);
  }

  function updateAir() {
    fields.forEach(field => {
      field.dataset.air = !reduced.matches && !document.hidden && !print.matches && visible.has(field) ? 'moving' : 'still';
    });
  }

  window.addEventListener('scroll', scheduleLocation, { passive: true });
  window.addEventListener('resize', scheduleLocation);
  window.addEventListener('load', scheduleLocation);
  if (document.fonts) document.fonts.ready.then(scheduleLocation);
  updateLocation();

  reduced.addEventListener('change', updateAir);
  print.addEventListener('change', updateAir);
  document.addEventListener('visibilitychange', updateAir);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      updateAir();
    });
    fields.forEach(field => observer.observe(field));
  } else {
    fields.forEach(field => visible.add(field));
  }
  updateAir();

  // ---- the image viewer -------------------------------------------------
  // A window in the rail opens the picture in the top layer. Native <dialog>
  // owns the focus trap, Escape and the modal stack; this only carries the
  // image across and hands focus back to the window when it closes.
  const lightbox = document.getElementById('edition-lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const viewer = lightbox.querySelector('[data-lightbox-image]');
    const viewerCaption = lightbox.querySelector('[data-lightbox-caption]');
    let opener = null;

    const openViewer = (source, caption) => {
      if (lightbox.open) return;
      viewer.src = source.currentSrc || source.src;
      viewer.alt = source.alt || '';
      viewerCaption.textContent = caption;
      viewerCaption.hidden = !caption;
      opener = source;
      lightbox.showModal();
    };

    const closeViewer = () => lightbox.close();

    // Clicking the ground (the dialog's own box) or the enlarged picture
    // closes; a click on a child targets the child, never the dialog.
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) closeViewer();
    });
    lightbox.querySelector('[data-lightbox-close]').addEventListener('click', closeViewer);
    viewer.addEventListener('click', closeViewer);
    lightbox.addEventListener('close', () => {
      if (opener) opener.focus();
      opener = null;
    });

    document.querySelectorAll('.edition-window img').forEach(source => {
      const captionNode = source.parentElement && source.parentElement.querySelector('.edition-window-caption');
      const caption = captionNode ? captionNode.textContent.trim() : '';
      source.setAttribute('role', 'button');
      source.setAttribute('tabindex', '0');
      source.setAttribute('aria-label', source.alt ? `Enlarge image: ${source.alt}` : 'Enlarge image');
      source.addEventListener('click', () => openViewer(source, caption));
      source.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openViewer(source, caption);
        }
      });
    });
  }
})();
