// Consume Dojo's host-release evidence without executing commands from a manifest.
// A generation is keyed by the release.json digest, not the bundle hash: a clean
// promotion or a README-only change can share bytes with a dirty build but never
// share provenance. Generations are immutable and never replaced.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digest = /^[a-f0-9]{64}$/;
const semver = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const insist = (pass, message) => { if (!pass) throw new Error(message); };
export const CATALOGUE_SCHEMA = 1;

const safePath = (name) => {
  insist(typeof name === 'string' && name.length > 0 && !name.includes('\\')
    && name.split('/').every(part => part && part !== '.' && part !== '..') && !name.startsWith('/'), `unsafe release path: ${name}`);
  return name;
};

const allowedArtifact = (name) => ['host.mjs', 'host.meta.json', 'host.mjs.LEGAL.txt', 'LICENSE', 'NOTICE.txt', 'package.json', 'README.md'].includes(name)
  || /^licenses\/[^/]+\.txt$/.test(name);

export function versionLine(version) {
  insist(semver.test(version), `release version is not semver: ${version}`);
  return version.split('.').slice(0, 2).join('.');
}

export function verifyHostRelease(directory, { hostFile = 'host.mjs' } = {}) {
  const root = realpathSync(directory);
  const files = new Map();
  const read = (name) => {
    safePath(name);
    const path = join(root, name);
    insist(realpathSync(path).startsWith(root + sep) && lstatSync(path).isFile(), `release input is not a local regular file: ${name}`);
    return readFileSync(path);
  };
  const manifestBytes = read('release.json');
  const manifest = JSON.parse(manifestBytes);
  insist(manifest.artifact === 'paperlang-host' && manifest.format === 'esm', 'not a PaperLang host release');
  insist(/^[a-f0-9]{40}$/.test(manifest.commit), 'release must name a full source commit');
  insist(typeof manifest.sourceDirty === 'boolean' && typeof manifest.checkoutDirty === 'boolean', 'release must disclose source dirtiness');
  insist(manifest.sources && Object.keys(manifest.sources).length > 0 && manifest.artifacts, 'release inventories are missing');
  for (const required of ['host.mjs', 'host.meta.json', 'host.mjs.LEGAL.txt', 'LICENSE', 'NOTICE.txt', 'package.json', 'README.md']) {
    insist(digest.test(manifest.artifacts[required] ?? ''), `release is missing ${required}`);
  }
  for (const [name, hash] of Object.entries(manifest.artifacts)) {
    safePath(name);
    insist(allowedArtifact(name), `unexpected artifact: ${name}`);
    const bytes = read(name === 'host.mjs' ? hostFile : name);
    insist(digest.test(hash) && sha(bytes) === hash, `artifact hash mismatch: ${name}`);
    files.set(name, bytes);
  }
  insist([...files.keys()].some(name => name.startsWith('licenses/')), 'release has no dependency license texts');
  for (const [name, hash] of Object.entries(manifest.sources)) {
    const bytes = read(`sources/${safePath(name)}`);
    insist(digest.test(hash) && sha(bytes) === hash, `source hash mismatch: ${name}`);
    files.set(`sources/${name}`, bytes);
  }
  insist(manifest.sourceDigest === sha(JSON.stringify(manifest.sources)), 'source inventory digest mismatch');
  const revision = manifest.sourceDirty ? `${manifest.commit}-dirty+${manifest.sourceDigest.slice(0, 12)}` : manifest.commit;
  insist(manifest.revision === revision, 'revision conceals or misnames the source snapshot');

  const pkg = JSON.parse(files.get('package.json').toString('utf8'));
  insist(pkg.name === '@paperland/paperlang', 'package is not @paperland/paperlang');
  insist(semver.test(pkg.version ?? ''), `package version is not semver: ${pkg.version}`);
  insist(pkg.exports === './host.mjs' || pkg.exports?.['.'] === './host.mjs', 'package entry is not ./host.mjs');
  insist(pkg.license === 'AGPL-3.0-only', 'package licence is not AGPL-3.0-only');
  files.set('release.json', manifestBytes);

  const meta = JSON.parse(files.get('host.meta.json'));
  const inputs = Object.keys(meta.inputs ?? {}).sort();
  insist(inputs.includes('assets/js/host.js') && inputs.every(name => manifest.sources[name]), 'closure inputs are absent from the source snapshot');
  const banned = ['/hooks/', '/editor/', '/terminal/', '/export/', 'phoenix', 'mediabunny'];
  insist(inputs.every(name => name.startsWith('assets/js/') && !banned.some(word => name.includes(word))), 'host closure includes application machinery');
  const executables = Object.keys(meta.outputs ?? {}).filter(name => /\.(mjs|js)$/.test(name));
  insist(executables.length === 1 && executables[0] === 'host.mjs', 'release is not a single executable module');
  insist((meta.outputs?.['host.mjs']?.imports ?? []).length === 0, 'host module has external executable imports');
  insist(meta.outputs?.['host.mjs']?.exports?.includes('createWorld'), 'release does not export createWorld');
  return { manifest, files, inputs, artifactHash: manifest.artifacts['host.mjs'], package: pkg };
}

// One authoritative read-side check for the catalogue. A label is not evidence:
// every field is bound to the bytes beside the generation it names.
export function verifyCatalogue(root) {
  const catalogue = readCatalogue(root);
  insist(typeof catalogue.latest === 'string' && catalogue.latest.length > 0, 'catalogue latest is not a line');
  insist(!Array.isArray(catalogue.lines) && Object.keys(catalogue.lines).length > 0, 'catalogue has no lines');
  insist(catalogue.lines[catalogue.latest], 'catalogue latest does not name an installed line');
  const entries = {};
  for (const [line, entry] of Object.entries(catalogue.lines)) {
    insist(!Array.isArray(entry) && entry && typeof entry === 'object', `${line}: catalogue entry is not an object`);
    insist(semver.test(entry.version ?? ''), `${line}: version is not semver`);
    insist(versionLine(entry.version) === line, `${line}: version ${entry.version} is on another line`);
    insist(typeof entry.source_dirty === 'boolean', `${line}: source_dirty is not a boolean`);
    const generation = entry.generation;
    insist(typeof generation === 'string' && generation.startsWith('/assets/lib/paperlang/')
      && !generation.includes('..') && !generation.includes('//'), `${line}: generation path is unsafe`);
    const generationRoot = resolve(root, generation.slice(1));
    const release = verifyHostRelease(generationRoot);
    const evidence = sha(readFileSync(join(generationRoot, 'release.json')));
    const canonical = `/assets/lib/paperlang/${versionLine(entry.version)}/${evidence}`;
    insist(generation === canonical, `${line}: generation is not canonical for its evidence`);
    insist(entry.evidence_sha256 === evidence, `${line}: evidence digest does not match release.json`);
    insist(entry.version === release.package.version, `${line}: catalogue version does not match package.json`);
    insist(entry.commit === release.manifest.commit, `${line}: commit does not match release.json`);
    insist(entry.revision === release.manifest.revision, `${line}: revision does not match release.json`);
    insist(entry.source_digest === release.manifest.sourceDigest, `${line}: source digest does not match release.json`);
    insist(entry.source_dirty === release.manifest.sourceDirty, `${line}: dirtiness does not match release.json`);
    insist(entry.artifact_path === `${generation}/host.mjs`, `${line}: artifact path is not canonical`);
    insist(entry.artifact_sha256 === release.manifest.artifacts['host.mjs'], `${line}: artifact hash does not match release.json`);
    insist(entry.artifact_bytes === release.files.get('host.mjs').length, `${line}: artifact bytes do not match`);
    insist(entry.closure_inputs === release.inputs.length, `${line}: closure count does not match release.json`);
    insist(entry.licence_sha256 === release.manifest.artifacts.LICENSE, `${line}: licence digest does not match release.json`);
    insist(entry.notices_sha256 === release.manifest.artifacts['NOTICE.txt'], `${line}: notices digest does not match release.json`);
    insist(entry.release_manifest === 'release.json' && entry.release_manifest_sha256 === evidence, `${line}: release manifest is not canonical`);
    insist(entry.licence === 'LICENSE' && entry.notices === 'NOTICE.txt', `${line}: legal names are not canonical`);
    entries[line] = { entry, release, evidence };
  }
  return { catalogue, entries };
}

// Publication is a separate act from installation. A dirty working snapshot is
// installable and servable for local review, but it is not promotion-ready.
export function promotionRefusals(catalogue) {
  const refusals = [];
  if (!catalogue.latest || !catalogue.lines[catalogue.latest]) {
    refusals.push('catalogue latest does not name an installed line');
  }
  for (const [line, entry] of Object.entries(catalogue.lines)) {
    if (versionLine(entry.version) !== line) refusals.push(`${line}: version ${entry.version} is on another line`);
    if (entry.source_dirty !== false) refusals.push(`${line}: source snapshot is dirty`);
    if (!digest.test(entry.evidence_sha256 ?? '')) refusals.push(`${line}: release evidence digest is missing`);
    if (!digest.test(entry.artifact_sha256 ?? '')) refusals.push(`${line}: artifact digest is missing`);
  }
  return refusals;
}

// A catalogue is small JSON: schema, latest line, and one immutable generation per line.
export function cataloguePath(root) {
  return resolve(root, '_data/paperlang.json');
}

export function readCatalogue(root) {
  const path = cataloguePath(root);
  if (!existsSync(path)) return { schema: CATALOGUE_SCHEMA, latest: null, lines: {} };
  const data = JSON.parse(readFileSync(path, 'utf8'));
  insist(data.schema === CATALOGUE_SCHEMA, `catalogue schema is not ${CATALOGUE_SCHEMA}`);
  insist(data.lines && typeof data.lines === 'object', 'catalogue has no lines');
  return data;
}

function writeCatalogue(root, data) {
  const path = cataloguePath(root);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  renameSync(`${path}.tmp`, path);
}

function sameTree(root, files) {
  for (const [name, bytes] of files) {
    const path = join(root, name);
    if (!existsSync(path) || !lstatSync(path).isFile() || !readFileSync(path).equals(bytes)) return false;
  }
  return true;
}

export function installHostRelease(directory, root, { latest = false } = {}) {
  const release = verifyHostRelease(directory);
  const { manifest, files, package: pkg } = release;
  const line = versionLine(pkg.version);
  // Every byte of release.json is provenance: commit, dirtiness, source and
  // artifact hashes, npm manifest and README. It names the generation.
  const evidenceHash = sha(files.get('release.json'));
  const generation = `/assets/lib/paperlang/${line}/${evidenceHash}`;
  const destination = resolve(root, generation.slice(1));
  const artifactPath = `${generation}/host.mjs`;
  const existing = existsSync(destination);
  const staging = `${destination}.staging`;

  try {
    if (existing) {
      insist(sameTree(destination, files), `generation ${evidenceHash.slice(0, 16)} exists with different bytes`);
    } else {
      rmSync(staging, { recursive: true, force: true });
      for (const [name, bytes] of files) {
        const path = join(staging, name);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, bytes);
      }
      mkdirSync(dirname(destination), { recursive: true });
      renameSync(staging, destination);
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }

  const catalogue = readCatalogue(root);
  const generationEvidence = {
    version: pkg.version,
    revision: manifest.revision,
    commit: manifest.commit,
    source_dirty: manifest.sourceDirty,
    source_digest: manifest.sourceDigest,
    evidence_sha256: evidenceHash,
    generation,
    artifact_path: artifactPath,
    artifact_sha256: manifest.artifacts['host.mjs'],
    artifact_bytes: files.get('host.mjs').length,
    closure_inputs: release.inputs.length,
    release_manifest: 'release.json',
    release_manifest_sha256: evidenceHash,
    licence: 'LICENSE',
    licence_id: 'AGPL-3.0-only',
    licence_sha256: manifest.artifacts.LICENSE,
    notices: 'NOTICE.txt',
    notices_sha256: manifest.artifacts['NOTICE.txt'],
    sources: 'sources/',
    installed_at: new Date().toISOString().slice(0, 10),
  };
  catalogue.lines[line] = generationEvidence;
  if (latest || !catalogue.latest || !catalogue.lines[catalogue.latest]) catalogue.latest = line;
  writeCatalogue(root, catalogue);

  return { ...release, line, evidenceHash, generation, artifactPath, catalogue };
}
