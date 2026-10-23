#!/usr/bin/env python3
"""Frozen-build probe server with single byte ranges (required for video seeking).

Usage matches serve.py: python3 design/probe/media-serve.py PORT BUILD_ROOT
A buffered video is not necessarily seekable in Chromium when HTTP advertises no
range support; silently measuring frame zero invalidates paused-frame comparisons.
"""
import os
import re
import sys
from http.server import ThreadingHTTPServer
from serve import PrettyHandler


class MediaHandler(PrettyHandler):
    def send_head(self):
        self.remaining = None
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
        try:
            stream = open(path, 'rb')
        except OSError:
            self.send_error(404)
            return None
        size = os.fstat(stream.fileno()).st_size
        start, end, status = 0, size - 1, 200
        request = self.headers.get('Range')
        if request:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', request.strip())
            if match and any(match.groups()):
                left, right = match.groups()
                if left:
                    start = int(left)
                    end = min(int(right), end) if right else end
                else:
                    start = max(0, size - int(right))
                if start > end or start >= size:
                    stream.close()
                    self.send_response(416)
                    self.send_header('Content-Range', f'bytes */{size}')
                    self.send_header('Content-Length', '0')
                    self.end_headers()
                    return None
                status = 206
            # Unsupported/multiple ranges may legally be ignored (full 200).
        self.send_response(status)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Last-Modified', self.date_time_string(os.fstat(stream.fileno()).st_mtime))
        if status == 206:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        stream.seek(start)
        self.remaining = end - start + 1
        return stream

    def copyfile(self, source, outputfile):
        if self.remaining is None:
            return super().copyfile(source, outputfile)
        remaining = self.remaining
        while remaining:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == '__main__':
    os.chdir(sys.argv[2])
    ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), MediaHandler).serve_forever()
