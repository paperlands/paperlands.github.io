import importlib.util
import os
from pathlib import Path
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from http.server import ThreadingHTTPServer

spec = importlib.util.spec_from_file_location('media_serve', Path(__file__).with_name('media-serve.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class MediaServeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cwd = os.getcwd()
        cls.root = tempfile.TemporaryDirectory()
        Path(cls.root.name, 'clip.mp4').write_bytes(bytes(range(32)))
        Path(cls.root.name, 'page.html').write_text('pretty page')
        os.chdir(cls.root.name)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), module.MediaHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join()
        cls.server.server_close()
        os.chdir(cls.cwd)
        cls.root.cleanup()

    def test_byte_ranges_and_full_response(self):
        for header, start, end in [(None, 0, 31), ('bytes=0-3', 0, 3), ('bytes=10-', 10, 31),
                                    ('bytes=-4', 28, 31), ('bytes=20-99', 20, 31)]:
            with self.subTest(header=header):
                request = Request(self.base + '/clip.mp4', headers={'Range': header} if header else {})
                with urlopen(request) as response:
                    self.assertEqual(response.status, 206 if header else 200)
                    self.assertEqual(response.headers['Accept-Ranges'], 'bytes')
                    self.assertEqual(response.read(), bytes(range(start, end + 1)))
                    if header:
                        self.assertEqual(response.headers['Content-Range'], f'bytes {start}-{end}/32')

    def test_unsatisfiable_ranges(self):
        for header in ['bytes=32-', 'bytes=9-4', 'bytes=-0']:
            with self.subTest(header=header), self.assertRaises(HTTPError) as raised:
                urlopen(Request(self.base + '/clip.mp4', headers={'Range': header}))
            self.assertEqual(raised.exception.code, 416)
            self.assertEqual(raised.exception.headers['Content-Range'], 'bytes */32')
            raised.exception.close()

    def test_head_and_pretty_permalink(self):
        with urlopen(Request(self.base + '/clip.mp4', method='HEAD')) as response:
            self.assertEqual(response.headers['Content-Length'], '32')
            self.assertEqual(response.read(), b'')
        with urlopen(self.base + '/page') as response:
            self.assertEqual(response.read(), b'pretty page')


if __name__ == '__main__':
    unittest.main()
