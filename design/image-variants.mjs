#!/usr/bin/env node
/*
  image-variants.mjs — responsive stills, emitted by the Jekyll build.

  The recipe is _data/image_sources.yml. This script encodes the rungs into a
  cache directory and prints the manifest Liquid already reads. It does not
  write into the source tree. Video is not its job.

  The filename hash is the source bytes, the width, and the encoder version.
  It is not a hash of the output. Output bytes move when libwebp moves; the
  pinned sharp version is what makes a rebuild name the same files.

    node design/image-variants.mjs check
    node design/image-variants.mjs prepare --root . --cache .jekyll-cache/image-variants

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

export class ImageVariantError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImageVariantError';
  }
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

async function encodeRung(sharp, source, dest, width) {
  mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + '.' + process.pid + '.tmp';
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

export async function prepare({ root, cache, recipe }) {
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
    const variants = [];

    for (const width of widths) {
      if (width === meta.width && ext === '.webp') {
        variants.push({
          src: sitePath,
          width: meta.width,
          height: meta.height,
          bytes: sourceBytes.length,
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
      const cacheFile = path.join(cache, ...publicRel.split('/'));
      let info;
      if (existsSync(cacheFile) && statSync(cacheFile).size > 0) {
        info = await sharp(cacheFile).metadata();
        if (info.width !== width) {
          rmSync(cacheFile, { force: true });
          info = null;
        } else {
          cached += 1;
        }
      }
      if (!info) {
        info = await encodeRung(sharp, located.abs, cacheFile, width);
        encoded += 1;
      }
      variants.push({
        src: '/' + publicRel,
        width: info.width,
        height: info.height,
        bytes: existsSync(cacheFile) ? statSync(cacheFile).size : info.size,
      });
      publish.push({ from: cacheFile, to: publicRel });
    }
    manifest[sitePath] = { width: meta.width, height: meta.height, variants };
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
      const result = await prepare({ root: flag('root'), cache: flag('cache') });
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
    console.error('usage: node design/image-variants.mjs check|prepare [--root DIR] [--cache DIR]');
    process.exit(1);
  };
  run().catch(error => {
    console.error('image-variants: ' + error.message);
    process.exit(1);
  });
}
