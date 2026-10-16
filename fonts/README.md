# Runtime label font

The installed hatch requests `/fonts/paperLang.ttf` for its native `label` command. This route supplies the same font as `assets/fonts/paperLang.ttf`, without changing or forking the pinned runtime.

Keep the two files byte-identical when updating the font. The inward-garden browser probe checks this alias; the runtime's own labels provide the live `round` input/output values.
