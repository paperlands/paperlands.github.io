// Grain is a surface clock, not a page clock: step the tile only while the
// surface is in the viewport. The hero film grain and the three landscape
// surfaces use the authored background-position animation; this only pauses it
// offscreen. The next step is to bake grain into the rendition and delete the
// hero clock.
const surfaces = document.querySelectorAll(
  '.helios-hero [data-media-surface="fill"], ' +
  '.helios-landscape .helios-possibility__stage, ' +
  '.helios-landscape .helios-possibilities'
);

if (surfaces.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      // A section whose edge only touches the viewport has zero intersection
      // area; keep it asleep until a real sliver is visible.
      const visible = entry.isIntersecting && entry.intersectionRatio > 0;
      entry.target.toggleAttribute('data-grain-idle', !visible);
    }
  });

  for (const surface of surfaces) observer.observe(surface);
}
