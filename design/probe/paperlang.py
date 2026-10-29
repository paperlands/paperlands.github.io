#!/usr/bin/env python3
"""Check that the served PaperLang aliases and their evidence are the installed ones.

    python3 design/probe/paperlang.py [--site _site]

toolchain/vendor.mjs writes the catalogue; this probe checks it with its own code,
then checks the built aliases. The source snapshot is an install record, not a
served file: Jekyll excludes assets/lib/paperlang/**/sources. It does not claim
provenance beyond the release evidence: that is a producer/owner question.
"""
import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CATALOGUE = os.path.join(ROOT, "_data/paperlang.json")


def sha(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    site = "_site"
    if "--site" in sys.argv:
        site = sys.argv[sys.argv.index("--site") + 1]
    failures = []

    def check(what, passed, detail=""):
        print(f"  {'ok  ' if passed else 'FAIL'} {what}" + (f"  — {detail}" if detail else ""))
        if not passed:
            failures.append(what)

    check("catalogue exists", os.path.isfile(CATALOGUE), os.path.relpath(CATALOGUE, ROOT))
    if not os.path.isfile(CATALOGUE):
        return finish(failures)
    with open(CATALOGUE) as fh:
        catalogue = json.load(fh)
    lines = catalogue.get("lines", {})
    latest = catalogue.get("latest")
    check("catalogue schema", catalogue.get("schema") == 1, catalogue.get("schema"))
    check("latest names an installed line", latest in lines, latest)
    aliases = {}
    for line, entry in sorted(lines.items()):
        check(f"{line}: version on its line", str(entry.get("version", "")).startswith(line + "."), entry.get("version"))
        generation = entry.get("generation", "")
        check(f"{line}: generation under library", generation.startswith("/assets/lib/paperlang/") and ".." not in generation)
        artifact = os.path.join(ROOT, entry.get("artifact_path", "").lstrip("/"))
        check(f"{line}: artifact present", os.path.isfile(artifact), entry.get("artifact"))
        if os.path.isfile(artifact):
            check(f"{line}: artifact sha256", sha(artifact) == entry.get("artifact_sha256"))
        manifest = os.path.join(ROOT, generation.lstrip("/"), entry.get("release_manifest", "release.json"))
        check(f"{line}: release manifest present", os.path.isfile(manifest))
        if os.path.isfile(manifest):
            check(f"{line}: release manifest sha256", sha(manifest) == entry.get("evidence_sha256"))
            with open(manifest) as fh:
                release = json.load(fh)
            artifacts = release.get("artifacts", {})
            sources = release.get("sources", {})
            check(f"{line}: evidence artifacts", all(
                os.path.isfile(os.path.join(ROOT, generation.lstrip("/"), name)) and
                sha(os.path.join(ROOT, generation.lstrip("/"), name)) == digest
                for name, digest in artifacts.items()), f"{len(artifacts)} artifacts")
            snapshot = os.path.join(ROOT, generation.lstrip("/"), "sources")
            if os.path.isdir(snapshot):
                check(f"{line}: complete source snapshot", all(
                    os.path.isfile(os.path.join(snapshot, name)) and
                    sha(os.path.join(snapshot, name)) == digest
                    for name, digest in sources.items()), f"{len(sources)} sources")
            else:
                check(f"{line}: source snapshot not in checkout", True, "record only")
            for legal in ("LICENSE", "NOTICE.txt"):
                check(f"{line}: {legal} served", os.path.isfile(os.path.join(ROOT, generation.lstrip("/"), legal)))
            served = os.path.join(ROOT, site, generation.lstrip("/"))
            check(f"{line}: served generation present", os.path.isdir(served))
            if os.path.isdir(served):
                check(f"{line}: served artifact sha256", os.path.isfile(os.path.join(served, "host.mjs")) and
                      sha(os.path.join(served, "host.mjs")) == entry.get("artifact_sha256"))
                check(f"{line}: served release manifest sha256", os.path.isfile(os.path.join(served, "release.json")) and
                      sha(os.path.join(served, "release.json")) == entry.get("evidence_sha256"))
                check(f"{line}: served evidence artifacts", all(
                    os.path.isfile(os.path.join(served, name)) and sha(os.path.join(served, name)) == digest
                    for name, digest in artifacts.items()), f"{len(artifacts)} artifacts")
                for legal in ("LICENSE", "NOTICE.txt"):
                    check(f"{line}: served {legal}", os.path.isfile(os.path.join(served, legal)))

    for line in list(lines) + ["latest"]:
        entry = lines.get(latest if line == "latest" else line)
        if not entry:
            continue
        alias = os.path.join(ROOT, site, "paperlang", f"{line}.js")
        check(f"built alias /paperlang/{line}.js", os.path.isfile(alias))
        if os.path.isfile(alias):
            with open(alias) as fh:
                body = fh.read()
            check(f"built alias {line}: raw JavaScript", body.startswith("/* PaperLang") and "<html" not in body)
            check(f"built alias {line}: immutable target", f'export * from "{entry["artifact_path"]}";' in body)
            aliases[line] = body

    check("latest alias follows latest", latest not in lines or f'export * from "{lines[latest]["artifact_path"]}";' in aliases.get("latest", ""))
    check("dirty reads do not masquerade as clean", all(
        "dirty development snapshot" in aliases.get(line, "") for line, entry in lines.items() if entry.get("source_dirty")), "alias comment")
    return finish(failures)


def finish(failures):
    if failures:
        print(f"FAIL: {len(failures)} PaperLang check(s)")
        return 1
    print("PASS: catalogue, immutable evidence, source/licences and same-origin raw aliases")
    return 0


if __name__ == "__main__":
    sys.exit(main())
