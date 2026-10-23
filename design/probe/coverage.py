#!/usr/bin/env python3
"""Assert every class in the built HTML resolves to a selector.

This is the assertion that catches a class reaching the rendered page with no
rule behind it. That failure is silent: the build succeeds, the page renders,
and one element simply looks wrong.

It is the failure mode the whole styling migration is most exposed to.

Three ways that happens here, all of them real:

  1. A class COMPOSED at build time from Liquid params, so the finished string
     never appears in a source file. `_includes/media/legacyhero.html` does
     this with `h-[{{mobile}}] md:h-[{{desktop}}]`. That exact bug shipped: the
     rule for `md:h-[56vh]` existed only because a DELETED page happened to
     contain the string literally, so removing the dead file removed a live
     rule — silently, with the build reporting success.
  2. A class added to the DOM by JavaScript at runtime.
  3. A class in a source directory the scanner does not walk.

The allow-list is maintained deliberately and is expected to shrink. Every
entry is a known-unstyled name, not a known-good one — most are page-local
classes defined in inline `<style>` blocks, which the scanner has no reason
to see.

    python3 design/probe/coverage.py [--site _site]

Exit 1 on any unresolvable class not on the allow-list.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Names that legitimately have no generated rule, grouped by why. This list is
# expected to shrink; a stale entry is reported so it cannot quietly persist.
ALLOW = {
    # ---- page-local classes defined in inline <style> blocks -------------
    # The scanner has no reason to see these: they are styled in the page.
    "helios-dojo", "helios-dojo__stage", "helios-dojo__side", "helios-dojo__status",
    "media-gallery", "media-slide", "media-thumb", "video-element", "youtube-thumb",
    "youtube-overlay", "loading-spinner", "mlp-slide", "mlp-thumb", "scrollbar-hide",
    "shimmer-overlay", "card-inner", "card-link", "inner_card", "inner_card_holder",
    "img_holder", "image_caption", "grid-container", "tag-pill", "author",
    "heading-serif", "body-serif", "no-border", "no-responsive",
    "padding-right-large", "orange-line", "stroke", "wrapper",
    "gmff-hero", "gmff-hero__copy", "gmff-hero__deck", "gmff-hero__eyebrow",
    "gmff-hero__frame", "gmff-hero__hint", "gmff-hero__play", "gmff-hero__poster",
    "gmff-hero__poster-frame", "gmff-hero__stage", "gmff-hero__title",
    "gmff-hero__video", "gmff-hero__wipe", "gmff-modal__close", "gmff-modal__eyebrow",
    "gmff-modal__head", "gmff-modal__shell", "gmff-modal__title", "gmff-podium-row",
    "gmff-presenter", "gmff-results", "gmff-results-wrap", "gmff-results__title",
    "podium-card", "podium-position", "podium-position-1", "podium-position-2",
    "podium-position-3", "podium-position--winner", "finalist-card", "finalist-glyph",
    "finalist-watch-inner", "finalist-watch-label", "finalist-watch-panel", "medal",
    "medal-1", "medal-2", "medal-3", "rank-1", "rank-2", "rank-3", "watch-inner",
    "watch-label", "watch-panel", "glow-bronze", "glow-gold", "glow-silver",
    "platform-glyph", "conquer", "math-dec", "stpat_paperland", "work_with_us",
    "work_with_us_content", "work_with_us_content_el_1", "dojo_section",
    "dojo_section_small", "testimonial", "testimonial_text", "os-btn", "os-icon",
    "os-label", "paper-btn", "footnotes", "cf-turnstile", "fa",
    "fa-check-circle", "bg-bg", "text-txt", "text-txt-light",

    # ---- pre-existing dead classes: intent that has NEVER rendered --------
    # Found by this assertion on its first run. Each is a name someone wrote
    # expecting a rule that was never generated. Recorded rather than deleted
    # because every one of them sits on a frozen (legacy) or sealed (Twilight)
    # surface, where the standing rule is "renders unchanged".
    #
    #   /lan   (core)   animate-fade-up, -1, -2, -3   no such animation in @theme
    #   /rgs   (legacy) hover:shadow-3xl              no shadow-3xl in @theme
    #   /tjc   (sealed) lg:[&amp;&gt;*:nth-child(N)]:col-start-N
    #                   HTML-escaped `&amp;&gt;` instead of `&>`: the selector is
    #                   malformed in the built HTML and can never match. Same
    #                   escaping trap that media.css documents for [data-ready].
    #
    # The /lan entries are core and in scope for the reinvention; the other
    # three are not. None is a regression — all predate this work.
    "animate-fade-up", "animate-fade-up-1", "animate-fade-up-2", "animate-fade-up-3",
    "hover:shadow-3xl",
    "lg:[&amp;&gt;*:nth-child(4)]:col-start-2",
    "lg:[&amp;&gt;*:nth-child(5)]:col-start-4",

    # ---- plugin names that are not utilities -----------------------------
    # `edition-window-ref` is emitted by _plugins/notes_edition.rb for the anchor
    # a margin window's return link points at. Its own comment says it "draws
    # nothing, so the window stays unmarked" — an anchor target, not a style.
    "no-scrollbar", "prose", "sr-only", "group", "edition-window-ref",
}


def classes_in(site):
    found = {}
    for dp, dn, fn in os.walk(site):
        for f in fn:
            if not f.endswith(".html"):
                continue
            path = os.path.join(dp, f)
            text = open(path, encoding="utf-8", errors="ignore").read()
            for m in re.finditer(r'class="([^"]*)"', text):
                for c in m.group(1).split():
                    found.setdefault(c, os.path.relpath(path, site))
    return found


def escape(c):
    """How the class appears inside a selector."""
    return "." + "".join(ch if (ch.isalnum() or ch in "-_") else "\\" + ch for ch in c)


def main():
    site = "_site"
    if "--site" in sys.argv:
        site = sys.argv[sys.argv.index("--site") + 1]
    site = os.path.join(ROOT, site) if not os.path.isabs(site) else site

    # EVERY built sheet, not just app.css. Since `css_modes` there is one sheet
    # per surface (mode-helios.css, mode-evening.css, mode-twilight.css) and a
    # page links only the one it needs, so a class that resolves in any sheet
    # is a class that resolves in the build. Reading app.css alone reported
    # every Helios and every edition class as unstyled — the exact failure this
    # probe exists to catch, reported against the probe instead of the site.
    css_dir = os.path.join(site, "assets", "css")
    if not os.path.isdir(css_dir):
        sys.exit(f"no built stylesheets at {css_dir} — run `bundle exec jekyll build` first")
    sheets = sorted(f for f in os.listdir(css_dir) if f.endswith(".css"))
    if not sheets:
        sys.exit(f"no built stylesheets at {css_dir} — run `bundle exec jekyll build` first")
    css = "".join(open(os.path.join(css_dir, f), encoding="utf-8").read() for f in sheets)
    used = classes_in(site)

    missing = {c: where for c, where in used.items()
               if escape(c) not in css and c not in ALLOW}

    # names on the allow-list that are no longer used: the list should shrink
    stale = sorted(c for c in ALLOW if c not in used)

    print(f"classes in built HTML : {len(used)}")
    print(f"unresolvable          : {len(missing)}")
    print(f"allow-list entries    : {len(ALLOW)}  (stale: {len(stale)})")

    if missing:
        print("\nCLASSES WITH NO RULE — a rendered class that produces no CSS:")
        for c, where in sorted(missing.items()):
            print(f"   {c:26s} first seen in {where}")
    if stale:
        print("\nSTALE ALLOW-LIST ENTRIES (safe to delete):")
        for c in stale:
            print(f"   {c}")

    if missing:
        print("\ncoverage BROKEN")
        return 1
    print("coverage holds")
    return 0


if __name__ == "__main__":
    sys.exit(main())
