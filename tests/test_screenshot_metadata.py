"""Protect WordPress.org release screenshots from embedded private PNG metadata."""
import importlib.util
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('slateframe_screenshot', ROOT / 'bin/check-screenshot.py')
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)


def chunk(kind, payload=b''):
    return (struct.pack('>I', len(payload)) + kind + payload +
            struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff))


def sample_png(before=(), after=()):
    """A complete valid RGB screenshot without external image dependencies."""
    header = struct.pack('>IIBBBBB', 1200, 900, 8, 2, 0, 0, 0)
    pixels = (b'\x00' + b'\x00' * (1200 * 3)) * 900
    return (CHECKER.SIGNATURE + chunk(b'IHDR', header) +
            b''.join(chunk(*part) for part in before) +
            chunk(b'IDAT', zlib.compress(pixels, 9)) +
            b''.join(chunk(*part) for part in after) + chunk(b'IEND'))


class ScreenshotMetadataPrivacyTests(unittest.TestCase):
    def check(self, data):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'screenshot.png'
            path.write_bytes(data)
            CHECKER.validate(path)

    def test_plain_valid_screenshot(self):
        self.check(sample_png())

    def test_color_space_information_is_allowed(self):
        self.check(sample_png(before=((b'sRGB', b'\x00'), (b'gAMA', struct.pack('>I', 45455)))))

    def test_rejects_embedded_private_metadata_families(self):
        samples = {
            b'tEXt': b'GPS\x00secret-location',
            b'zTXt': b'Comment\x00\x00' + zlib.compress(b'private data'),
            b'iTXt': b'XML:com.adobe.xmp\x00\x00\x00\x00\x00private',
            b'eXIf': b'II*\x00private',
            b'tIME': struct.pack('>HBBBBB', 2026, 10, 19, 17, 33, 5),
        }
        for kind, data in samples.items():
            with self.subTest(chunk=kind):
                with self.assertRaisesRegex(ValueError, 'embedded metadata'):
                    self.check(sample_png(before=((kind, data),)))

    def test_rejects_metadata_after_image_data(self):
        with self.assertRaisesRegex(ValueError, 'embedded metadata'):
            self.check(sample_png(after=((b'tEXt', b'Comment\x00private'),)))

    def test_nonconsecutive_idat_still_has_specific_error(self):
        original = sample_png()
        position = original.find(b'IDAT') - 4
        size = struct.unpack_from('>I', original, position)[0]
        payload = original[position + 8:position + 8 + size]
        broken = (original[:position] + chunk(b'IDAT', payload[:100]) +
                  chunk(b'tEXt', b'Comment\x00private') +
                  chunk(b'IDAT', payload[100:]) + original[position + 12 + size:])
        with self.assertRaisesRegex(ValueError, 'consecutive'):
            self.check(broken)

    def test_rejects_metadata_without_exposing_contents_in_error(self):
        with self.assertRaises(ValueError) as raised:
            self.check(sample_png(before=((b'tEXt', b'GPS\x00secret-location'),)))
        self.assertNotIn('secret-location', str(raised.exception))


if __name__ == '__main__':
    unittest.main()
