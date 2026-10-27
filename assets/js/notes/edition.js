/* The notes edition, behaviour only. Reading is server-rendered.

   Two enhancements, and none is required to read a note:

     - location: the contents rail marks the section being read
       (aria-current="location"), the way a ribbon marks a page;
     - air: the spirits and the side-link traveller move only while their
       .evening-field is on screen, and only while motion is allowed —
       reduced-motion, print, and hidden tabs all keep the air still.

   Media enlargement is owned by media-lightbox.js, shared with Experiences. */
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

})();
