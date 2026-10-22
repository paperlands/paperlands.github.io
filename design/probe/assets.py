#!/usr/bin/env python3
"""Assert every asset referenced by the built stylesheet actually exists.

The third assertion, and the one with the most embarrassing origin: the
`@font-face` for paperLang was silently lost when `assets/css/app.css` was
rewritten as the import-based entry. The font had been declared in the old v3
entry; the rewrite replaced the whole file; `font-paperlang` — used 43 times —
quietly fell back to Lora.

Nothing caught it. `coverage.py` verifies that classes resolve to selectors and
`surfaces.py` verifies that routes are classified, but neither looks at whether
the *assets a stylesheet names* exist. A missing stylesheet is loud; a missing
font is a silent downgrade to a fallback that looks deliberate.

    python3 design/probe/assets.py [--site _site]

Exit 1 on any url() in the built stylesheet that does not resolve to a file
under the built site.
"""
import os
import re
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Fragments and data URIs are not file references.
SKIP = ("data:", "#", "http://", "https://", "//")


URL_RE = re.compile(r"url\(", re.IGNORECASE)


def url_values(css):
    """Yield (value, offset) for every url() token, quoted values kept whole.

    A quoted url() is atomic: everything up to the closing quote is part of it,
    including any ')' or nested url(...) inside. A scan that stops at the first
    quote or paren splits that value and then reports the fragment as a missing
    file — a false report about the *stylesheet*, produced by the scanner.
    That is exactly how a quoted SVG data URI carrying filter='url(%23n)' was
    once read as a reference to a file named `%23n`.

    Advancing past the whole token (rather than past just `url(`) is what stops
    a nested url() inside a data URI from being visited at all."""
    i, n = 0, len(css)
    while True:
        m = URL_RE.search(css, i)
        if not m:
            return
        j = m.end()
        while j < n and css[j] in " \t\r\n":
            j += 1
        if j < n and css[j] in "\"'":
            close = css.find(css[j], j + 1)
            if close == -1:
                return
            yield css[j + 1:close], m.start()
            i = close + 1
            continue
        close = css.find(")", j)
        if close == -1:
            return
        yield css[j:close].strip(), m.start()
        i = close + 1


def main():
    site = "_site"
    if "--site" in sys.argv:
        site = sys.argv[sys.argv.index("--site") + 1]
    site = os.path.join(ROOT, site) if not os.path.isabs(site) else site

    css_dir = os.path.join(site, "assets", "css")
    # Every built stylesheet, not just the shared entry: the mode sheets carry
    # the grain tile and the poster urls their own surface paints, and a missing
    # one is exactly as silent as a missing font was.
    css_paths = sorted(
        os.path.join(css_dir, f) for f in os.listdir(css_dir) if f.endswith(".css")
    )
    if not css_paths:
        sys.exit(f"no built stylesheet under {css_dir} — run `bundle exec jekyll build` first")

    refs = {}                       # (stylesheet, url) -> the declaration it appears in
    sheets = []
    for css_path in css_paths:
        sheets.append((os.path.basename(css_path), os.path.getsize(css_path)))
        css = open(css_path, encoding="utf-8").read()
        for url, at in url_values(css):
            url = url.strip()
            if not url or any(url.startswith(s) for s in SKIP):
                continue
            # a little context so a failure says what it was for
            start = css.rfind("}", 0, at)
            ctx = css[start + 1: at].strip().split("{")[0][:60]
            refs.setdefault((css_path, url), ctx)

    missing = []
    for (css_path, url), ctx in sorted(refs.items()):
        path = urllib.parse.unquote(url.split("?")[0].split("#")[0])
        if path.startswith("/"):
            full = os.path.join(site, path.lstrip("/"))
        else:
            full = os.path.join(os.path.dirname(css_path), path)
        if not os.path.isfile(full):
            missing.append((os.path.basename(css_path), url, ctx))
    for name, size in sheets:
        print(f"stylesheet                         : {name} ({size} bytes)")
    print(f"url() references in them           : {len(refs)}")
    print(f"unresolvable                       : {len(missing)}")
    for sheet, url, ctx in missing:
        print(f"   {sheet}: {url}\n       from: {ctx}")

    if missing:
        print("\nasset references BROKEN")
        return 1
    print("asset references hold")
    return 0


if __name__ == "__main__":
    sys.exit(main())
