# Toolchain

Producers the build shells out to, and the gates CI runs. Not the design bench.

`design/` is notes and opt-in probes. The raw bench (`design/assets`, `iterations`, `cutouts`, `prior`, `rapiditer`, `stage`) is gitignored. Jekyll excludes this directory; it is not site content.

## Producers

- `image-variants.mjs` — still encoder (`_plugins/image_variants.rb`)
- `mint-media.mjs` — clip mint and `verify`
- `compile-ink.mjs` — Helios ink compiler
- `vendor.mjs`, `host-release.mjs`, `hatch-pull.sh` — release intake
- `perf-serve.mjs` — the server Lighthouse starts
- `media-serve.py`, `serve.py` — local static server with byte ranges

`compile-ink.mjs` is hashed into `_data/helios_ink.json`. Do not edit it, including its usage comment, unless the stills are regenerated. The plugin names the path; the file's own header still says the old one.

## Gates

`test/` is the suite `.github/workflows/jekyll.yml` names, one contract per step. Commands are in `design/probe/README.md`. Opt-in browser tools stay in `design/probe/`; they may call into this directory, and the build does not call back.
