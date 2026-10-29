import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  installHostRelease, promotionRefusals, readCatalogue, verifyCatalogue, verifyHostRelease,
} from '../host-release.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function fixture(t, { version = '0.6.0', commit = 'a'.repeat(40), dirty = true, readme = 'PaperLang runtime', source = 'export const createWorld = () => {}\n' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'paperlang-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'release');
  const site = join(root, 'site');
  const put = (path, text) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); return text; };
  const sources = { 'assets/js/host.js': sha(source) };
  put('sources/assets/js/host.js', source);
  const artifacts = {};
  const artifact = (path, text) => { put(path, text); artifacts[path] = sha(text); return text; };
  artifact('host.mjs', source);
  artifact('host.meta.json', JSON.stringify({
    inputs: { 'assets/js/host.js': {} },
    outputs: { 'host.mjs': { exports: ['createWorld'], imports: [] } },
  }));
  artifact('host.mjs.LEGAL.txt', 'legal');
  artifact('LICENSE', 'AGPL license');
  artifact('NOTICE.txt', 'dependency notice');
  artifact('licenses/MIT.txt', 'MIT license');
  artifact('package.json', JSON.stringify({
    name: '@paperland/paperlang', version, exports: './host.mjs', license: 'AGPL-3.0-only',
  }));
  artifact('README.md', readme);
  const manifest = {
    artifact: 'paperlang-host', format: 'esm', commit, checkoutDirty: dirty,
    sourceDirty: dirty, sourceDigest: sha(JSON.stringify(sources)), sources, artifacts,
  };
  manifest.revision = dirty ? `${commit}-dirty+${manifest.sourceDigest.slice(0, 12)}` : commit;
  const save = () => put('release.json', JSON.stringify(manifest));
  save();
  return { root, dir, site, put, artifact, manifest, save, source };
}

function generationDirs(site) {
  const root = join(site, 'assets/lib/paperlang');
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).filter(dir => dir.isDirectory()).flatMap(line =>
    readdirSync(join(root, line.name), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => join(line.name, entry.name)));
}

test('a release installs into a content-addressed generation with complete evidence', (t) => {
  const f = fixture(t);
  const installed = installHostRelease(f.dir, f.site);
  assert.match(installed.generation, /^\/assets\/lib\/paperlang\/0\.6\/[a-f0-9]{64}$/);
  assert.equal(installed.artifactPath, `${installed.generation}/host.mjs`);
  const catalogue = readCatalogue(f.site);
  assert.equal(catalogue.latest, '0.6');
  assert.equal(catalogue.lines['0.6'].version, '0.6.0');
  assert.equal(catalogue.lines['0.6'].source_dirty, true);
  assert.equal(catalogue.lines['0.6'].evidence_sha256, sha(readFileSync(join(f.dir, 'release.json'))));
  const generation = join(f.site, installed.generation.slice(1));
  assert.ok(existsSync(join(generation, 'sources/assets/js/host.js')));
  assert.ok(existsSync(join(generation, 'licenses/MIT.txt')));
  assert.equal(verifyHostRelease(generation).manifest.revision, installed.manifest.revision);
});

test('same executable bytes with different release evidence retain two generations', (t) => {
  const f = fixture(t);
  const first = installHostRelease(f.dir, f.site);
  const before = readdirSync(join(f.site, first.generation.slice(1))).sort();
  f.manifest.commit = 'b'.repeat(40);
  f.manifest.sourceDirty = false;
  f.manifest.checkoutDirty = false;
  f.manifest.revision = f.manifest.commit;
  f.artifact('README.md', 'PaperLang runtime, revised documentation');
  f.manifest.artifacts['README.md'] = sha('PaperLang runtime, revised documentation');
  f.save();
  const second = installHostRelease(f.dir, f.site);
  assert.notEqual(second.generation, first.generation, 'README/commit evidence must name a new generation');
  assert.equal(second.artifactHash, first.artifactHash, 'the executable bytes are the same');
  assert.deepEqual(readdirSync(join(f.site, first.generation.slice(1))).sort(), before, 'the earlier generation is untouched');
  assert.equal(generationDirs(f.site).length, 2);
  const catalogue = readCatalogue(f.site);
  assert.equal(catalogue.lines['0.6'].generation, second.generation);
});

test('re-installing exact evidence is idempotent', (t) => {
  const f = fixture(t);
  const first = installHostRelease(f.dir, f.site);
  const second = installHostRelease(f.dir, f.site);
  assert.equal(second.generation, first.generation);
  assert.equal(generationDirs(f.site).length, 1);
});

test('a later line is retained beside 0.6 and latest moves only when asked', (t) => {
  const six = fixture(t, { version: '0.6.0', commit: '1'.repeat(40), dirty: false });
  const first = installHostRelease(six.dir, six.site);
  const seven = fixture(t, { version: '0.7.0', commit: '2'.repeat(40), dirty: false });
  const second = installHostRelease(seven.dir, six.site);
  let catalogue = readCatalogue(six.site);
  assert.equal(catalogue.lines['0.6'].generation, first.generation);
  assert.equal(catalogue.lines['0.7'].generation, second.generation);
  assert.equal(catalogue.latest, '0.6', 'latest does not move silently');
  installHostRelease(seven.dir, six.site, { latest: true });
  catalogue = readCatalogue(six.site);
  assert.equal(catalogue.latest, '0.7');
  assert.equal(catalogue.lines['0.6'].generation, first.generation, '0.6 is not retargeted by 0.7');
});

test('dirty snapshots are installable but refused for promotion; clean evidence passes', (t) => {
  const dirty = fixture(t);
  installHostRelease(dirty.dir, dirty.site);
  assert.match(promotionRefusals(readCatalogue(dirty.site)).join(' '), /source snapshot is dirty/);

  const clean = fixture(t, { commit: 'c'.repeat(40), dirty: false });
  installHostRelease(clean.dir, clean.site);
  assert.deepEqual(promotionRefusals(readCatalogue(clean.site)), []);
});

test('tampered artifact, source, package and exports are refused', (t) => {
  const f = fixture(t);
  const original = readFileSync(join(f.dir, 'host.mjs'));
  writeFileSync(join(f.dir, 'host.mjs'), Buffer.concat([original, Buffer.from('// tampered\n')]));
  assert.throws(() => verifyHostRelease(f.dir), /artifact hash mismatch: host.mjs/);
  writeFileSync(join(f.dir, 'host.mjs'), original);

  f.put('sources/assets/js/host.js', 'changed');
  assert.throws(() => verifyHostRelease(f.dir), /source hash mismatch/);

  const f2 = fixture(t);
  f2.artifact('package.json', JSON.stringify({ name: '@paperland/paperlang', version: '0.6.0', exports: './host.mjs', license: 'MIT' }));
  f2.save();
  assert.throws(() => verifyHostRelease(f2.dir), /package licence/);

  const f2b = fixture(t);
  f2b.artifact('package.json', JSON.stringify({ name: '@paperland/paperlang', version: '0.6.0', exports: './wrong.mjs', license: 'AGPL-3.0-only' }));
  f2b.save();
  assert.throws(() => verifyHostRelease(f2b.dir), /package entry/);

  const f3 = fixture(t);
  f3.artifact('host.meta.json', JSON.stringify({ inputs: { 'assets/js/host.js': {} }, outputs: { 'host.mjs': { exports: ['createHatch'], imports: [] } } }));
  f3.save();
  assert.throws(() => verifyHostRelease(f3.dir), /createWorld/);

  const f4 = fixture(t);
  f4.artifact('unexpected.js', 'not allowed');
  f4.put('release.json', JSON.stringify({ ...f4.manifest, artifacts: f4.manifest.artifacts }));
  assert.throws(() => verifyHostRelease(f4.dir), /unexpected artifact/);
});

test('source evidence, legal files and unsafe paths fail closed', (t) => {
  const f = fixture(t);
  delete f.manifest.artifacts.LICENSE;
  f.save();
  assert.throws(() => verifyHostRelease(f.dir), /missing LICENSE/);

  const f2 = fixture(t);
  f2.manifest.sources['../escape'] = 'a'.repeat(64);
  f2.save();
  assert.throws(() => verifyHostRelease(f2.dir), /unsafe release path/);

  const f3 = fixture(t);
  rmSync(join(f3.dir, 'sources/assets/js/host.js'));
  assert.throws(() => verifyHostRelease(f3.dir), /source hash mismatch|no such file/i);
});

test('catalogue labels are bound to actual evidence, not formatted strings', (t) => {
  const f = fixture(t);
  installHostRelease(f.dir, f.site);
  const path = join(f.site, '_data/paperlang.json');
  const read = () => JSON.parse(readFileSync(path, 'utf8'));
  const write = (data) => writeFileSync(path, JSON.stringify(data));
  const base = read();
  assert.doesNotThrow(() => verifyCatalogue(f.site));
  rmSync(join(f.site, read().lines['0.6'].generation.slice(1), 'sources'), { recursive: true, force: true });
  assert.doesNotThrow(() => verifyCatalogue(f.site));

  const relabel = structuredClone(base);
  relabel.lines['0.7'] = relabel.lines['0.6'];
  relabel.lines['0.7'].version = '0.7.0';
  delete relabel.lines['0.6'];
  relabel.latest = '0.7';
  write(relabel);
  assert.throws(() => verifyCatalogue(f.site), /canonical|another line/);

  const evidence = structuredClone(base);
  evidence.lines['0.6'].evidence_sha256 = 'a'.repeat(64);
  write(evidence);
  assert.throws(() => verifyCatalogue(f.site), /evidence digest/);

  const dirty = structuredClone(base);
  dirty.lines['0.6'].source_dirty = false;
  write(dirty);
  assert.throws(() => verifyCatalogue(f.site), /dirtiness/);

  const traversal = structuredClone(base);
  traversal.lines['0.6'].artifact_path = `${base.lines['0.6'].generation}/../host.mjs`;
  write(traversal);
  assert.throws(() => verifyCatalogue(f.site), /artifact path/);

  const version = structuredClone(base);
  version.lines['0.6'].version = '0.6.garbage';
  write(version);
  assert.throws(() => verifyCatalogue(f.site), /semver/);

  const malformed = structuredClone(base);
  malformed.lines = [];
  write(malformed);
  assert.throws(() => verifyCatalogue(f.site), /lines/);
});
