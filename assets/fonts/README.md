# assets/fonts

Two kinds of file live here, and both are served from here on purpose.

## paperLang — the brand face

`paperLang.woff2` / `.woff` / `.ttf`, @font-face'd in `core/tokens.css` beside
the `--font-paperlang` token that names it. `fonts/paperLang.ttf` (repository
root) is a byte-identical alias the pinned hatch runtime fetches by that path;
keep the two in step — `design/probe/inward-garden.mjs` checks the alias.

## The text faces — Cinzel, Cormorant Garamond, EB Garamond, IBM Plex Mono, Lora

`core/webfonts.css` declares these, and the generator that produced both the
files and that sheet is `design/probe/webfonts.py`. They used to arrive through
a `<link>` to `fonts.googleapis.com`:

    <link href="https://fonts.googleapis.com/css2?family=Cinzel:…&display=swap" rel="stylesheet">

That single line was the worst thing on the critical path. Lighthouse measured
it at 810ms of blocked first paint on a throttled connection — DNS and TLS to a
third origin, a round trip to be told what the font URLs are, and then a second
origin (`fonts.gstatic.com`) for the files themselves, which cannot be
discovered until the first round trip comes back. Nothing in that chain is
cacheable next to the stylesheet that blocks on it.

So the LATIN subset of each face the site asks for is committed here and served
from the same origin as the CSS. Nothing is lost in the move: the browser was
only ever downloading the latin subset — Google's sheet declares cyrillic,
greek, latin-ext and vietnamese faces for the same families and none of them
were ever fetched. A glyph outside latin now falls through to the stack in
`core/tokens.css` (`Georgia, serif` et al.), which is what happened before for
every glyph outside the subset that *was* served.

**To add or change a weight:** edit the query strings in
`design/probe/webfonts.py`, run it, and commit the new `.woff2` files together
with the regenerated `core/webfonts.css`. Do not hand-edit the sheet — it is
written by the script, header and all.

    python3 design/probe/webfonts.py assets/fonts assets/css/core/webfonts.css

**Licence.** All five families are OFL-1.1 (SIL Open Font License), which
permits redistribution and self-hosting, including in a repository. Upstream:
<https://github.com/googlefonts/cinzel>,
<https://github.com/CatharsisFonts/Cormorant>,
<https://github.com/octaviopardo/EBGaramond12>,
<https://github.com/IBM/plex>, <https://github.com/cyrealtype/Lora-Cyrillic>.
`paperLang` is the site's own drawing.
