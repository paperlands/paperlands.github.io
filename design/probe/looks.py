#!/usr/bin/env python3
"""Assert a look binds published slots, not another component's classes.

design/media.org states the rule: a look binds attributes the surfaces publish.
That is a judgement, and a judgement written in prose is not a test. This is the
test.

    python3 design/probe/looks.py [--site _site]

For every rule in the built stylesheet scoped by [data-look=NAME]:

  1. Every class it names must be namespaced to the look (NAME or NAME-*).
     Otherwise the look has reached into nav.css or media.css, and a rename
     there silently breaks it while coverage.py, assets.py and surfaces.py all
     still pass — because both class names still resolve.

  2. Every data-* attribute it binds must be published by a page that actually
     uses the look, and when the selector pins a value, that exact name=value
     must appear. `data-media-copy` is refused outright: it is the writer's
     channel, not a slot, and a look that binds it has confused presentation
     with playback.

  3. Every look in the stylesheet must have a page, and every look in the build
     must have rules. A look with no consumer is abstraction ahead of evidence.

Exit 1 on any failure.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# A selector prelude is whatever sits between the previous `}` and the next `{`.
# `@media (...)` preludes come back too; they never carry data-look, and the rule
# nested inside them is matched on its own.
RULE = re.compile(r"([^{}]*)\{")
LOOK = re.compile(r"data-look\s*=\s*(?:\"([^\"]+)\"|'([^']+)'|([^\]\s]+))")
CLASS = re.compile(r"\.(-?[A-Za-z_][A-Za-z0-9_-]*)")
ATTR = re.compile(
    r"\[\s*([A-Za-z_][\w-]*)\s*"
    r"(?:([~|^$*]?=)\s*(?:\"([^\"]*)\"|'([^']*)'|([^\]\s]+)))?\s*\]"
)
PUBLISHED = re.compile(r"(data-[\w-]+)(?:=\"([^\"]*)\")?")

# The writer's channel, not a slot. Binding it would let a look drive text.
FORBIDDEN = {"data-media-copy"}

# Classes a look may name that are not its own. Expected to stay empty: every
# entry is a look reaching into someone else's file.
ALLOW = set()


def built_pages(site):
    for dp, dn, fn in os.walk(site):
        for f in fn:
            if not f.endswith(".html"):
                continue
            path = os.path.join(dp, f)
            rel = os.path.relpath(path, site)
            if rel.startswith("assets") or rel.startswith("."):
                continue
            yield rel, open(path, encoding="utf-8", errors="ignore").read()


def main():
    site = "_site"
    if "--site" in sys.argv:
        site = sys.argv[sys.argv.index("--site") + 1]
    site = os.path.join(ROOT, site) if not os.path.isabs(site) else site

    css_path = os.path.join(site, "assets", "css", "app.css")
    if not os.path.isfile(css_path):
        sys.exit(f"no built stylesheet at {css_path} — run `bundle exec jekyll build` first")
    css = open(css_path, encoding="utf-8").read()

    pages = list(built_pages(site))

    # look -> {"classes": {}, "attrs": set()}
    in_css = {}
    for prelude in RULE.findall(css):
        for part in prelude.split(","):
            m = LOOK.search(part)
            if not m:
                continue
            look = next(g for g in m.groups() if g)
            seen = in_css.setdefault(look, {"classes": set(), "attrs": set()})
            seen["classes"].update(CLASS.findall(part))
            for name, _op, dq, sq, uq in ATTR.findall(part):
                value = dq or sq or uq or None
                if name == "data-look" or name.startswith("data-" + look + "-"):
                    continue
                if name.startswith("data-"):
                    seen["attrs"].add((name, value))

    in_build = {}
    for rel, html in pages:
        for m in LOOK.finditer(html):
            look = next(g for g in m.groups() if g)
            in_build.setdefault(look, []).append((rel, html))

    ok = True

    orphan_css = sorted(set(in_css) - set(in_build))
    orphan_build = sorted(set(in_build) - set(in_css))
    if orphan_css:
        ok = False
        print("LOOK WITH NO PAGE — rules for a look nothing applies:")
        for look in orphan_css:
            print(f"   {look}")
    if orphan_build:
        ok = False
        print("LOOK WITH NO RULES — data-look on a page, nothing bound to it:")
        for look in orphan_build:
            print(f"   {look}  ({in_build[look][0][0]})")

    for look in sorted(set(in_css) & set(in_build)):
        used = in_build[look]
        names, pairs = set(), set()
        for _rel, html in used:
            for name, value in PUBLISHED.findall(html):
                names.add(name)
                if value:
                    pairs.add((name, value))

        foreign, unbound, forbidden = [], [], []
        for cls in sorted(in_css[look]["classes"]):
            if cls == look or cls.startswith(look + "-") or cls in ALLOW:
                continue
            foreign.append(cls)
        for name, value in sorted(in_css[look]["attrs"], key=lambda t: (t[0], t[1] or "")):
            if name in FORBIDDEN:
                forbidden.append(name)
            elif name not in names:
                unbound.append(f"[{name}]")
            elif value and (name, value) not in pairs:
                unbound.append(f"[{name}=\"{value}\"]")

        print(
            f"  {look:<12s}: {len(used):>2d} page(s), "
            f"{len(in_css[look]['attrs']):>2d} binding(s), "
            f"{len(foreign)} foreign class(es), {len(unbound)} unbound, "
            f"{len(forbidden)} forbidden"
        )

        if foreign:
            ok = False
            print("   FOREIGN CLASSES — the look reached into another component:")
            for cls in foreign:
                print(f"      .{cls}   bind an attribute instead")
        if unbound:
            ok = False
            print("   UNBOUND BINDINGS — no page using this look publishes these:")
            for item in unbound:
                print(f"      {item}")
        if forbidden:
            ok = False
            print("   FORBIDDEN BINDINGS — these are not slots:")
            for name in forbidden:
                print(f"      [{name}]   the writer's channel, not a slot")

    print(f"built pages          : {len(pages)}")
    print(f"looks in stylesheet  : {len(in_css)}  ({', '.join(sorted(in_css)) or 'none'})")
    print(f"looks in the build   : {len(in_build)}  ({', '.join(sorted(in_build)) or 'none'})")
    print("looks hold" if ok else "looks BROKEN")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
