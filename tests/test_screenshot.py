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


    @staticmethod
    def rebuild_chunks(chunks):
        data = bytearray(MODULE.SIGNATURE)
        for kind, content in chunks:
            data += struct.pack(">I", len(content)) + kind + content
            data += struct.pack(">I", zlib.crc32(kind + content) & 0xffffffff)
        return bytes(data)

    @classmethod
    def source_chunks(cls):
        offset, chunks = 8, []
        while offset < len(cls.original):
            size = struct.unpack_from(">I", cls.original, offset)[0]
            kind = cls.original[offset + 4:offset + 8]
            chunks.append((kind, cls.original[offset + 8:offset + 8 + size]))
            offset += 12 + size
        return chunks

    def test_release_builder_keeps_executable_mode(self):
        self.assertTrue((ROOT / "bin" / "build-theme-zip.sh").stat().st_mode & 0o111)

    def test_rejects_indexed_png_without_palette(self):
        parts = [(kind, content) for kind, content in self.source_chunks() if kind != b"PLTE"]
        with self.assertRaisesRegex(ValueError, "palette"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_idat_before_palette(self):
        parts = self.source_chunks()
        parts[1], parts[2] = parts[2], parts[1]
        with self.assertRaises(ValueError):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_nonconsecutive_idat(self):
        parts = self.source_chunks()
        image = next(content for kind, content in parts if kind == b"IDAT")
        parts = [(kind, content) for kind, content in parts if kind != b"IDAT"]
        parts[2:2] = [(b"IDAT", image[:100]), (b"tEXt", b"Comment\x00valid"), (b"IDAT", image[100:])]
        with self.assertRaisesRegex(ValueError, "consecutive"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_trailing_zlib_bytes_inside_idat(self):
        parts = [(kind, content + b"extra" if kind == b"IDAT" else content) for kind, content in self.source_chunks()]
        with self.assertRaisesRegex(ValueError, "trailing compressed"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_invalid_indexed_bit_depth(self):
        parts = self.source_chunks()
        header = bytearray(parts[0][1])
        header[8] = 16
        parts[0] = (b"IHDR", bytes(header))
        with self.assertRaisesRegex(ValueError, "unsupported PNG"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_unknown_critical_chunk(self):
        parts = self.source_chunks()
        parts.insert(1, (b"ABCD", b""))
        with self.assertRaisesRegex(ValueError, "critical"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_duplicate_ihdr(self):
        parts = self.source_chunks()
        parts.insert(1, parts[0])
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.validate_bytes(self.rebuild_chunks(parts))


if __name__ == "__main__":
    unittest.main()
