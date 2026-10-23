#!/usr/bin/env node
/*
  perf-serve.mjs — the server Lighthouse CI talks to.

  It serves the built _site with the two things the production host does and a
  naive `python -m http.server` does not: gzip/brotli for text, and single byte
  ranges for video. Without ranges Chromium reports a video as unseekable and
  silently measures frame zero; without compression every CSS/font budget is
  wrong. No cache, so each audit run is cold.

  usage: node design/probe/perf-serve.mjs [root] [port]
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.argv[2] || '_site');
const port = Number(process.argv[3] || 8080);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

function resolve(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const full = path.resolve(root, '.' + p);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  if (fs.existsSync(full + '.html')) return full + '.html';
  if (fs.existsSync(path.join(full, 'index.html'))) return path.join(full, 'index.html');
  return null;
}

http.createServer((req, res) => {
  const file = resolve(req.url || '/');
  if (!file) {
    res.writeHead(404);
    return res.end('not found');
  }
  const stat = fs.statSync(file);
  const type = types[path.extname(file)] || 'application/octet-stream';
  const compressible = /text|javascript|json|xml|svg|manifest/.test(type);
  const accepts = req.headers['accept-encoding'] || '';
  const range = req.headers.range;
  const headers = {
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  };
  let status = 200;
  let stream;

  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [left, right] = range.replace('bytes=', '').split('-');
    const start = left ? Number(left) : stat.size - Number(right);
    const end = left && right ? Math.min(Number(right), stat.size - 1) : stat.size - 1;
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      return res.end();
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    headers['Content-Length'] = String(end - start + 1);
    stream = fs.createReadStream(file, { start, end });
  } else if (compressible && /\bbr\b/.test(accepts)) {
    headers['Content-Encoding'] = 'br';
    headers['Vary'] = 'Accept-Encoding';
    stream = fs.createReadStream(file).pipe(zlib.createBrotliCompress({
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 },
    }));
  } else if (compressible && /\bgzip\b/.test(accepts)) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    stream = fs.createReadStream(file).pipe(zlib.createGzip({ level: 9 }));
  } else {
    headers['Content-Length'] = String(stat.size);
    stream = fs.createReadStream(file);
  }

  if (req.method === 'HEAD') {
    res.writeHead(status, headers);
    return res.end();
  }
  res.writeHead(status, headers);
  stream.pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`perf-serve: serving ${root} on http://127.0.0.1:${port}`);
});
