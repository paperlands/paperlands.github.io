import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { sample, withCount, statesFor, depthAt, frameKey, curve } from '../../assets/js/home/ink-state.mjs';
import { createInkCache } from '../../assets/js/home/ink-cache.mjs';

const scenes = JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e',
  'puts JSON.generate(YAML.safe_load_file("_data/helios_possibilities.yml"))'], { encoding: 'utf8' }));
const manifest = JSON.parse(readFileSync('_data/helios_ink.json'));
const tick = () => new Promise(resolve => setImmediate(resolve));
const frame = (url, width = 10, height = 10) => ({ url, width, height });

test('the compiled stops are exactly the original scroll arithmetic, including reversal', () => {
  for (const scene of Object.values(scenes)) {
    const states = statesFor(scene), keys = new Set(states.map(state => state.key));
    for (let step = 0; step <= 20; step++) {
      const key = frameKey(scene.grows, step / 20);
      assert.ok(keys.has(key));
      assert.equal(states.find(state => state.key === key).source,
        scene.program.trim().replace(scene.grows.line, withCount(scene.grows.line, sample(scene.grows.from, scene.grows.to, step / 20))));
      assert.equal(frameKey(scene.grows, (20 - step) / 20), String(sample(scene.grows.from, scene.grows.to, (20 - step) / 20)));
    }
    assert.equal(states.at(-1).source, scene.program.trim());
    assert.equal(frameKey(scene.grows, .1, true), 'settled');
  }
  assert.equal(new Set(statesFor(scenes.inquiry).map(s => s.source)).size, 5);
  assert.equal(new Set(statesFor(scenes.creators).map(s => s.source)).size, 21);
});

test('substitution changes only the final literal and rejects an invalid authoring range', () => {
  assert.equal(withCount('tri 500 4', 6), 'tri 500 6');
  assert.equal(withCount('torus 100', 31), 'torus 31');
  assert.equal(sample(0, 1, .33), 0); // Integral endpoints retain integral counts.
  assert.equal(sample(0, .5, .33), .175);
  assert.equal(sample(100, 1, 0), 100);
  assert.equal(sample(100, 1, 1), 1);
  assert.equal(sample(1, 100, -5), 1);
  assert.equal(sample(1, 100, 5), 100);
  assert.deepEqual(statesFor({ program: ' fw 10\n' }), [{ key: 'settled', source: 'fw 10' }]);
  assert.throws(() => statesFor({ program: 'fw 10', grows: { line: 'fw 20', from: 1, to: 10 } }));
});

test('cached document geometry gives the original depth without a DOM read', () => {
  assert.equal(depthAt(1000, 900, 900, 352), 0);
  assert.equal(depthAt(1000, 900, 900, 802), .5);
  assert.equal(depthAt(1000, 900, 900, 1252), 1);
  assert.equal(depthAt(1000, 0, 900, 9999), 1);
});

test('an ease above 1 slows the start of the same depth and still meets both ends', () => {
  assert.equal(curve(0, 2), 0);
  assert.equal(curve(1, 2), 1);
  assert.equal(curve(.5, 2), .25);
  assert.equal(curve(.5, 1), .5);
  assert.equal(curve(.47), .47);
  assert.ok(curve(.47, 2) < .47);
  assert.equal(frameKey(scenes.inquiry.grows, .47), frameKey(scenes.inquiry.grows, curve(.47, scenes.inquiry.grows.ease)));
  const linear = Number(frameKey(scenes.creators.grows, .47));
  const gradual = Number(frameKey(scenes.creators.grows, curve(.47, scenes.creators.grows.ease)));
  assert.ok(gradual < linear);
  assert.equal(frameKey(scenes.creators.grows, curve(0, 2)), '1');
  assert.equal(frameKey(scenes.creators.grows, curve(1, 2)), '100');
});

test('each layout contains every state, deduplicates identical source, and names real content-addressed pixels', () => {
  let bytes = 0; const paths = new Set();
  for (const [name, scene] of Object.entries(scenes)) {
    for (const layout of Object.values(manifest.scenes[name].layouts)) {
      assert.ok(layout.width * layout.height <= 1_100_000);
      const sourcePaths = new Map();
      for (const { key, source } of statesFor(scene)) {
        const path = layout.frames[key]; assert.ok(path);
        if (sourcePaths.has(source)) assert.equal(path, sourcePaths.get(source));
        sourcePaths.set(source, path);
        if (paths.has(path)) continue;
        paths.add(path);
        const data = readFileSync('.' + path); bytes += data.length;
        assert.equal(data.subarray(0, 4).toString(), 'RIFF');
        assert.ok(path.includes(createHash('sha256').update(data).digest('hex').slice(0, 16)));
      }
    }
  }
  assert.ok(bytes < 3_000_000, `${bytes} compiled bytes`);
});

test('the app worker never eagerly precaches the scroll catalogue', () => {
  const config = createRequire(import.meta.url)('../../workbox-config.js');
  assert.ok(config.globIgnores.includes('assets/lib/helios/ink/**'));
  assert.ok(config.globPatterns.every(pattern => !/png|jpe?g|webp|gif/.test(pattern)), 'raster artwork is cached as visited, not eagerly installed');
  assert.equal(config.runtimeCaching.find(rule => rule.options.cacheName === 'images-cache').options.expiration.maxEntries, 48);
  assert.equal(config.runtimeCaching.find(rule => rule.options.cacheName === 'media-cache').options.expiration.maxEntries, 3);
});

test('two in-flight decodes, latest demand wins; obsolete intermediate requests never queue', async () => {
  const started = [], pending = new Map();
  const cache = createInkCache({ budget: 1600, load: f => {
    started.push(f.url); return new Promise(resolve => pending.set(f.url, resolve));
  } });
  const owner = {};
  cache.demand(owner, [frame('a'), frame('b')], ''); await tick();
  assert.deepEqual(started, ['a', 'b']); assert.equal(cache.stats().active, 2);
  cache.demand(owner, [frame('obsolete')], 'a');
  cache.demand(owner, [frame('latest')], 'a');
  pending.get('a')({ id: 'a' }); await tick();
  assert.deepEqual(started, ['a', 'b', 'latest']);
  pending.get('b')({ id: 'b' }); pending.get('latest')({ id: 'latest' }); await tick();
  assert.equal(cache.read('latest').id, 'latest');
  assert.equal(cache.stats().active, 0);
  assert.ok(cache.stats().bytes <= cache.stats().budget);
});

test('LRU evicts unheld frames, keeps the visible figure and respects byte rather than item counts', async () => {
  const cache = createInkCache({ budget: 1200, load: async f => ({ id: f.url }) });
  const owner = {};
  cache.demand(owner, [frame('a'), frame('b')], ''); await tick();
  cache.demand(owner, [frame('c')], 'a'); await tick();
  cache.demand(owner, [frame('d')], 'a'); await tick();
  assert.equal(cache.read('a').id, 'a');
  assert.equal(cache.read('b'), null);
  assert.equal(cache.read('d').id, 'd');
  assert.equal(cache.stats().bytes, 1200);
  cache.demand(owner, [frame('oversized', 1000, 1000)], 'a'); await tick();
  assert.ok(cache.stats().bytes <= 1200); assert.equal(cache.read('oversized'), null);
});

test('failed assets retain the visible fallback and do not retry on every frame', async () => {
  let loads = 0;
  const cache = createInkCache({ load: async () => { loads++; throw new Error('offline'); } });
  const owner = {};
  cache.demand(owner, [frame('broken')], 'poster'); await tick();
  for (let i = 0; i < 20; i++) cache.demand(owner, [frame('broken')], 'poster');
  await tick();
  assert.equal(loads, 1); assert.equal(cache.stats().bytes, 0);
  assert.equal(cache.read('broken'), null);
});

test('a real recovery signal retries only the latest failed demand', async () => {
  let online = false, loads = 0;
  const cache = createInkCache({ load: async f => {
    loads++; if (!online) throw new Error('offline'); return { id: f.url };
  } });
  const owner = {};
  cache.demand(owner, [frame('old')], 'poster'); await tick();
  cache.demand(owner, [frame('current')], 'poster'); await tick();
  online = true; cache.retryFailures(); await tick();
  assert.equal(loads, 3);
  assert.equal(cache.read('old'), null);
  assert.equal(cache.read('current').id, 'current');
});
