(function () {
  // Hosted film surface. The still is the page; the host is not contacted
  // until the reader asks. A click anywhere on the stage is that ask — the
  // play control is a hint, not the only door. Binds every
  // [data-media-surface="film"] so a page may carry more than one plate.
  document.querySelectorAll('[data-media-surface="film"]').forEach(function (stage) {
    var frame = stage.querySelector('[data-film-frame]');
    if (!frame) return;

    stage.addEventListener('click', function () {
      if (stage.classList.contains('is-playing') || stage.classList.contains('is-transitioning')) return;
      stage.classList.add('is-transitioning');
      window.setTimeout(function () {
        frame.src = frame.dataset.src;
        stage.classList.add('is-playing');
        stage.classList.remove('is-transitioning');
      }, 150);
    });
  });
})();
