"""Regression tests for the shipped PNG decoder contract."""
import importlib.util
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("slateframe_png_check", ROOT / "bin" / "check-screenshot.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ScreenshotIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = (ROOT / "screenshot.png").read_bytes()

    def validate_bytes(self, content):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "screenshot.png"
            target.write_bytes(content)
            MODULE.validate(target)

    def test_repository_screenshot_decodes_completely(self):
        self.validate_bytes(self.original)

    def test_rejects_truncated_png_even_with_valid_dimensions(self):
        with self.assertRaises(ValueError):
            self.validate_bytes(self.original[:100])

    def test_rejects_corrupt_chunk_crc(self):
        broken = bytearray(self.original)
        broken[29] ^= 1
        with self.assertRaisesRegex(ValueError, "CRC mismatch"):
            self.validate_bytes(broken)

    def test_rejects_wrong_dimensions_even_with_valid_crc(self):
        broken = bytearray(self.original)
        broken[16:20] = struct.pack(">I", 1199)
        broken[29:33] = struct.pack(">I", zlib.crc32(broken[12:29]) & 0xffffffff)
        with self.assertRaisesRegex(ValueError, "expected 1200x900"):
            self.validate_bytes(broken)

    def test_rejects_trailing_bytes_after_iend(self):
        with self.assertRaises(ValueError):
            self.validate_bytes(self.original + b"extra")


if __name__ == "__main__":
    unittest.main()
