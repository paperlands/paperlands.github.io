#!/usr/bin/env python3
"""Assert the architecture boundary holds.

Every route in the built site must be claimed by exactly one surface in
`_data/surfaces.yml`. There is deliberately no default: an unclassified page
is how a surface leaks back into the global cascade, and that is the failure
this file exists to make loud.

    python3 design/probe/surfaces.py [--site _site]

Asserts three things:

  1. every built route is classified exactly once;
  2. NO artefact outside the legacy directories references a legacy layout or
     include — the leakage check, and the one that matters;
  3. declared-but-unbuilt and removed-but-rebuilt routes are reported.

Exit 1 on any failure.
"""
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("needs pyyaml: pip install pyyaml")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Template file extensions worth scanning for references.
TEMPLATE_EXT = (".html", ".md", ".txt", ".yml")


def built_routes(site):
    """Routes the build actually produced, as site-relative paths."""
    routes = set()
    for dp, dn, fn in os.walk(site):
        for f in fn:
            if not f.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dp, f), site)
            if rel.startswith("assets") or rel.startswith("."):
                continue
            route = "/" + rel[:-5]                      # strip .html
            if route.endswith("/index"):
                route = route[: -len("index")]
            routes.add(route)
    return routes


def legacy_leakage(legacy_dirs, site):
    """Files outside the legacy dirs that reference a legacy layout/include.

    The directory is the boundary. If a core or shared template names
    `legacy/...`, the split is decorative and will rot — so this fails loudly.
    """
    # The declaration itself necessarily names legacy artefacts, so it is not
    # a leak. Anything else outside the boundary that names one is.
    self_describing = {os.path.join("_data", "surfaces.yml")}
    leaks = []
    for dp, dn, fn in os.walk(ROOT):
        rel_dir = os.path.relpath(dp, ROOT)
        if any(part in rel_dir for part in
               (".git", "_site", "design", "node_modules", ".jekyll-cache")):
            continue
        if any(rel_dir == d or rel_dir.startswith(d + os.sep) for d in legacy_dirs):
            continue                                    # inside the boundary, fine
        for f in fn:
            if not f.endswith(TEMPLATE_EXT):
                continue
            path = os.path.join(dp, f)
            try:
                text = open(path, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            # Comments are stripped first: documentation necessarily *names*
            # legacy paths, and only real references are leakage.
            if f.endswith(".yml"):
                text = re.sub(r"#[^\n]*", "", text)
            else:
                text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
                text = re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}",
                              "", text, flags=re.S)
                text = re.sub(r"\{#.*?#\}", "", text, flags=re.S)
            rel = os.path.relpath(path, ROOT)
            if rel in self_describing:
                continue
            for m in re.finditer(r"legacy/[\w/.-]+", text):
                leaks.append((rel, m.group(0)))
    return leaks


def main():
    site = "_site"
    if "--site" in sys.argv:
        site = sys.argv[sys.argv.index("--site") + 1]
    site = os.path.join(ROOT, site) if not os.path.isabs(site) else site

    if not os.path.isdir(site):
        sys.exit(f"no build at {site} — run `bundle exec jekyll build` first")

    with open(os.path.join(ROOT, "_data", "surfaces.yml")) as fh:
        spec = yaml.safe_load(fh)

    # Surface names come from the data, not from a list in this file: adding a
    # surface should be a YAML edit, not a code edit.
    SURFACES = [k for k, v in spec.items()
                if isinstance(v, dict) and "routes" in v]

    declared = {}          # route -> [surface, ...]
    for surface in SURFACES:
        for r in spec.get(surface, {}).get("routes", []) or []:
            declared.setdefault(r, []).append(surface)

    built = built_routes(site)
    exempt = set(spec.get("non_navigational", []) or [])
    # `removed` is a plain list of routes; the reason lives in a comment so it
    # cannot drift out of sync with a machine-read field.
    removed = {e if isinstance(e, str) else e.get("route")
               for e in spec.get("removed", []) or []}

    # A surface may document `kinds` — sub-groups with their own lifetimes.
    # They must partition the surface's routes exactly: a route missing from
    # every kind, listed in two kinds, or listed in a kind but not the surface,
    # are all drift. The YAML says these are checked to agree; this is where.
    kind_errors = []
    for surface in SURFACES:
        kinds = spec.get(surface, {}).get("kinds")
        if not kinds:
            continue
        declared_routes = set(spec[surface].get("routes") or [])
        seen, dupes = set(), set()
        for name, group in kinds.items():
            for r in group.get("routes") or []:
                if r in seen:
                    dupes.add(r)
                seen.add(r)
        missing = declared_routes - seen
        extra = seen - declared_routes
        if missing:
            kind_errors.append(f"{surface}: in routes but in no kind -> {sorted(missing)}")
        if extra:
            kind_errors.append(f"{surface}: in a kind but not in routes -> {sorted(extra)}")
        if dupes:
            kind_errors.append(f"{surface}: in more than one kind -> {sorted(dupes)}")

    legacy_dirs = spec.get("boundary", {}).get("legacy_dirs", []) or []
    leaks = legacy_leakage(legacy_dirs, site)

    unclassified = sorted(built - set(declared) - exempt)
    double = sorted(r for r, s in declared.items() if len(s) > 1)
    missing = sorted(set(declared) - built)          # declared but not built
    resurrected = sorted(removed & built)

    ok = True
    if unclassified:
        ok = False
        print("UNCLASSIFIED ROUTES — every route must name a surface:")
        for r in unclassified:
            print(f"   {r}")
    if double:
        ok = False
        print("DOUBLE-CLAIMED ROUTES:")
        for r in double:
            print(f"   {r}  claimed by {declared[r]}")
    if missing:
        ok = False
        print("DECLARED BUT NOT BUILT (stale entry, or a permalink drifted):")
        for r in missing:
            print(f"   {r}")
    if resurrected:
        ok = False
        print("REMOVED ROUTES STILL BEING BUILT:")
        for r in resurrected:
            print(f"   {r}")
    if kind_errors:
        ok = False
        print("KIND GROUPINGS DISAGREE WITH THE SURFACE ROUTES:")
        for e in kind_errors:
            print(f"   {e}")
    if leaks:
        ok = False
        print("LEGACY LEAKAGE — these files sit outside the boundary but")
        print("reference a legacy artefact. The split is not holding:")
        for path, ref in sorted(set(leaks)):
            print(f"   {path}  ->  {ref}")

    counts = {s: len(spec.get(s, {}).get("routes", []) or []) for s in SURFACES}
    print(f"built routes : {len(built)}")
    for name in SURFACES:
        print(f"  {name:<10s} : {counts[name]}")
    print(f"  exempt     : {len(exempt)}")
    print(f"  removed    : {len(removed)} (absent from build: {not resurrected})")
    n_kinds = sum(len(spec.get(s, {}).get("kinds") or {}) for s in SURFACES)
    print(f"  kinds      : {n_kinds}   kind errors: {len(kind_errors)}")
    print(f"  legacy dirs: {len(legacy_dirs)}   leakage: {len(set(leaks))}")
    print("boundary holds" if ok else "BOUNDARY BROKEN")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
