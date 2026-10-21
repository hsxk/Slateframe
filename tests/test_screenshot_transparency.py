"""Reject malformed PNG transparency without rejecting legal indexed assets."""
import importlib.util
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('slateframe_png', ROOT / 'bin/check-screenshot.py')
PNG = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PNG)


def chunk(name, data=b''):
    return (struct.pack('>I', len(data)) + name + data +
            struct.pack('>I', zlib.crc32(name + data) & 0xffffffff))


def build(color=3, before=(), after=(), palette=True):
    header = struct.pack('>IIBBBBB', 1200, 900, 8, color, 0, 0, 0)
    stride = 1200 * {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color]
    image = zlib.compress((b'\x00' + b'\x00' * stride) * 900, 9)
    plte = chunk(b'PLTE', b'\x00\x00\x00\xff\xff\xff') if color == 3 and palette else b''
    return (PNG.SIGNATURE + chunk(b'IHDR', header) + plte +
            b''.join(chunk(*item) for item in before) + chunk(b'IDAT', image) +
            b''.join(chunk(*item) for item in after) + chunk(b'IEND'))


class TransparencyTests(unittest.TestCase):
    def check(self, data):
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / 'screenshot.png'
            file.write_bytes(data)
            PNG.validate(file)

    def test_valid_indexed_transparency(self):
        self.check(build(before=((b'tRNS', b'\xff\x00'),)))

    def test_valid_grayscale_transparency(self):
        self.check(build(color=0, before=((b'tRNS', b'\x00\x00'),)))

    def test_valid_truecolor_transparency(self):
        self.check(build(color=2, before=((b'tRNS', b'\x00\x00' * 3),)))

    def test_rejects_transparency_larger_than_palette(self):
        with self.assertRaisesRegex(ValueError, 'exceeds palette'):
            self.check(build(before=((b'tRNS', b'\xff\x00\xff'),)))

    def test_rejects_indexed_transparency_without_palette(self):
        with self.assertRaisesRegex(ValueError, 'exceeds palette'):
            self.check(build(palette=False, before=((b'tRNS', b'\xff'),)))

    def test_rejects_palette_after_truecolor_transparency(self):
        header = struct.pack('>IIBBBBB', 1200, 900, 8, 2, 0, 0, 0)
        pixels = (b'\x00' + b'\x00' * 3600) * 900
        data = (PNG.SIGNATURE + chunk(b'IHDR', header) +
                chunk(b'tRNS', b'\x00' * 6) +
                chunk(b'PLTE', b'\x00\x00\x00') +
                chunk(b'IDAT', zlib.compress(pixels, 9)) + chunk(b'IEND'))
        with self.assertRaisesRegex(ValueError, 'misplaced PLTE'):
            self.check(data)

    def test_rejects_transparency_after_idat(self):
        with self.assertRaisesRegex(ValueError, 'misplaced'):
            self.check(build(after=((b'tRNS', b'\xff'),)))

    def test_rejects_duplicate_transparency(self):
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            self.check(build(before=((b'tRNS', b'\xff'), (b'tRNS', b'\x00'))))

    def test_rejects_invalid_grayscale_length(self):
        with self.assertRaisesRegex(ValueError, 'grayscale'):
            self.check(build(color=0, before=((b'tRNS', b'\xff'),)))

    def test_rejects_invalid_truecolor_length(self):
        with self.assertRaisesRegex(ValueError, 'truecolor'):
            self.check(build(color=2, before=((b'tRNS', b'\xff'),)))

    def test_rejects_transparency_for_alpha_color_types(self):
        for color in (4, 6):
            with self.subTest(color=color):
                with self.assertRaisesRegex(ValueError, 'forbids'):
                    self.check(build(color=color, before=((b'tRNS', b'\xff'),)))


if __name__ == '__main__':
    unittest.main()
