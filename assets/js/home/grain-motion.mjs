// Grain is a surface clock, not a page clock: step the tile only while the
// surface is in the viewport. The hero film grain and the landscape's stages use
// the authored background-position animation; this only pauses it offscreen. The
// next step is to bake grain into the rendition and delete the hero clock.
//
// THE CLOSING INVITATION IS NOT IN THIS LIST, ON PURPOSE. It is the section that
// hands the reader to the close, and the close's own grain (`.helios-colophon`)
// is not gated at all. Gating one side of a shared edge gives the texture two
// clocks: the section pauses while offscreen, the close never does, so at the seam
// the two step on different beats and the join reads as a line of texture that is
// caught mid-stride. One clock, one field: the threshold belongs to the close.
const surfaces = document.querySelectorAll(
  '.helios-hero [data-media-surface="fill"], ' +
  '.helios-landscape .helios-possibility__stage'
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
