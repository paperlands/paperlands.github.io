#!/usr/bin/env node
/*
  image-variants.mjs — responsive stills, emitted by the Jekyll build.

  The recipe is _data/image_sources.yml. This script encodes the rungs into a
  cache directory and prints the manifest Liquid already reads. It does not
  write into the source tree. Video is not its job.

  The filename hash is the source bytes, the width, and the encoder version.
  It is not a hash of the output. Output bytes move when libwebp moves; the
  pinned sharp version is what makes a rebuild name the same files.

    node toolchain/image-variants.mjs check
    node toolchain/image-variants.mjs prepare --root . --cache .jekyll-cache/image-variants

  The Jekyll hook is _plugins/image_variants.rb. See design/media.org.
*/
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync,
  statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const QUALITY = 82;
const EFFORT = 6;
const ALPHA_QUALITY = 100;
const RECIPE = '_data/image_sources.yml';

// The pool is bounded, not "one per rung". These encodes are INDEPENDENT jobs,
// not stages of one job: libvips already threads inside a single encode, and
// forcing it to one thread still leaves the pool a win. Measured on 4 pinned
// cores, 24 rungs: cap 1 = 99.7s, cap 2 = 51.6s, cap 4 = 34.2-37.5s, and cap 4
// with VIPS_CONCURRENCY=1 = 41.3s (design/probe/evidence/image-encode-concurrency.json).
const DEFAULT_CONCURRENCY = 4;

export class ImageVariantError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageVariantError';
  }
}

// A cap that is not a positive integer is a caller mistake, not something to
// round into shape: silently running at 1 — or at 4 — makes a typo look like a
// performance result.
export function requireConcurrency(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new ImageVariantError('concurrency must be a positive integer, got ' + JSON.stringify(value));
  }
  return value;
}

export function rungHash(sourceBytes, width, encoder) {
  return createHash('sha256')
    .update(sourceBytes)
    .update('\0')
    .update(String(width))
    .update('\0')
    .update(encoder)
    .digest('hex')
    .slice(0, 8);
}

export function resolveSitePath(root, sitePath) {
  if (typeof sitePath !== 'string' || !sitePath.startsWith('/assets/')
      || sitePath.includes('\\') || sitePath.includes('\0')
      || sitePath.split('/').includes('..')) {
    return { error: 'unsafe image path: ' + sitePath };
  }
  const rel = sitePath.replace(/^\/+/, '');
  const abs = path.resolve(root, rel);
  const rootAbs = path.resolve(root);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) {
    return { error: 'unsafe image path: ' + sitePath };
  }
  return { rel, abs };
}

export function recipeProblems(recipe, root) {
  const problems = [];
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
    return [RECIPE + ': expected a map of site paths'];
  }
  const keys = Object.keys(recipe);
  if (!keys.length) return [RECIPE + ' is empty'];
  for (const sitePath of keys) {
    const located = resolveSitePath(root, sitePath);
    if (located.error) {
      problems.push(located.error);
      continue;
    }
    const entry = recipe[sitePath];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !Array.isArray(entry.widths) || !entry.widths.length) {
      problems.push(sitePath + ': expected widths: [n, n]');
      continue;
    }
    for (const width of entry.widths) {
      if (!Number.isInteger(width) || width < 1) {
        problems.push(sitePath + ': width must be a positive integer, got ' + width);
      }
    }
    if (!existsSync(located.abs)) problems.push(sitePath + ': missing source ' + located.rel);
  }
  return problems;
}

export function loadRecipe(root) {
  const file = path.join(root, RECIPE);
  if (!existsSync(file)) throw new ImageVariantError(RECIPE + ' is missing');
  let raw;
  try {
    raw = execFileSync('ruby', [
      '-ryaml', '-rjson', '-e',
      'puts JSON.generate(YAML.safe_load_file(ARGV[0]))',
      file,
    ], { encoding: 'utf8' });
  } catch (error) {
    const detail = (error.stderr || error.message || '').toString().trim();
    throw new ImageVariantError('could not read ' + RECIPE + ': ' + detail);
  }
  return JSON.parse(raw);
}

export function recipeReport(root) {
  try {
    return recipeProblems(loadRecipe(root), root);
  } catch (error) {
    return [error.message];
  }
}

function encoderId(sharp) {
  const versions = sharp.versions || {};
  return [
    'sharp ' + versions.sharp,
    'vips ' + versions.vips,
    'webp ' + versions.webp,
    'q' + QUALITY,
    'e' + EFFORT,
    'a' + ALPHA_QUALITY,
  ].join(' / ');
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch (error) {
    throw new ImageVariantError(
      'sharp is not installed. From the repository root, run npm ci (Node 20). ' + error.message,
    );
  }
}

function walkWebp(dir, found) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) walkWebp(file, found);
    else if (name.endsWith('.webp')) found.push(file);
  }
}

async function encodeRung(sharp, source, dest, width, tag) {
  mkdirSync(path.dirname(dest), { recursive: true });
  // Unique per job as well as per process: two recipe keys can resolve to the
  // same output name (see the duplicate-output check in prepare).
  const tmp = dest + '.' + process.pid + '.' + tag + '.tmp';
  try {
    const info = await sharp(source, { failOn: 'error' })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: EFFORT, alphaQuality: ALPHA_QUALITY })
      .toFile(tmp);
    if (info.width !== width) {
      throw new ImageVariantError('encode wrote ' + info.width + 'px, wanted ' + width + ' (' + source + ')');
    }
    renameSync(tmp, dest);
    return info;
  } catch (error) {
    if (existsSync(tmp)) unlinkSync(tmp);
    throw error;
  }
}

// A bounded pool that keeps the caller's index order. Results land in
// results[i], never in completion order, which is what lets the manifest and
// the publish list stay byte-identical to a sequential run.
//
// On the first failure it stops DISPATCHING but waits for every in-flight
// worker before rejecting, and it rethrows the lowest-index error rather than
// whichever lost the race. Two reasons: the message a build prints stays the
// same as the sequential one, and a worker can never still be writing into the
// cache directory while the caller decides what to sweep.
export async function runPool(items, cap, worker) {
  const results = new Array(items.length);
  // A wrapper, not the thrown value: `throw null` must still count as a
  // failure, and the caller must get the thrown value back untouched.
  const failures = new Array(items.length);
  const limit = Math.min(requireConcurrency(cap), items.length);
  let next = 0;

  const runners = Array.from({ length: limit }, async () => {
    for (;;) {
      const index = next;
      if (index >= items.length) return;
      next += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        failures[index] = { error };
        next = items.length;
      }
    }
  });

  await Promise.all(runners);
  const failed = failures.findIndex(Boolean);
  if (failed >= 0) throw failures[failed].error;
  return results;
}

export async function prepare({ root, cache, recipe, concurrency = DEFAULT_CONCURRENCY }) {
  // Before any source is read: a bad cap is not a slow build.
  requireConcurrency(concurrency);
  const data = recipe || loadRecipe(root);
  const problems = recipeProblems(data, root);
  if (problems.length) throw new ImageVariantError(problems.join('\n'));
  const sharp = await loadSharp();
  const encoder = encoderId(sharp);
  if (!encoder.includes('sharp ') || encoder.includes('undefined')) {
    throw new ImageVariantError('sharp did not report an encoder version: ' + encoder);
  }
  mkdirSync(cache, { recursive: true });
  const manifest = {};
  const publish = [];
  let encoded = 0;
  let cached = 0;
  let kept = 0;

  // Phase 0 — validate every source, then lay the work out in recipe order and
  // width order. A job remembers its index, so nothing below depends on which
  // encode finishes first.
  // Two recipe keys can resolve to one output file: same directory, same base
  // name, different extension, identical bytes (sharp reads the signature, not
  // the extension). Sequentially the second one found the first one's cache
  // entry; in parallel they would share a destination and a temp name. The
  // second therefore shares the first's job instead of racing it.
  const byOutput = new Map();
  const sources = [];
  const jobs = [];

  for (const sitePath of Object.keys(data)) {
    const located = resolveSitePath(root, sitePath);
    const sourceBytes = readFileSync(located.abs);
    const meta = await sharp(located.abs, { failOn: 'error' }).metadata();
    if (!meta.width || !meta.height) {
      throw new ImageVariantError(sitePath + ': could not read dimensions');
    }
    if ((meta.pages || 1) > 1) {
      throw new ImageVariantError(sitePath + ': animated images are not resized by the build');
    }
    for (const width of data[sitePath].widths) {
      if (width > meta.width) {
        throw new ImageVariantError(
          sitePath + ': width ' + width + ' is wider than the ' + meta.width + 'px source; the build does not enlarge',
        );
      }
    }
    const widths = [...new Set([...data[sitePath].widths, meta.width])].sort((a, b) => a - b);
    const ext = path.posix.extname(located.rel).toLowerCase();
    const base = path.posix.basename(located.rel, path.posix.extname(located.rel));
    const dir = path.posix.dirname(located.rel);
    const source = { sitePath, meta, slots: [] };

    for (const width of widths) {
      if (width === meta.width && ext === '.webp') {
        source.slots.push({
          kept: { src: sitePath, width: meta.width, height: meta.height, bytes: sourceBytes.length },
        });
        kept += 1;
        continue;
      }
      const hash = rungHash(sourceBytes, width, encoder);
      const publicRel = path.posix.join(dir, base + '-' + width + '-' + hash + '.webp');
      const shadow = path.join(root, ...publicRel.split('/'));
      if (existsSync(shadow)) {
        throw new ImageVariantError('refusing to shadow a source-tree file: ' + publicRel);
      }
      if (byOutput.has(publicRel)) {
        // Counted as a hit, which is what the sequential run reported for it.
        source.slots.push({ job: byOutput.get(publicRel), shared: true });
        cached += 1;
        continue;
      }
      byOutput.set(publicRel, jobs.length);
      source.slots.push({ job: jobs.length });
      jobs.push({
        sourceAbs: located.abs,
        cacheFile: path.join(cache, ...publicRel.split('/')),
        publicRel,
        width,
      });
    }
    sources.push(source);
  }

  // Phase 1 — the pool. Cache verification runs inside it too: a warm run is
  // 24 metadata reads, and those are the whole warm cost.
  const rungs = await runPool(
    jobs,
    concurrency,
    async (job, index) => {
      let info;
      try {
        if (existsSync(job.cacheFile) && statSync(job.cacheFile).size > 0) {
          info = await sharp(job.cacheFile).metadata();
        }
      } catch {
        // A cache entry that cannot even be read is a miss, not a build
        // failure: the cache is disposable and the source is the authority.
        info = null;
      }
      if (info && info.width !== job.width) {
        rmSync(job.cacheFile, { force: true });
        info = null;
      }
      if (info) {
        cached += 1;
      } else {
        info = await encodeRung(sharp, job.sourceAbs, job.cacheFile, job.width, index);
        encoded += 1;
      }
      return {
        src: '/' + job.publicRel,
        width: info.width,
        height: info.height,
        bytes: existsSync(job.cacheFile) ? statSync(job.cacheFile).size : info.size,
      };
    },
  );

  // Phase 2 — assemble from indices, so the manifest bytes and the publish
  // order are identical to a sequential run.
  for (const source of sources) {
    const variants = [];
    for (const slot of source.slots) {
      if (slot.kept) {
        variants.push(slot.kept);
        continue;
      }
      const job = jobs[slot.job];
      variants.push(rungs[slot.job]);
      // A shared rung is copied once: the owner's publish entry already names it.
      if (!slot.shared) publish.push({ from: job.cacheFile, to: job.publicRel });
    }
    manifest[source.sitePath] = { width: source.meta.width, height: source.meta.height, variants };
  }

  const keep = new Set(publish.map(item => item.from));
  const stale = [];
  walkWebp(cache, stale);
  for (const file of stale) {
    if (!keep.has(file)) unlinkSync(file);
  }
  writeFileSync(path.join(cache, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return {
    manifest, publish, encoded, cached, kept, encoder,
    sources: Object.keys(manifest).length,
  };
}

function flag(name) {
  const index = process.argv.indexOf('--' + name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith('--')) {
    throw new ImageVariantError('missing --' + name);
  }
  return value;
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);


if (isMain) {
  const command = process.argv[2];
  const run = async () => {
    if (command === 'check') {
      const root = process.argv.includes('--root') ? flag('root') : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      const problems = recipeReport(root);
      if (problems.length) {
        for (const problem of problems) console.error('image-variants: ' + problem);
        process.exit(1);
      }
      console.log('image-variants: recipe ok');
      return;
    }
    if (command === 'prepare') {
      const concurrency = process.argv.includes('--concurrency')
        ? Number(flag('concurrency'))
        : DEFAULT_CONCURRENCY;
      const result = await prepare({
        root: flag('root'), cache: flag('cache'), concurrency,
      });
      console.error(
        'image-variants: ' + result.sources + ' sources, '
        + result.encoded + ' encoded, ' + result.cached + ' cached, '
        + result.kept + ' kept (' + result.encoder + ')',
      );
      process.stdout.write(JSON.stringify({
        manifest: result.manifest,
        publish: result.publish,
        encoded: result.encoded,
        cached: result.cached,
        kept: result.kept,
        sources: result.sources,
        encoder: result.encoder,
      }));
      return;
    }
    console.error('usage: node toolchain/image-variants.mjs check|prepare [--root DIR] [--cache DIR] [--concurrency N]');
    process.exit(1);
  };
  run().catch(error => {
    console.error('image-variants: ' + error.message);
    process.exit(1);
  });
}
