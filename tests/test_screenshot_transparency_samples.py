"""Validate tRNS sample ranges against IHDR bit depth, not only chunk length."""
import importlib.util
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('slateframe_png', ROOT / 'bin/check-screenshot.py')
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)


def chunk(kind, data=b''):
    return (struct.pack('>I', len(data)) + kind + data +
            struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff))


def sample(color, depth, transparency):
    width, height = 1200, 900
    channels = 3 if color == 2 else 1
    stride = (width * channels * depth + 7) // 8
    header = struct.pack('>IIBBBBB', width, height, depth, color, 0, 0, 0)
    return (CHECKER.SIGNATURE + chunk(b'IHDR', header) +
            chunk(b'tRNS', transparency) +
            chunk(b'IDAT', zlib.compress((b'\x00' + bytes(stride)) * height, 9)) +
            chunk(b'IEND'))


class TransparencySampleRangeTests(unittest.TestCase):
    def validate(self, data):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'screenshot.png'
            target.write_bytes(data)
            CHECKER.validate(target)

    def test_grayscale_valid_extremes_at_all_bit_depths(self):
        for depth in (1, 2, 4, 8, 16):
            for sample_value in (0, (1 << depth) - 1):
                with self.subTest(depth=depth, value=sample_value):
                    self.validate(sample(0, depth, struct.pack('>H', sample_value)))

    def test_grayscale_rejects_sample_beyond_bit_depth(self):
        for depth in (1, 2, 4, 8):
            with self.subTest(depth=depth):
                with self.assertRaisesRegex(ValueError, 'sample exceeds bit depth'):
                    self.validate(sample(0, depth, struct.pack('>H', 1 << depth)))

    def test_truecolor_valid_extremes_at_both_bit_depths(self):
        for depth in (8, 16):
            with self.subTest(depth=depth):
                self.validate(sample(2, depth, struct.pack('>HHH', 0, (1 << depth) - 1, 1)))

    def test_truecolor_rejects_each_channel_beyond_bit_depth(self):
        for channel in range(3):
            samples = [0, 0, 0]
            samples[channel] = 256
            with self.subTest(channel=channel):
                with self.assertRaisesRegex(ValueError, 'sample exceeds bit depth'):
                    self.validate(sample(2, 8, struct.pack('>HHH', *samples)))

    def test_truecolor_16bit_full_range_is_not_truncated(self):
        self.validate(sample(2, 16, struct.pack('>HHH', 65535, 65535, 65535)))


if __name__ == '__main__':
    unittest.main()
