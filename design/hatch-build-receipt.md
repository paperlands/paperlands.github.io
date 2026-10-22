# Hatch site pin build receipt

This is a site-local SPIKE build, not a Dojo release and not a claim that the bytes came from an untouched commit. The approved native interaction door was added as an uncommitted Dojo working-tree change.

- Dojo base: `cbcceebab7adf9f1400f74e73b4986cdb060e13f`
- Relevant dirty source files: `assets/js/host.js`, `assets/js/turtling/turtle.js`, `assets/js/turtling/scheduler.js`
- SHA-256 of those exact source files, in that order:
  - `host.js`: `49fcbf32c024043c12262fe2e26f905e5ab554fef409e98aaa1f7682c9433048`
  - `turtle.js`: `c33a107affacd029e6f2991c0db8a5b22eff02b61e37214ce51873124ebcd775`
  - `scheduler.js`: `7528acfd1d153b8440c15719e36c27071eb342d65d678c2b3929b179e83081e2`
- SHA-256 of `git diff --` those three files: `4d5974cb58e6c39b56560997975e09ad2ca901560a692aed66a31d2d6965a9b8`
- Build cwd: `/home/putra/dojo`
- Build command: `scripts/vendor/node_modules/esbuild/bin/esbuild assets/js/host.js --bundle --format=esm --outfile=/tmp/fourth-turn-host.js --metafile=/tmp/fourth-turn-host.meta.json`
- Vendoring command (site cwd): `node design/vendor.mjs --from-spike /tmp/fourth-turn-host.js --metafile /tmp/fourth-turn-host.meta.json --licence /home/putra/dojo/LICENSE --dojo-commit cbcceebab7adf9f1400f74e73b4986cdb060e13f --install`
- Built artifact SHA-256: `342adf7f9265f554049e9e4a732dfbe820ea1c4311967033`
- Closure: 90 inputs, classified by `design/vendor.mjs`; `release: false`, `host_api: null`, `language_revision: null`.

The existing pin schema records the source base commit but cannot encode the dirty source patch digest. This receipt is the explicit provenance supplement. No Dojo source was changed in this site pass, and nothing was committed.
