#!/usr/bin/env python3
"""Assert Helios names only real clips.

A consumer page passes ids. The catalog must have src (H.264), poster, box, alt,
and those files must exist — and a scene id must resolve the other way, in
_data/helios_possibilities.yml, which is art and program for an id whose words
are the page's. Two catalogs, two checks: the page may not name a clip that does
not exist, nor a scene that does not exist, nor leave a scene unnamed. This is
the Jekyll-end gate for Helios as a consumer.

    python3 design/probe/catalog.py
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# _pages/helios-media.md was declared here and in _data/surfaces.yml core.routes
# but never existed; both entries were stale. See surfaces.yml `removed`.
PAGES = ("_pages/helios.md",)
# The two catalogs are not the same catalog, and the page names both. `hero` and
# `see` name CLIPS (media.yml: src, poster, box, alt). `possibilities.items` and
# `who.items[].possibility` name SCENES (_data/helios_possibilities.yml: art and
# program for an id; their words are the page's). Checking a scene id against the
# clip catalog is what made this probe fail on a page that was telling the truth.
CLIP_BLOCKS = ("hero", "see")
SCENE_BLOCK = "possibilities"
SCENE_CATALOG = os.path.join(ROOT, "_data", "helios_possibilities.yml")
CATALOG = os.path.join(ROOT, "_data", "media.yml")


def load_catalog(path):
    clips = {}
    current = None
    for line in open(path, encoding="utf-8"):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        top = re.match(r"^([A-Za-z0-9_]+):\s*$", line)
        if top:
            current = top.group(1)
            clips[current] = {}
            continue
        field = re.match(r"^  ([A-Za-z0-9_]+):\s*(.*)$", line)
        if current and field:
            clips[current][field.group(1)] = field.group(2).strip()
    return clips


def scene_keys(path):
    keys = []
    for line in open(path, encoding="utf-8"):
        if line.lstrip().startswith("#"):
            continue
        top = re.match(r"^([A-Za-z0-9_]+):\s*$", line)
        if top:
            keys.append(top.group(1))
    return keys


def page_ids(path):
    """The page's front matter, split into the two catalogs it names.

    Returns (clip_ids, scene_ids). A `- id:` belongs to whichever catalog the
    block it sits in names; the page's copy block (`possibilities`) is scanned
    for scene ids, not clip ids.
    """
    text = open(path, encoding="utf-8").read()
    fm = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not fm:
        return [], []
    clips, scenes, block = [], [], None
    for line in fm.group(1).split("\n"):
        top = re.match(r"^([A-Za-z0-9_]+):", line)
        if top:
            block = top.group(1)
            continue
        if block == "who":
            # A who card points at the scene it opens (assets/js/home/helios-who.js).
            ref = re.match(r"^\s+possibility:\s*(\S+)", line)
            if ref:
                scenes.append(ref.group(1))
        found = re.match(r"^\s+- id:\s*(\S+)", line)
        if not found:
            continue
        if block in CLIP_BLOCKS:
            clips.append(found.group(1))
        elif block == SCENE_BLOCK:
            scenes.append(found.group(1))
    return clips, scenes

def exists(url):
    if not url.startswith("/"):
        return False
    return os.path.isfile(os.path.join(ROOT, url.lstrip("/")))


def main():
    catalog = load_catalog(CATALOG)
    scenes = scene_keys(SCENE_CATALOG)
    failures = 0

    def fail(msg):
        nonlocal failures
        failures += 1
        print(f"FAIL  {msg}")

    for rel in PAGES:
        path = os.path.join(ROOT, rel)
        if not os.path.isfile(path):
            fail(f"{rel} missing")
            continue
        ids, scene_ids = page_ids(path)
        if not ids:
            fail(f"{rel} names no clip ids")
            continue
        # A scene id is the page's own key into the scene catalog; every one it
        # names must be a scene that exists, and every scene must be named by the
        # page (the copy and the art are indexed by the same id).
        for sid in scene_ids:
            if sid not in scenes:
                fail(f"{rel} scene id {sid} not in {os.path.basename(SCENE_CATALOG)}")
            else:
                print(f"ok    {rel} scene {sid}")
        for orphan in [s for s in scenes if s not in scene_ids]:
            fail(f"{os.path.basename(SCENE_CATALOG)} scene {orphan} is named by no page")
        for cid in ids:
            clip = catalog.get(cid)
            if not clip:
                fail(f"{rel} id {cid} not in catalog")
                continue
            src, poster = clip.get("src", ""), clip.get("poster", "")
            if not src.endswith(".mp4"):
                fail(f"{cid} src is not an H.264 spine ({src or 'missing'})")
            if not poster:
                fail(f"{cid} has no poster — a clip without a still is not a clip")
            if src and not exists(src):
                fail(f"{cid} src missing on disk: {src}")
            if poster and not exists(poster):
                fail(f"{cid} poster missing on disk: {poster}")
            for key in ("width", "height", "alt"):
                if not clip.get(key):
                    fail(f"{cid} missing {key}")
            print(f"ok    {rel} {cid}")

    if failures:
        sys.exit(f"{failures} catalog check(s) failed")
    print("catalog holds")


if __name__ == "__main__":
    main()
