#!/usr/bin/env python3
"""Static server that understands Jekyll's pretty permalinks.

python3 -m http.server returns 404 for /about because Jekyll emits about.html.
This resolves, in order: <path>, <path>.html, <path>/index.html.
"""
import sys, os, posixpath
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class PrettyHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        if os.path.isfile(p):
            return p
        # Prefer <path>.html over a same-named DIRECTORY.
        #
        # This ordering is load-bearing. /tjc and /tjc/nationaldaychallenge
        # both exist, so Jekyll creates _site/tjc/ as a directory as well as
        # _site/tjc.html. Resolving the directory first served Python's
        # autoindex page for /tjc, and every measurement of /tjc in this
        # repository before this fix — including the repeated claim that
        # Twilight measures 0 layout / 0 style deltas — was measuring a
        # directory listing, not the page.
        if os.path.isfile(p + ".html"):
            return p + ".html"
        if os.path.isdir(p):
            for cand in (os.path.join(p, "index.html"),):
                if os.path.isfile(cand):
                    return cand
            return p
        return p

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]);
    root = sys.argv[2]
    os.chdir(root)
    ThreadingHTTPServer(("127.0.0.1", port), PrettyHandler).serve_forever()
