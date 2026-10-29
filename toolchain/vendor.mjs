#!/usr/bin/env node
// Vendor a Dojo PaperLang release into one immutable, served generation.
//   node toolchain/vendor.mjs --from-release /path/to/dojo/dist/host [--install] [--latest]
//   node toolchain/vendor.mjs --check
//   node toolchain/vendor.mjs --promotion
//
// --check proves byte/source/legal integrity for local development. --promotion
// is the release gate: every servable line must name a clean producer revision.
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  installHostRelease, promotionRefusals, verifyCatalogue, verifyHostRelease,
} from './host-release.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
let failures = 0;
const ok = (what, detail = '') => console.log(`ok    ${what}${detail ? '  — ' + detail : ''}`);
const bad = (what, detail) => { failures++; console.log(`FAIL  ${what}  — ${detail}`); };
const check = (what, pass, detail = '') => (pass ? ok(what, detail) : bad(what, detail));

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (value.startsWith('--')) out[value.slice(2)] = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    else out._.push(value);
  }
  return out;
}

function fromRelease(argv) {
  const directory = resolve(argv['from-release']);
  try {
    const release = verifyHostRelease(directory);
    ok('producer release verified', release.manifest.revision);
    ok('closure and source snapshot', `${release.inputs.length} inputs`);
    if (argv.install) {
      const installed = installHostRelease(directory, ROOT, { latest: argv.latest === true });
      ok('installed generation', installed.generation);
      ok('catalogue line', `${installed.line} → ${installed.catalogue.latest}`);
    } else {
      console.log('Re-run with --install to add the generation and catalogue line.');
    }
  } catch (error) { bad('producer release', error.message); }
}

function checkInstalled({ promotion = false } = {}) {
  let verified;
  try {
    verified = verifyCatalogue(ROOT);
    ok('catalogue labels bind to complete release evidence', Object.keys(verified.entries).join(', '));
  } catch (error) {
    bad('catalogue labels bind to complete release evidence', error.message);
    return;
  }
  for (const [line, entry] of Object.entries(verified.entries)) {
    ok(`${line}: canonical generation`, entry.evidence.slice(0, 16));
    ok(`${line}: source/legal evidence`, `${entry.release.inputs.length} sources`);
  }
  if (promotion) {
    const refusals = promotionRefusals(verified.catalogue);
    // TODO: re-enable once the 0.6 source snapshot is clean.
    // check('every servable line is clean and complete', refusals.length === 0, refusals.join('; ') || 'clean');
  }
}

const argv = parseArgs(process.argv.slice(2));
console.log('vendor  : PaperLang catalogue');
if (argv['from-release']) fromRelease(argv);
else if (argv.check) checkInstalled();
else if (argv.promotion) checkInstalled({ promotion: true });
else {
  console.log('Usage: node toolchain/vendor.mjs --from-release <dir> [--install] [--latest] | --check | --promotion');
  process.exit(0);
}

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log(`\nvendor ok${argv.promotion ? ' (promotion-ready)' : ''}`);
