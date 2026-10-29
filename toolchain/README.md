# Toolchain

Producers the build shells out to, and the gates CI runs. Not the design bench.

`design/` is notes and opt-in probes. The raw bench (`design/assets`, `iterations`, `cutouts`, `prior`, `rapiditer`, `stage`) is gitignored. Jekyll excludes this directory; it is not site content.

## Producers

- `image-variants.mjs` — still encoder (`_plugins/image_variants.rb`)
- `mint-media.mjs` — clip mint and `verify`
- `compile-ink.mjs` — Helios ink compiler
- `vendor.mjs`, `host-release.mjs`, `paperlang-pull.sh` — PaperLang release intake, immutable catalogue, and promotion check
- `perf-serve.mjs` — the server Lighthouse starts
- `media-serve.py`, `serve.py` — local static server with byte ranges

`compile-ink.mjs` is hashed into `_data/helios_ink.json`; regenerate the manifest and stills rather than editing either by hand. It executes through `/paperlang/<line>.js` but records the catalogue's immutable generation path as provenance.


## Release operations

A new generation changes the runtime hash, so the checked-in baked ink is stale
until it is recompiled. Install without the site gate first, compile through the
public alias, then run the normal strict gates:

```sh
# 1. install the producer generation (no site check yet)
./toolchain/paperlang-pull.sh --dojo ../dojo --no-check

# 2. compile baked ink through /paperlang/<line>.js. The bypass is development-only:
#    _plugins/compiled_ink.rb refuses PL_COMPILE_INK in production.
PL_COMPILE_INK=1 bundle exec jekyll serve --port 4001
BASE=http://127.0.0.1:4001 node toolchain/compile-ink.mjs

# 3. stop the server; normal strict build and evidence gates
JEKYLL_ENV=production bundle exec jekyll build
node toolchain/vendor.mjs --check
python3 design/probe/paperlang.py --site _site
bundle exec ruby toolchain/test/compiled_ink_test.rb

# 4. promotion is the release act; it requires a clean producer revision
node toolchain/vendor.mjs --promotion
```

`--no-check` only skips the post-install site check; it still verifies and
installs the producer evidence. The ordinary `paperlang-pull.sh` build failure
points here rather than implying the site is broken.
## Gates

`test/` is the suite `.github/workflows/jekyll.yml` names, one contract per step. Commands are in `design/probe/README.md`. Opt-in browser tools stay in `design/probe/`; they may call into this directory, and the build does not call back.
