#!/usr/bin/env python3
"""Assert the pinned hatch is the hatch the site actually imports.

design/hatch.org G2 says the site imports only a same-origin, content-addressed
copy, and that the pin is one machine-readable file. toolchain/vendor.mjs *writes*
that state; this file *checks* it, with its own code, because a writer that
verifies itself proves only that it is self-consistent.

    python3 design/probe/hatch.py [--site _site]

Checks, in order:

  1. _data/hatch.yml parses and carries the schema this repo knows;
  2. the artifact it names exists, and its sha256 and byte count match the pin;
  3. the licence and notices files beside it exist and match their hashes;
  4. exactly one executable JS artifact is installed (a second chunk is how a
     release silently becomes multi-file);
  5. the BUILT page imports the pin's artifact path — pin → template → HTML,
     end to end — and imports no other module under assets/lib/hatch.

What it does not check: provenance. It cannot tell whether those bytes came from
the dojo commit the pin names, whether a manifest beside its own artifact is
authentic, or whether the release is licensed correctly. Those are G1's
questions and a human's judgement.

Exit 1 on any failure.
"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LIB = os.path.join(ROOT, "assets/lib/hatch")
PIN = os.path.join(ROOT, "_data/hatch.yml")
PAGE_ROUTE = "/index"
SCHEMA = 1


def parse_pin(path):
    pin = {}
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or ":" not in line:
                continue
            key, value = line.split(":", 1)
            pin[key.strip()] = value.strip().strip('"')
    return pin


# What drifts is not the bytes but the *reference* to them. A source file that names the artifact
# path as a literal is a second declaration of the pin, and it goes stale silently the next time
# the artifact is re-vendored — content addressing does not help a path that names an old hash.
# Every page reaches the pin through the build's template (`site.data.hatch.artifact_path`) or
# through `assets/js/home/fourth-turn/hatch.mjs`, so no source file needs the literal at all.
# Generated output (`_site`, the caches, a tool run's recorded sheets) is not scanned: it is a
# record of a run, not a declaration.
SOURCE_SUFFIXES = (".html", ".mjs", ".js")
SKIP_DIRS = {".git", "_site", ".jekyll-cache", "node_modules", ".venv"}
SKIP_PATHS = {"design/rapiditer/sheets"}
ARTIFACT_LITERAL = re.compile(r"/assets/lib/hatch/[\w.\-]+\.(?:mjs|js)")


def artifact_literals(root, lib):
    lib = os.path.abspath(lib)
    hits = []
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        if os.path.abspath(base).startswith(lib):
            continue
        for name in files:
            if not name.endswith(SOURCE_SUFFIXES):
                continue
            path = os.path.join(base, name)
            relative = os.path.relpath(path, root)
            if any(relative.startswith(skip) for skip in SKIP_PATHS):
                continue
            try:
                text = open(path, encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            for number, line in enumerate(text.splitlines(), 1):
                if ARTIFACT_LITERAL.search(line):
                    hits.append(f"{relative}:{number}")
    return hits


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()

def check_release(pin, check):
    manifest_path = os.path.join(LIB, 'release.json')
    check('producer manifest present + hash', os.path.isfile(manifest_path)
          and sha256(manifest_path) == pin.get('release_manifest_sha256'))
    if not os.path.isfile(manifest_path):
        return
    try:
        with open(manifest_path) as fh:
            manifest = json.load(fh)
        check('producer identity', manifest.get('artifact') == 'paperlang-host' and manifest.get('format') == 'esm')
        sources = manifest['sources']
        source_digest = hashlib.sha256(json.dumps(sources, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()
        check('source inventory digest', source_digest == manifest.get('sourceDigest') == pin.get('source_digest'))
        revision = manifest['commit'] + ('-dirty+' + source_digest[:12] if manifest['sourceDirty'] else '')
        check('honest source revision', revision == manifest.get('revision') == pin.get('dojo_revision')
              and manifest['commit'] == pin.get('dojo_commit')
              and str(manifest['sourceDirty']).lower() == pin.get('source_dirty'))
        for inventory, prefix in ((manifest['artifacts'], ''), (sources, 'sources/')):
            for name, expected in inventory.items():
                relative = pin['artifact'] if name == 'host.mjs' and not prefix else prefix + name
                path = os.path.realpath(os.path.join(LIB, relative))
                inside = path.startswith(os.path.realpath(LIB) + os.sep) and '..' not in relative.split('/')
                check('release input ' + relative, inside and os.path.isfile(path) and sha256(path) == expected)
        with open(os.path.join(LIB, 'host.meta.json')) as fh:
            meta = json.load(fh)
        inputs = sorted(meta['inputs'])
        closure_digest = hashlib.sha256('\n'.join(inputs).encode()).hexdigest()
        check('closure matches pin + snapshot', str(len(inputs)) == pin.get('closure_inputs')
              and closure_digest == pin.get('closure_sha256') and all(name in sources for name in inputs))
        check('host factory exported', 'createHatch' in meta['outputs']['host.mjs']['exports'])
    except (OSError, ValueError, KeyError, TypeError) as error:
        check('producer evidence parses', False, str(error))



def main():
    site = "_site"
    if "--site" in sys.argv:
        site = sys.argv[sys.argv.index("--site") + 1]

    failures = []

    def check(what, passed, detail=""):
        print(f"  {'ok  ' if passed else 'FAIL'} {what}" + (f"  — {detail}" if detail else ""))
        if not passed:
            failures.append(what)

    check("pin exists", os.path.isfile(PIN), os.path.relpath(PIN, ROOT))
    if not os.path.isfile(PIN):
        return finish(failures)
    pin = parse_pin(PIN)
    check("pin schema", str(pin.get("schema")) == str(SCHEMA), f"schema={pin.get('schema')}")
    for field in ("artifact", "artifact_path", "artifact_sha256", "artifact_bytes",
                  "dojo_commit", "release"):
        check(f"pin names {field}", bool(pin.get(field)), str(pin.get(field, ""))[:48])

    artifact = os.path.join(LIB, pin.get("artifact", ""))
    check("artifact present", os.path.isfile(artifact), pin.get("artifact", ""))
    if os.path.isfile(artifact):
        check("artifact sha256 matches pin", sha256(artifact) == pin.get("artifact_sha256"),
              sha256(artifact)[:16])
        check("artifact bytes match pin", str(os.path.getsize(artifact)) == pin.get("artifact_bytes"),
              str(os.path.getsize(artifact)))

    licence = os.path.join(LIB, pin.get("licence", "LICENSE"))
    notices = os.path.join(LIB, pin.get("notices", "THIRD_PARTY_NOTICES.txt"))
    check("licence present + hash", os.path.isfile(licence)
          and sha256(licence) == pin.get("licence_sha256"), pin.get("licence_id", ""))
    check("notices present + hash", os.path.isfile(notices)
          and sha256(notices) == pin.get("notices_sha256"), pin.get("notices", ""))

    installed = sorted(f for f in os.listdir(LIB) if re.search(r"\.(mjs|js)$", f)) if os.path.isdir(LIB) else []
    check("exactly one executable artifact installed", len(installed) == 1, ", ".join(installed))

    if pin.get('producer') == 'paperlang-host':
        check_release(pin, check)
        # The page imports the artifact itself; there is no native frame page.

    page = os.path.join(ROOT, site, PAGE_ROUTE.strip("/") + ".html")
    if not os.path.isfile(page):
        check("built page present", False, f"{site}{PAGE_ROUTE} — run jekyll build")
    else:
        html = open(page).read()
        check("built page imports the pinned artifact",
              pin.get("artifact_path", "\0") in html, pin.get("artifact_path", ""))
        imported = set(re.findall(r'/assets/lib/hatch/([\w.\-]+\.mjs)', html))
        check("built page imports nothing else from the hatch dir",
              imported <= {pin.get("artifact", "")}, ", ".join(sorted(imported)) or "none")

    literals = artifact_literals(ROOT, LIB)
    check("no source file hard-codes the artifact path", not literals,
          ", ".join(literals[:8]) or "the pin is the one declaration")

    print()
    print(f"  release     : {pin.get('release')}   (false = a spike, not a vendored release)")
    print(f"  dojo commit : {pin.get('dojo_commit')}")
    print(f"  source      : {pin.get('dojo_revision', pin.get('dojo_commit'))}")
    print(f"  language    : {pin.get('language_revision')}")
    print(f"  artifact    : {pin.get('artifact')}")
    print(f"  closure     : {pin.get('closure_inputs', '—')} inputs")
    return finish(failures)


def finish(failures):
    print("hatch pin holds" if not failures else f"hatch pin FAILED: {len(failures)} check(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
