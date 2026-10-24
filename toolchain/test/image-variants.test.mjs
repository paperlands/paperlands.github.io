import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import {
  existsSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  prepare, recipeProblems, resolveSitePath, rungHash, runPool,
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

test('the pool keeps its cap, its index order, and the lowest-index failure', async () => {
  let inFlight = 0;
  let peak = 0;
  const finished = [];
  const results = await runPool([...Array(9).keys()], 3, async (item) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise(resolve => setTimeout(resolve, item % 3 === 0 ? 8 : 1));
    finished.push(item);
    inFlight -= 1;
    return item * 2;
  });
  assert.equal(peak, 3, 'cap was not honoured');
  assert.deepEqual(results, [...Array(9).keys()].map(item => item * 2), 'results were not in index order');
  assert.notDeepEqual(finished, [...Array(9).keys()], 'completion order was never actually shuffled');

  const started = [];
  let running = 0;
  const failure = runPool([0, 1, 2, 3, 4, 5], 2, async (item) => {
    started.push(item);
    running += 1;
    await new Promise(resolve => setTimeout(resolve, item === 1 ? 1 : 5));
    running -= 1;
    if (item === 1) throw new Error('boom ' + item);
    return item;
  });
  await assert.rejects(failure, /boom 1/);
  assert.equal(running, 0, 'rejected with a worker still in flight');
  assert.ok(started.length < 6, 'kept dispatching after a failure');
  assert.ok(started.includes(1), 'the failing item never ran');

  assert.deepEqual(await runPool([], 4, async () => 1), [], 'empty pool');
});

test('cap 1 and cap 4 produce the same manifest, publish order and bytes', async () => {
  const { root, assets } = await fixture();
  try {
    await sharp({ create: { width: 8, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } } })
      .png().toFile(path.join(assets, 'alpha.png'));
    await sharp({ create: { width: 6, height: 2, channels: 3, background: { r: 4, g: 5, b: 6 } } })
      .webp().toFile(path.join(assets, 'plate.webp'));
    const recipe = {
      '/assets/alpha.png': { widths: [4, 2] },
      '/assets/plate.webp': { widths: [3] },
      '/assets/mark.png': { widths: [4] },
    };
    const one = await prepare({ root, cache: path.join(root, 'cache-1'), recipe, concurrency: 1 });
    const four = await prepare({ root, cache: path.join(root, 'cache-4'), recipe, concurrency: 4 });

    assert.equal(four.encoded, one.encoded);
    assert.deepEqual(Object.keys(four.manifest), Object.keys(one.manifest), 'manifest key order moved');
    assert.deepEqual(four.manifest, one.manifest, 'manifest differs by concurrency');
    assert.deepEqual(four.publish.map(item => item.to), one.publish.map(item => item.to),
      'publish order differs by concurrency');
    for (const [index, entry] of one.publish.entries()) {
      assert.ok(readFileSync(entry.from).equals(readFileSync(four.publish[index].from)),
        'encoded bytes differ for ' + entry.to);
    }
    assert.equal(
      readFileSync(path.join(root, 'cache-1', 'manifest.json'), 'utf8'),
      readFileSync(path.join(root, 'cache-4', 'manifest.json'), 'utf8'),
      'manifest.json differs by concurrency',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('an unreadable cache entry is a miss, not a build failure', async () => {
  const { root, cache } = await fixture();
  try {
    const recipe = { '/assets/mark.png': { widths: [4, 8] } };
    const first = await prepare({ root, cache, recipe });
    assert.equal(first.encoded, 2);

    writeFileSync(first.publish[0].from, Buffer.from('not an image at all'));
    const repaired = await prepare({ root, cache, recipe });
    assert.equal(repaired.encoded, 1, 'the damaged rung was not re-encoded');
    assert.equal(repaired.cached, 1);
    assert.ok(readFileSync(repaired.publish[0].from).subarray(0, 4).equals(Buffer.from('RIFF')),
      'the repaired rung is not a WebP');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a warm run under concurrency encodes nothing', async () => {
  const { root, cache } = await fixture();
  try {
    const recipe = { '/assets/mark.png': { widths: [4, 8] } };
    await prepare({ root, cache, recipe, concurrency: 4 });
    const warm = await prepare({ root, cache, recipe, concurrency: 4 });
    assert.equal(warm.encoded, 0);
    assert.equal(warm.cached, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('pruning happens only after every worker finished, and never on failure', async () => {
  const { root, cache } = await fixture();
  try {
    const recipe = { '/assets/mark.png': { widths: [4, 8] } };
    const first = await prepare({ root, cache, recipe });
    const orphan = path.join(cache, 'assets', 'orphan-1-deadbeef.webp');
    writeFileSync(orphan, 'stale');

    await prepare({ root, cache, recipe, concurrency: 4 });
    assert.equal(existsSync(orphan), false, 'a successful run left an orphan in the cache');

    const manifestBefore = readFileSync(path.join(cache, 'manifest.json'), 'utf8');
    const orphanAgain = path.join(cache, 'orphan-2-feedface.webp');
    writeFileSync(orphanAgain, 'stale');

    // Break one rung's destination directory: mkdirSync cannot create a
    // directory where a file of that name already exists.
    const victim = first.publish[0].from;
    const dir = path.dirname(victim);
    rmSync(victim, { force: true });
    rmSync(dir, { recursive: true, force: true });
    writeFileSync(dir, 'not a directory');

    await assert.rejects(() => prepare({ root, cache, recipe, concurrency: 4 }));

    assert.equal(existsSync(orphanAgain), true, 'pruned after a failed run');
    assert.equal(readFileSync(path.join(cache, 'manifest.json'), 'utf8'), manifestBefore,
      'rewrote the manifest after a failed run');
    const leftovers = readdirSync(cache, { recursive: true })
      .filter(name => String(name).endsWith('.tmp'));
    assert.deepEqual(leftovers, [], 'left temporary files behind');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a cap that is not a positive integer fails actionably', async () => {
  const { root, cache } = await fixture();
  try {
    for (const bad of [0, -1, 1.5, NaN, '4']) {
      await assert.rejects(
        () => runPool([0], bad, async () => 0),
        /concurrency must be a positive integer/,
        'runPool accepted ' + String(bad),
      );
      await assert.rejects(
        () => prepare({ root, cache, recipe: { '/assets/mark.png': { widths: [4] } }, concurrency: bad }),
        /concurrency must be a positive integer/,
        'prepare accepted ' + String(bad),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('two failures are reported by index, not by which finished first', async () => {
  const started = [];
  let running = 0;
  let caught;
  try {
    await runPool([0, 1, 2, 3], 4, async (item) => {
      started.push(item);
      running += 1;
      // index 3 fails first, index 1 fails last
      await new Promise(resolve => setTimeout(resolve, item === 3 ? 1 : item === 1 ? 8 : 3));
      running -= 1;
      if (item === 3) throw new Error('late-index');
      if (item === 1) throw new Error('early-index');
      return item;
    });
  } catch (error) {
    caught = error;
  }
  assert.equal(caught.message, 'early-index', 'reported the first failure to finish');
  assert.equal(running, 0, 'rejected with a worker still in flight');
  assert.deepEqual([...started].sort(), [0, 1, 2, 3], 'did not start every queued job');
});

test('a falsy rejection is still a rejection', async () => {
  let caught = 'nothing';
  try {
    await runPool([0], 2, async () => { throw null; });
  } catch (error) {
    caught = error;
  }
  assert.equal(caught, null, 'swallowed a null rejection');
});

test('two recipe keys that resolve to one output share a rung instead of racing it', async () => {
  const { root, assets, cache } = await fixture();
  try {
    // sharp reads the signature, not the extension: these are the same PNG
    // bytes under two names, so both keys hash to the same rung name.
    writeFileSync(path.join(assets, 'mark.jpg'), readFileSync(path.join(assets, 'mark.png')));
    const recipe = {
      '/assets/mark.png': { widths: [4] },
      '/assets/mark.jpg': { widths: [4] },
    };
    const result = await prepare({ root, cache, recipe, concurrency: 4 });

    assert.deepEqual(Object.keys(result.manifest), ['/assets/mark.png', '/assets/mark.jpg']);
    assert.deepEqual(
      result.manifest['/assets/mark.jpg'].variants,
      result.manifest['/assets/mark.png'].variants,
      'the aliased key did not get the same rungs',
    );
    const outputs = result.publish.map(item => item.to);
    assert.equal(new Set(outputs).size, outputs.length, 'published the same rung twice');
    assert.equal(outputs.length, 2, 'expected one rung per width, not one per recipe key');
    assert.equal(result.encoded, 2, 'encoded the aliased rung twice');
    assert.equal(result.cached, 2, 'did not report the shared rung as a hit');
    const written = readdirSync(cache, { recursive: true }).filter(name => String(name).endsWith('.webp'));
    assert.equal(written.length, 2, 'left duplicate bytes in the cache');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
