"""Verify decoded indexed PNG pixels never reference missing PLTE entries."""
import importlib.util
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    'slateframe_screenshot', ROOT / 'bin/check-screenshot.py'
)
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)


def chunk(kind, data=b''):
    return (struct.pack('>I', len(data)) + kind + data +
            struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff))


def indexed_png(depth, palette_size, invalid_index=None, first_filter=0, invalid_row=0,
                previous_index=None):
    width, height = 1200, 900
    stride = (width * depth + 7) // 8
    rows = []
    previous = bytes(stride)
    for row in range(height):
        target = bytearray(stride)
        if row == invalid_row and invalid_index is not None:
            target[0] = invalid_index << (8 - depth)
        elif row == invalid_row - 1 and previous_index is not None:
            target[0] = previous_index << (8 - depth)
        filter_type = first_filter if row == invalid_row else 0
        encoded = bytearray(stride)
        for i in range(stride):
            left = target[i - 1] if i else 0
            above = previous[i]
            upper_left = previous[i - 1] if i else 0
            if filter_type == 0:
                predictor = 0
            elif filter_type == 1:
                predictor = left
            elif filter_type == 2:
                predictor = above
            elif filter_type == 3:
                predictor = (left + above) // 2
            else:
                estimate = left + above - upper_left
                values = (left, above, upper_left)
                predictor = values[min(range(3), key=lambda k: abs(estimate - values[k]))]
            encoded[i] = (target[i] - predictor) & 255
        rows.append(bytes((filter_type,)) + encoded)
        previous = target
    palette = b''.join(bytes((i, i, i)) for i in range(palette_size))
    header = struct.pack('>IIBBBBB', width, height, depth, 3, 0, 0, 0)
    return (CHECKER.SIGNATURE + chunk(b'IHDR', header) + chunk(b'PLTE', palette) +
            chunk(b'IDAT', zlib.compress(b''.join(rows), 9)) + chunk(b'IEND'))


class IndexedPalettePixelTests(unittest.TestCase):
    def validate(self, data):
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'screenshot.png'
            file.write_bytes(data)
            CHECKER.validate(file)

    def test_valid_indices_across_all_bit_depths(self):
        for depth in (1, 2, 4, 8):
            with self.subTest(depth=depth):
                self.validate(indexed_png(depth, 2, invalid_index=1))

    def test_invalid_index_across_all_bit_depths(self):
        for depth in (1, 2, 4, 8):
            with self.subTest(depth=depth):
                index = 1 if depth == 1 else 2
                palette_size = 1 if depth == 1 else 2
                with self.assertRaisesRegex(ValueError, 'missing palette entry'):
                    self.validate(indexed_png(depth, palette_size, invalid_index=index))

    def test_invalid_palette_index_with_every_png_filter(self):
        for filter_type in range(5):
            with self.subTest(filter=filter_type):
                with self.assertRaisesRegex(ValueError, 'missing palette entry'):
                    self.validate(indexed_png(8, 2, invalid_index=2, first_filter=filter_type))

    def test_invalid_palette_index_on_later_row(self):
        with self.assertRaisesRegex(ValueError, 'missing palette entry'):
            self.validate(indexed_png(4, 2, invalid_index=2, first_filter=4, invalid_row=417))

    def test_previous_row_predictors_cannot_hide_bad_index(self):
        for filter_type in (2, 3, 4):
            with self.subTest(filter=filter_type):
                with self.assertRaisesRegex(ValueError, 'missing palette entry'):
                    self.validate(indexed_png(8, 2, invalid_index=2, first_filter=filter_type,
                                              invalid_row=700, previous_index=1))

    def test_previous_row_predictors_accept_valid_indices(self):
        for filter_type in (2, 3, 4):
            with self.subTest(filter=filter_type):
                self.validate(indexed_png(8, 2, invalid_index=1, first_filter=filter_type,
                                          invalid_row=700, previous_index=1))

    def test_full_palette_accepts_maximum_index(self):
        self.validate(indexed_png(8, 256, invalid_index=255, first_filter=4))


if __name__ == '__main__':
    unittest.main()
