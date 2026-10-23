import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  prepare, recipeProblems, resolveSitePath, rungHash,
} from '../image-variants.mjs';

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'image-variants-'));
  const assets = path.join(root, 'assets');
  await mkdir(assets, { recursive: true });
  const cache = path.join(root, 'cache');
  await sharp({
    create: { width: 8, height: 4, channels: 4, background: { r: 180, g: 90, b: 40, alpha: 0.5 } },
  }).png().toFile(path.join(assets, 'mark.png'));
  return { root, assets, cache };
}

test('the rung name follows the source, the width, and the encoder, not the output', () => {
  const bytes = Buffer.from('same-pixels');
  const first = rungHash(bytes, 320, 'sharp 0.35.5 / vips 8.18.7');
  assert.equal(rungHash(bytes, 320, 'sharp 0.35.5 / vips 8.18.7'), first);
  assert.notEqual(rungHash(bytes, 480, 'sharp 0.35.5 / vips 8.18.7'), first);
  assert.notEqual(rungHash(Buffer.from('other-pixels'), 320, 'sharp 0.35.5 / vips 8.18.7'), first);
  assert.notEqual(rungHash(bytes, 320, 'sharp 0.35.6 / vips 8.18.7'), first);
  assert.match(first, /^[0-9a-f]{8}$/);
});

test('a path that leaves /assets is refused before any encode', () => {
  assert.equal(resolveSitePath('/repo', '/assets/ok.webp').rel, 'assets/ok.webp');
  for (const bad of ['../etc/passwd', '/etc/passwd', '/assets/../secrets.webp', 'assets/x.webp', '/assets/a\\b.webp']) {
    assert.ok(resolveSitePath('/repo', bad).error, bad);
  }
  assert.equal(recipeProblems({ '/assets/../x.webp': { widths: [10] } }, '/repo')[0].includes('unsafe'), true);
});

test('prepare emits a WebP sibling, caches the second run, and does not write beside the source', async () => {
  const { root, assets, cache } = await fixture();
  try {
    await sharp({
      create: { width: 8, height: 4, channels: 3, background: { r: 10, g: 20, b: 30 } },
    }).png().toFile(path.join(assets, 'mark.png'));
    const recipe = { '/assets/mark.png': { widths: [4, 8] } };
    const first = await prepare({ root, cache, recipe });
    assert.equal(first.encoded, 2);
    assert.equal(first.cached, 0);
    assert.equal(first.publish.length, 2);
    assert.deepEqual(first.manifest['/assets/mark.png'].variants.map(item => item.width), [4, 8]);
    assert.ok(first.manifest['/assets/mark.png'].variants.every(item => item.src.endsWith('.webp')));
    assert.equal(existsSync(path.join(assets, 'mark-4.webp')), false);
    const names = first.publish.map(item => path.basename(item.to));
    assert.equal(names.some(name => existsSync(path.join(assets, name))), false);

    const second = await prepare({ root, cache, recipe });
    assert.equal(second.encoded, 0);
    assert.equal(second.cached, 2);
    assert.deepEqual(second.manifest['/assets/mark.png'].variants.map(item => item.src),
      first.manifest['/assets/mark.png'].variants.map(item => item.src));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a WebP source is the largest candidate and is not re-encoded', async () => {
  const { root, assets, cache } = await fixture();
  try {
    const source = path.join(assets, 'plate.webp');
    await sharp({
      create: { width: 6, height: 2, channels: 3, background: { r: 1, g: 2, b: 3 } },
    }).webp().toFile(source);
    const result = await prepare({
      root, cache, recipe: { '/assets/plate.webp': { widths: [3] } },
    });
    const variants = result.manifest['/assets/plate.webp'].variants;
    assert.equal(variants.at(-1).src, '/assets/plate.webp');
    assert.equal(variants.at(-1).width, 6);
    assert.equal(result.kept, 1);
    assert.equal(result.encoded, 1);
    assert.equal(result.publish.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a missing source, an empty recipe, and a width past the source fail closed', async () => {
  const { root, cache } = await fixture();
  try {
    assert.ok(recipeProblems({}, root)[0].includes('empty'));
    assert.ok(recipeProblems({ '/assets/missing.webp': { widths: [10] } }, root)[0].includes('missing'));
    await assert.rejects(
      () => prepare({ root, cache, recipe: { '/assets/mark.png': { widths: [64] } } }),
      /does not enlarge/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
