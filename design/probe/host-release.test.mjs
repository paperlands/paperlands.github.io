import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { installHostRelease, verifyHostRelease } from '../host-release.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'paperland-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'release'), site = join(root, 'site');
  const put = (path, text) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), text); };
  const sources = { 'assets/js/host.js': hash('export const createHatch = () => {}') };
  put('sources/assets/js/host.js', 'export const createHatch = () => {}');
  const artifacts = {};
  for (const [path, bytes] of Object.entries({
    'host.mjs': 'export const createHatch = () => {}',
    'host.meta.json': JSON.stringify({ inputs: { 'assets/js/host.js': {} }, outputs: { 'host.mjs': { exports: ['createHatch'] } } }),
    'host.mjs.LEGAL.txt': 'linked legal comments', LICENSE: 'AGPL license', 'NOTICE.txt': 'dependency notice', 'licenses/MIT.txt': 'MIT license',
  })) { put(path, bytes); artifacts[path] = hash(bytes); }
  const manifest = { artifact: 'paperlang-host', format: 'esm', commit: 'a'.repeat(40), sourceDirty: true, checkoutDirty: true, sourceDigest: hash(JSON.stringify(sources)), sources, artifacts };
  manifest.revision = `${manifest.commit}-dirty+${manifest.sourceDigest.slice(0, 12)}`;
  const save = () => put('release.json', JSON.stringify(manifest));
  save();
  return { dir, site, put, manifest, save };
}

test('producer intake retains exact artifact, source snapshot, license texts and dirty revision', t => {
  const { dir, site, manifest } = fixture(t);
  const result = installHostRelease(dir, site);
  const library = join(site, 'assets/lib/hatch');
  const installed = verifyHostRelease(library, { hostFile: result.name });
  assert.equal(installed.manifest.revision, manifest.revision);
  assert.equal(installed.artifactHash, manifest.artifacts['host.mjs']);
  assert.match(result.pin, /source_dirty: true/);
  assert.match(result.pin, /host_api: null/);
  assert.ok(existsSync(join(library, 'licenses/MIT.txt')));
  assert.ok(existsSync(join(library, 'sources/assets/js/host.js')));
});

test('corrupt updates cannot replace the previous library or pin', t => {
  const f = fixture(t);
  const first = installHostRelease(f.dir, f.site);
  const pin = join(f.site, '_data/hatch.yml');
  const oldPin = readFileSync(pin);
  const oldArtifact = readFileSync(join(f.site, 'assets/lib/hatch', first.name));
  f.put('host.mjs', 'corrupted');
  assert.throws(() => installHostRelease(f.dir, f.site), /artifact hash mismatch/);
  assert.deepEqual(readFileSync(pin), oldPin);
  assert.deepEqual(readFileSync(join(f.site, 'assets/lib/hatch', first.name)), oldArtifact);
});

test('source tampering, missing licenses, and a revision that hides dirty sources are refused', t => {
  const f = fixture(t);
  f.put('sources/assets/js/host.js', 'changed');
  assert.throws(() => verifyHostRelease(f.dir), /source hash mismatch/);
  f.put('sources/assets/js/host.js', 'export const createHatch = () => {}');
  f.manifest.revision = f.manifest.commit; f.save();
  assert.throws(() => verifyHostRelease(f.dir), /conceals/);
  f.manifest.revision = `${f.manifest.commit}-dirty+${f.manifest.sourceDigest.slice(0, 12)}`;
  delete f.manifest.artifacts.LICENSE; f.save();
  assert.throws(() => verifyHostRelease(f.dir), /missing LICENSE/);
});

test('source paths cannot escape the snapshot and app inputs cannot enter the closure', t => {
  const f = fixture(t);
  f.manifest.sources['../escape'] = 'a'.repeat(64); f.save();
  assert.throws(() => verifyHostRelease(f.dir), /unsafe release path/);
  delete f.manifest.sources['../escape'];
  const source = 'application hook';
  f.manifest.sources['assets/js/hooks/page.js'] = hash(source);
  f.put('sources/assets/js/hooks/page.js', source);
  f.manifest.sourceDigest = hash(JSON.stringify(f.manifest.sources));
  f.manifest.revision = `${f.manifest.commit}-dirty+${f.manifest.sourceDigest.slice(0, 12)}`;
  const meta = JSON.stringify({ inputs: { 'assets/js/host.js': {}, 'assets/js/hooks/page.js': {} }, outputs: { 'host.mjs': { exports: ['createHatch'] } } });
  f.put('host.meta.json', meta); f.manifest.artifacts['host.meta.json'] = hash(meta); f.save();
  assert.throws(() => verifyHostRelease(f.dir), /application machinery/);
});

test('a producer-supplied command is never executed by the intake', t => {
  const f = fixture(t);
  const sentinel = join(f.site, 'do-not-create');
  f.manifest.conformance = { command: `touch ${sentinel}` }; f.save();
  installHostRelease(f.dir, f.site);
  assert.equal(existsSync(sentinel), false);
});
