// Consume Dojo's build evidence without executing commands from a manifest.
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const digest = /^[a-f0-9]{64}$/;
const insist = (pass, message) => { if (!pass) throw new Error(message); };
const safePath = (name) => {
  insist(typeof name === 'string' && name.length > 0 && !name.includes('\\')
    && name.split('/').every(part => part && part !== '.' && part !== '..') && !name.startsWith('/'), `unsafe release path: ${name}`);
  return name;
};

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
  insist(manifest.artifact === 'paperlang-host' && manifest.format === 'esm', 'not a Dojo host release');
  insist(/^[a-f0-9]{40}$/.test(manifest.commit), 'release must name a full source commit');
  insist(typeof manifest.sourceDirty === 'boolean' && typeof manifest.checkoutDirty === 'boolean', 'release must disclose source dirtiness');
  insist(manifest.sources && Object.keys(manifest.sources).length > 0 && manifest.artifacts, 'release inventories are missing');
  for (const required of ['host.mjs', 'host.meta.json', 'host.mjs.LEGAL.txt', 'LICENSE', 'NOTICE.txt']) {
    insist(digest.test(manifest.artifacts[required] ?? ''), `release is missing ${required}`);
  }
  for (const [name, hash] of Object.entries(manifest.artifacts)) {
    safePath(name);
    insist(['host.mjs', 'host.meta.json', 'host.mjs.LEGAL.txt', 'LICENSE', 'NOTICE.txt'].includes(name) || /^licenses\/[^/]+\.txt$/.test(name), `unexpected artifact: ${name}`);
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
  const meta = JSON.parse(files.get('host.meta.json'));
  const inputs = Object.keys(meta.inputs ?? {}).sort();
  insist(inputs.includes('assets/js/host.js') && inputs.every(name => manifest.sources[name]), 'closure inputs are absent from the source snapshot');
  const banned = ['/hooks/', '/editor/', '/terminal/', '/export/', 'phoenix', 'mediabunny'];
  insist(inputs.every(name => name.startsWith('assets/js/') && !banned.some(word => name.includes(word))), 'host closure includes application machinery');
  const executables = Object.keys(meta.outputs ?? {}).filter(name => /\.(mjs|js)$/.test(name));
  insist(executables.length === 1 && executables[0] === 'host.mjs', 'release is not a single executable module');
  insist((meta.outputs?.['host.mjs']?.imports ?? []).length === 0, 'host module has external executable imports');
  insist(meta.outputs?.['host.mjs']?.exports?.includes('createHatch'), 'release does not export createHatch');
  files.set('release.json', manifestBytes);
  return { manifest, files, inputs, artifactHash: manifest.artifacts['host.mjs'] };
}

export function installHostRelease(directory, root) {
  const release = verifyHostRelease(directory);
  const { manifest, files, inputs, artifactHash } = release;
  const name = `hatch.${artifactHash.slice(0, 16)}.mjs`;
  const library = resolve(root, 'assets/lib/hatch');
  const pinPath = resolve(root, '_data/hatch.yml');
  const staging = library + '-staging';
  const previous = library + '-previous';
  const pin = [
    '# Dojo-produced build, not a tag or a registry publication. Do not edit by hand.',
    '# Written by design/vendor.mjs --from-release; dirty sources remain explicit.',
    'schema: 1', 'release: true', 'producer: paperlang-host', 'host_api: null', 'language_revision: null',
    `dojo_commit: ${manifest.commit}`, `dojo_revision: ${manifest.revision}`,
    `source_dirty: ${manifest.sourceDirty}`, `source_digest: ${manifest.sourceDigest}`,
    `artifact: ${name}`, `artifact_path: /assets/lib/hatch/${name}`,
    `artifact_sha256: ${artifactHash}`, `artifact_bytes: ${files.get('host.mjs').length}`,
    `closure_inputs: ${inputs.length}`, `closure_sha256: ${sha(inputs.join('\n'))}`,
    'licence: LICENSE', 'licence_id: AGPL-3.0-only', `licence_sha256: ${manifest.artifacts.LICENSE}`,
    'notices: NOTICE.txt', `notices_sha256: ${manifest.artifacts['NOTICE.txt']}`,
    'release_manifest: release.json', `release_manifest_sha256: ${sha(files.get('release.json'))}`,
    `vendored_at: ${new Date().toISOString().slice(0, 10)}`, '',
  ].join('\n');
  mkdirSync(dirname(library), { recursive: true });
  mkdirSync(dirname(pinPath), { recursive: true });
  rmSync(staging, { force: true, recursive: true });
  rmSync(previous, { force: true, recursive: true });
  try {
    for (const [path, bytes] of files) {
      const destination = join(staging, path === 'host.mjs' ? name : path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, bytes);
    }
    writeFileSync(pinPath + '.next', pin);
    if (existsSync(library)) renameSync(library, previous);
    try {
      renameSync(staging, library);
      renameSync(pinPath + '.next', pinPath);
    } catch (error) {
      rmSync(library, { force: true, recursive: true });
      if (existsSync(previous)) renameSync(previous, library);
      throw error;
    }
    rmSync(previous, { force: true, recursive: true });
  } finally {
    rmSync(staging, { force: true, recursive: true });
    rmSync(pinPath + '.next', { force: true });
  }
  return { ...release, name, pin };
}
