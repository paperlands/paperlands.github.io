#!/usr/bin/env python3
"""Fetch the families this site actually asks Google Fonts for, keep the LATIN
subset of each face, and write the @font-face sheet that serves them locally.

The browser only ever downloaded the latin subset, so nothing is lost: what
changes is who serves it. Google's CSS was a render-blocking request to
fonts.googleapis.com (a different origin: DNS + TLS + request before first
paint), and the font files themselves then came from fonts.gstatic.com.

usage: webfonts.py assets/fonts assets/css/core/webfonts.css

Weights that Google serves from byte-identical files are written once: the
sheet points every alias at that one URL, and stale duplicate files are removed.
Two URLs for one face is a second download the browser cannot deduplicate.
"""
import hashlib, os, re, sys, urllib.request

UA = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/153.0.0.0 Safari/537.36')

# Exactly the two query strings the site used (see _includes/head.html).
SHEETS = [
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600'
    '&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600'
    '&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap',
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500'
    '&family=Lora:ital,wght@0,300;0,400;1,400&display=swap',
]

FACE = re.compile(
    r'/\*\s*(?P<subset>[a-z0-9-]+)\s*\*/\s*@font-face\s*\{(?P<body>[^}]*)\}', re.S)


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=30).read()


def field(body, name):
    m = re.search(r"%s:\s*([^;]+);" % name, body)
    return m.group(1).strip().strip("'\"") if m else None


def main():
    font_dir, css_path = sys.argv[1], sys.argv[2]
    os.makedirs(font_dir, exist_ok=True)
    faces, seen, by_digest = [], set(), {}
    for sheet in SHEETS:
        css = get(sheet).decode('utf-8')
        for m in FACE.finditer(css):
            if m.group('subset') != 'latin':
                continue
            body = m.group('body')
            family, style, weight = field(body, 'font-family'), field(body, 'font-style'), field(body, 'font-weight')
            url = re.search(r"url\((https://[^)]+\.woff2)\)", body)
            if not (family and url):
                continue
            key = (family, style, weight)
            if key in seen:
                continue
            seen.add(key)
            slug = '%s-%s-%s.woff2' % (
                family.lower().replace(' ', '-'), weight,
                'italic' if style == 'italic' else 'normal')
            data = get(url.group(1))
            digest = hashlib.sha256(data).hexdigest()
            # Google serves some weights from the SAME bytes. A second copy is a
            # second URL, so the browser downloads it again even though it is the
            # same face. Keep one file and point every alias at it.
            if digest in by_digest:
                alias = by_digest[digest]
                print('%-34s %7d bytes  %s %s %s  (alias of %s)' % (
                    slug, len(data), family, style, weight, alias))
                slug = alias
            else:
                with open(os.path.join(font_dir, slug), 'wb') as fh:
                    fh.write(data)
                by_digest[digest] = slug
                print('%-34s %7d bytes  %s %s %s' % (slug, len(data), family, style, weight))
            faces.append({'family': family, 'style': style, 'weight': weight,
                          'slug': slug, 'bytes': len(data),
                          'source': url.group(1),
                          'unicode': field(body, 'unicode-range')})
    with open(css_path, 'w') as fh:
        fh.write(HEAD)
        for f in faces:
            fh.write('\n@font-face {\n  font-family: "%s";\n  font-style: %s;\n'
                     '  font-weight: %s;\n  font-display: swap;\n'
                     '  src: url("/assets/fonts/%s") format("woff2");\n'
                     % (f['family'], f['style'], f['weight'], f['slug']))
            if f['unicode']:
                fh.write('  unicode-range: %s;\n' % f['unicode'])
            fh.write('}\n')
    print('\n%d faces -> %s' % (len(faces), css_path))
    referenced = {f['slug'] for f in faces}
    generated = re.compile(
        r'^(?:cinzel|cormorant-garamond|eb-garamond|ibm-plex-mono|lora)-\d+-(?:normal|italic)\.woff2$')
    for name in sorted(os.listdir(font_dir)):
        if generated.match(name) and name not in referenced:
            os.remove(os.path.join(font_dir, name))
            print('removed stale %s' % name)


HEAD = '''/* ==========================================================================
   core/webfonts.css — the families the type roles name, served from here
   --------------------------------------------------------------------------
   GENERATED, but not at build time: these are the LATIN subsets of the exact
   faces _includes/head.html used to request from Google Fonts, downloaded once
   and committed the way the paperLang face already is. Re-run the fetch (see
   assets/fonts/README.md) when a weight is added, never by hand.

   WHY THEY ARE HERE. The type roles in core/tokens.css name Cinzel, Cormorant
   Garamond, EB Garamond, IBM Plex Mono and Lora, and every one of them arrived
   through a <link> to fonts.googleapis.com — a render-blocking stylesheet on a
   THIRD origin. Lighthouse measured it at 810ms of blocked first paint on a
   throttled connection before a single glyph was asked for: DNS, TLS, and a
   round trip to Google to be told what a font URL is, then a second origin for
   the file. Nothing about that is cacheable next to the CSS it blocks.

   The files are latin-subset only, which is what the browser was downloading
   anyway — the other subsets in Google's sheet were declared and never
   fetched. A glyph outside latin falls through to the stack in
   core/tokens.css, exactly as it did before.
   A WEIGHT ALIAS IS NOT A FILE. Some weights (EB Garamond 400/500,
   Cormorant Garamond 500/600, Cinzel 400/600) are byte-identical upstream.
   The generator writes one file and points every @font-face at it: two URLs
   would be two downloads for one face. Re-running the generator also removes
   the stale duplicate files, so the sheet and the directory cannot drift.
   ========================================================================== */
'''
if __name__ == '__main__':
    main()
