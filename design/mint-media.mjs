#!/usr/bin/env node
/*
  mint-media.mjs — the repeatable front door for page media.

  A clip is not "a file someone encoded once". It is a catalog entry with a
  desktop rendition, an optional phone-portrait rendition, a still, and
  content-hashed names. Doing that by hand is how a 1920x1080 / 257KB clip ends
  up in a 412x777 box. This script mints the whole set in one command and writes
  the catalog fields the player already reads.

  VIDEO
    node design/mint-media.mjs video \
      --id tree_fractal \
      --source design/assets/HOWSTAR.mp4 \
      --compact 572x1080 \
      --catalog _data/media.yml

    Outputs, content-hashed:
      <id>-<hash>.mp4              H.264, faststart, silent, desktop
      <id>-<hash>.av1.mp4          AV1 sibling, same dimensions
      <id>-<hash>.webp             still (the page before motion)
      <id>-<hash>-compact.mp4      H.264, 572x1080 cover crop
      <id>-<hash>-compact.av1.mp4  AV1 sibling of the compact

    `--compact-only` adds the phone rendition without re-encoding the desktop
    pair. `--dry-run` prints the ffmpeg work without writing anything.

  STILLS

    Not this script. Widths live in _data/image_sources.yml. The Jekyll build
    emits the rungs (design/image-variants.mjs). `image` fails on purpose, so
    a resized WebP is not committed by habit.

  VERIFY
    node design/mint-media.mjs verify

    Fails if a catalog path is missing, an image recipe source is missing, a
    compact video lacks its box dimensions, or two byte-identical .woff2 files
    are committed.

  The two-rung video ladder is deliberate: desktop fidelity and the phone
  portrait the reader actually holds. It is not a device matrix. See
  design/media.org, "Minting".
*/
import { recipeReport } from './image-variants.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync,
  statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = '_data/media.yml';

function fail(message) {
  console.error('mint-media: ' + message);
  process.exit(1);
}

function say(...parts) {
  console.log(parts.join(' '));
}

function abs(file) {
  return path.isAbsolute(file) ? file : path.join(ROOT, file);
}

function publicFile(file) {
  return path.join(ROOT, String(file).replace(/^\/+/, ''));
}

function sitePath(file) {
  const rel = path.relative(ROOT, path.resolve(file)).split(path.sep).join('/');
  if (rel.startsWith('..')) fail('output must live inside the repository: ' + file);
  return '/' + rel;
}

function parseFlags(tokens) {
  const flags = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith('--')) fail('unexpected argument: ' + token);
    const key = token.slice(2);
    const next = tokens[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

function run(command, args) {
  const env = command === 'ffmpeg' ? { ...process.env, SVT_LOG: '1' } : process.env;
  execFileSync(command, args, { stdio: 'inherit', env });
}

function probeVideo(file) {
  if (!existsSync(file)) fail('source video does not exist: ' + file);
  const raw = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,duration:format=duration',
    '-of', 'json', file,
  ], { encoding: 'utf8' });
  const info = JSON.parse(raw);
  const stream = info.streams && info.streams[0];
  if (!stream) fail('no video stream in ' + file);
  const duration = Number(stream.duration || (info.format && info.format.duration) || 0);
  return { width: stream.width, height: stream.height, duration };
}


function sha8(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
}

function box(value, label) {
  const match = /^(\d+)x(\d+)$/.exec(String(value || ''));
  if (!match) fail(label + ' must be WIDTHxHEIGHT, got: ' + value);
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 2 || height < 2 || width % 2 || height % 2) {
    fail(label + ' must be even and at least 2x2, got: ' + value);
  }
  return { width, height };
}

function scaleFilter(maxWidth) {
  return 'scale=trunc(min(' + maxWidth + ',iw)/2)*2:-2';
}

function compactFilter(width, height, fit) {
  if (fit === 'contain') {
    return 'scale=' + width + ':' + height + ':force_original_aspect_ratio=decrease,' +
      'pad=' + width + ':' + height + ':(ow-iw)/2:(oh-ih)/2:color=black';
  }
  return 'scale=' + width + ':' + height + ':force_original_aspect_ratio=increase,' +
    'crop=' + width + ':' + height;
}

function h264Args(crf, filter) {
  return [
    '-vf', filter,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf),
    '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', '-sn', '-dn', '-map_metadata', '-1',
  ];
}

function av1Args(crf, preset, filter) {
  return [
    '-vf', filter,
    '-c:v', 'libsvtav1', '-preset', String(preset), '-crf', String(crf),
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-an', '-sn', '-dn', '-map_metadata', '-1',
  ];
}

function ffmpeg(input, output, args, dry) {
  const argv = ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, ...args, output];
  if (dry) {
    say('  ffmpeg ' + argv.map(part => /\s/.test(part) ? JSON.stringify(part) : part).join(' '));
    return;
  }
  run('ffmpeg', argv);
}

function ffmpegPoster(input, output, at, width, dry) {
  const argv = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', String(at), '-i', input,
    '-frames:v', '1', '-vf', "scale='min(" + width + ",iw)':-2", '-an', output,
  ];
  if (dry) {
    say('  ffmpeg ' + argv.map(part => /\s/.test(part) ? JSON.stringify(part) : part).join(' '));
    return;
  }
  run('ffmpeg', argv);
}

function tempDir(dest) {
  const dir = path.join(dest, '.mint-' + process.pid);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function finalize(tmp, dest, id, suffix, dry) {
  if (dry) return { path: path.join(dest, id + '-<hash>' + suffix), bytes: 0, hash: '<hash>' };
  const hash = sha8(tmp);
  const name = id + '-' + hash + suffix;
  const out = path.join(dest, name);
  if (existsSync(out)) {
    unlinkSync(tmp);
  } else {
    renameSync(tmp, out);
  }
  return { path: out, name, bytes: statSync(out).size, hash };
}

function lineValue(line) {
  return line.replace(/^\s*[a-z0-9_]+:\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^['"]|['"]$/g, '');
}

function catalogUpdate(file, id, fields) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  const start = lines.findIndex(line => new RegExp('^' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':').test(line));
  if (start === -1) {
    lines.push('', id + ':');
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) lines.push('  ' + key + ': ' + value);
    }
    writeFileSync(file, lines.join('\n'));
    return;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i]) && !/^#/.test(lines[i])) { end = i; break; }
  }
  const pending = new Map(Object.entries(fields).filter(([, value]) => value !== undefined));
  const kept = [];
  let lastField = 0;
  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    const match = /^(\s+)([a-z0-9_]+):\s*(.*)$/.exec(line);
    if (match && pending.has(match[2])) {
      const value = pending.get(match[2]);
      if (value === null) continue;
      kept.push('  ' + match[2] + ': ' + value);
      pending.delete(match[2]);
      lastField = kept.length - 1;
    } else {
      kept.push(line);
      if (match) lastField = kept.length - 1;
    }
  }
  const insert = [...pending.entries()].map(([key, value]) => '  ' + key + ': ' + value);
  kept.splice(lastField + 1, 0, ...insert);
  lines.splice(start, end - start, ...kept);
  writeFileSync(file, lines.join('\n'));
}

function mintVideo(flags) {
  const id = String(flags.id || '');
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) fail('--id is required and must be a slug, got: ' + id);
  const source = abs(flags.source || '');
  if (!flags.source) fail('--source is required');
  const dest = abs(flags.dest || 'assets/lib/helios');
  const dry = Boolean(flags['dry-run']);
  const compactOnly = Boolean(flags['compact-only']);
  if (compactOnly && !flags.compact) fail('--compact-only needs --compact WIDTHxHEIGHT');
  if (compactOnly && flags.catalog) {
    const catalogText = readFileSync(abs(flags.catalog), 'utf8');
    const entry = new RegExp('^' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':', 'm');
    if (!entry.test(catalogText)) fail('--compact-only needs an existing catalog entry for ' + id);
  }
  const maxWidth = Number(flags['max-width'] || 1920);
  const h264Crf = Number(flags.crf || 28);
  const av1Crf = Number(flags['av1-crf'] || 38);
  const av1Preset = Number(flags['av1-preset'] || 8);
  const posterAt = Number(flags['poster-at'] || 0);
  const posterQuality = Number(flags['poster-quality'] || 78);
  const posterWidth = Number(flags['poster-width'] || 1280);
  const compact = flags.compact ? box(flags.compact, '--compact') : null;
  const compactFit = flags['compact-fit'] || 'cover';
  if (!existsSync(dest)) {
    if (dry) say('mkdir -p ' + path.relative(ROOT, dest));
    else mkdirSync(dest, { recursive: true });
  }

  const sourceInfo = probeVideo(source);
  say('source   ' + path.relative(ROOT, source) + '  ' + sourceInfo.width + 'x' + sourceInfo.height +
    '  ' + sourceInfo.duration.toFixed(2) + 's');
  const tmp = dry ? path.join(dest, '.mint-dry') : tempDir(dest);
  if (!dry) mkdirSync(tmp, { recursive: true });
  const fields = {};

  try {
    if (!compactOnly) {
      const desktopFilter = sourceInfo.width > maxWidth ? scaleFilter(maxWidth) : 'null';
      const h264Tmp = path.join(tmp, id + '.mp4');
      ffmpeg(source, h264Tmp, h264Args(h264Crf, desktopFilter), dry);
      const h264 = finalize(h264Tmp, dest, id, '.mp4', dry);
      say('h264     ' + path.relative(ROOT, h264.path) + '  ' + h264.bytes + ' bytes');
      fields.src = sitePath(h264.path);

      if (!flags['no-av1']) {
        const av1Tmp = path.join(tmp, id + '.av1.mp4');
        ffmpeg(source, av1Tmp, av1Args(av1Crf, av1Preset, desktopFilter), dry);
        const av1 = finalize(av1Tmp, dest, id, '.av1.mp4', dry);
        say('av1      ' + path.relative(ROOT, av1.path) + '  ' + av1.bytes + ' bytes');
        fields.av1 = sitePath(av1.path);
      } else if (!compactOnly) {
        fields.av1 = null;
      }

      if (flags.poster !== 'false') {
        const pngTmp = path.join(tmp, id + '.png');
        ffmpegPoster(source, pngTmp, posterAt, posterWidth, dry);
        const webpTmp = path.join(tmp, id + '.webp');
        if (dry) {
          say('  magick ' + pngTmp + ' -strip -quality ' + posterQuality + ' ' + webpTmp);
        } else {
          run('magick', [pngTmp, '-strip', '-quality', String(posterQuality), '-define', 'webp:method=6', webpTmp]);
        }
        const poster = finalize(webpTmp, dest, id, '.webp', dry);
        say('poster   ' + path.relative(ROOT, poster.path) + '  ' + poster.bytes + ' bytes');
        fields.poster = sitePath(poster.path);
      }
    }

    if (compact) {
      const filter = compactFilter(compact.width, compact.height, compactFit);
      const compactTmp = path.join(tmp, id + '-compact.mp4');
      ffmpeg(source, compactTmp, h264Args(Number(flags['compact-crf'] || 28), filter), dry);
      const compactH264 = finalize(compactTmp, dest, id, '-compact.mp4', dry);
      say('compact  ' + path.relative(ROOT, compactH264.path) + '  ' + compactH264.bytes + ' bytes');
      fields.compact_src = sitePath(compactH264.path);
      fields.compact_width = compact.width;
      fields.compact_height = compact.height;

      if (!flags['no-av1']) {
        const compactAv1Tmp = path.join(tmp, id + '-compact.av1.mp4');
        ffmpeg(source, compactAv1Tmp, av1Args(Number(flags['compact-av1-crf'] || 42), av1Preset, filter), dry);
        const compactAv1 = finalize(compactAv1Tmp, dest, id, '-compact.av1.mp4', dry);
        say('compact  ' + path.relative(ROOT, compactAv1.path) + '  ' + compactAv1.bytes + ' bytes');
        fields.compact_av1 = sitePath(compactAv1.path);
      } else {
        fields.compact_av1 = null;
      }
    }

    if (flags.catalog) {
      const catalog = abs(flags.catalog);
      if (!existsSync(catalog)) fail('catalog does not exist: ' + catalog);
      if (dry) {
        say('catalog  ' + path.relative(ROOT, catalog) + ' (not written in --dry-run)');
        for (const [key, value] of Object.entries(fields)) say('  ' + key + ': ' + value);
      } else {
        catalogUpdate(catalog, id, fields);
        say('catalog  ' + path.relative(ROOT, catalog) + '  ' + id + ' updated');
      }
    } else {
      say('\nYAML (paste into ' + CATALOG + ', or pass --catalog):');
      say(id + ':');
      for (const [key, value] of Object.entries(fields)) say('  ' + key + ': ' + value);
    }
  } finally {
    if (!dry) rmSync(tmp, { recursive: true, force: true });
  }
}


function verify() {
  const errors = [];
  const catalog = abs(CATALOG);
  const lines = readFileSync(catalog, 'utf8').split('\n');
  let entries = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\S[^:]*:/.test(line)) entries += 1;
    const match = /^\s+(src|av1|webm|poster|compact_src|compact_av1|compact_webm):\s*(\S+)/.exec(line);
    if (!match) continue;
    const value = lineValue(line);
    if (!value || value.includes('://') || value.startsWith('//')) continue;
    const candidate = publicFile(value);
    if (!existsSync(candidate)) errors.push(CATALOG + ': missing ' + value);
  }
  // Compact fields are a pair: a rendition without a box cannot reserve layout.
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s+compact_src:/.test(lines[i])) continue;
    let width = false;
    let height = false;
    for (let j = i + 1; j < lines.length && /^\s/.test(lines[j]); j += 1) {
      if (/^\s+compact_width:/.test(lines[j])) width = true;
      if (/^\s+compact_height:/.test(lines[j])) height = true;
    }
    if (!width || !height) errors.push(CATALOG + ': compact_src without compact_width/height near line ' + (i + 1));
  }

  for (const problem of recipeReport(ROOT)) errors.push(problem);

  const fontDir = abs('assets/fonts');
  const byHash = new Map();
  for (const name of readdirSync(fontDir)) {
    if (!name.endsWith('.woff2')) continue;
    const file = path.join(fontDir, name);
    const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
    if (!byHash.has(digest)) byHash.set(digest, []);
    byHash.get(digest).push(name);
  }
  for (const names of byHash.values()) {
    if (names.length > 1) {
      errors.push('assets/fonts: byte-identical faces ' + names.join(', ') +
        ' — point both @font-face rules at one URL');
    }
  }

  if (errors.length) {
    for (const error of errors) console.error('verify: ' + error);
    process.exit(1);
  }
  say('verify: ' + entries + ' catalog entries, ' +
    [...byHash.keys()].length + ' distinct font files');
}

const [command, ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);
if (command === 'video') mintVideo(flags);
else if (command === 'image') fail('stills are not minted. Add the source and its widths to _data/image_sources.yml; the Jekyll build emits the rungs.');
else if (command === 'verify') verify();
else {
  console.error('usage: node design/mint-media.mjs video|verify [flags]');
  console.error('see the header of design/mint-media.mjs and design/media.org');
  process.exit(1);
}
