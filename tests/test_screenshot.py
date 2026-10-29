"""Regression tests for the shipped PNG decoder contract."""
import importlib.util
import os
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

    @classmethod
    def indexed_fixture_chunks(cls):
        """Construct a valid indexed PNG independently of the shipped screenshot format."""
        width, height = 1200, 900
        header = struct.pack(">IIBBBBB", width, height, 1, 3, 0, 0, 0)
        palette = b"\x00\x00\x00\xff\xff\xff"
        scanline = b"\x00" + b"\x00" * ((width + 7) // 8)
        image = zlib.compress(scanline * height)
        return [(b"IHDR", header), (b"PLTE", palette),
                (b"IDAT", image), (b"IEND", b"")]

    def test_synthetic_indexed_fixture_decodes(self):
        self.validate_bytes(self.rebuild_chunks(self.indexed_fixture_chunks()))

    def test_rejects_symlinked_screenshot(self):
        with tempfile.TemporaryDirectory() as directory:
            original = Path(directory) / 'original.png'
            original.write_bytes(self.original)
            linked = Path(directory) / 'linked.png'
            linked.symlink_to(original)
            with self.assertRaisesRegex(ValueError, 'symlinked'):
                MODULE.validate(linked)

    def test_rejects_symlinked_parent_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            original = Path(directory) / 'real'
            original.mkdir()
            (original / 'screenshot.png').write_bytes(self.original)
            linked = Path(directory) / 'alias'
            linked.symlink_to(original, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'symlinked'):
                MODULE.validate(linked / 'screenshot.png')

    def test_rejects_hardlinked_screenshot(self):
        with tempfile.TemporaryDirectory() as directory:
            original = Path(directory) / 'original.png'
            original.write_bytes(self.original)
            linked = Path(directory) / 'linked.png'
            os.link(original, linked)
            with self.assertRaisesRegex(ValueError, 'hardlinked'):
                MODULE.validate(linked)

    def test_rejects_oversized_screenshot_without_loading_it(self):
        with tempfile.TemporaryDirectory() as directory:
            oversized = Path(directory) / 'oversized.png'
            with oversized.open('wb') as target:
                target.truncate(MODULE.MAX_FILE_BYTES + 1)
            with self.assertRaisesRegex(ValueError, 'oversized'):
                MODULE.validate(oversized)

    def test_rejects_non_regular_screenshot(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, 'non-regular'):
                MODULE.validate(Path(directory))

    def test_rejects_invalid_chunk_type_bytes(self):
        parts = self.source_chunks()
        parts.insert(1, (b'tE1t', b'bad'))
        with self.assertRaisesRegex(ValueError, 'chunk type'):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_lowercase_reserved_chunk_bit(self):
        parts = self.source_chunks()
        parts.insert(1, (b'tExt', b'bad'))
        with self.assertRaisesRegex(ValueError, 'reserved chunk bit'):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_release_builder_keeps_executable_mode(self):
        self.assertTrue((ROOT / "bin" / "build-theme-zip.sh").stat().st_mode & 0o111)

    def test_rejects_indexed_png_without_palette(self):
        parts = [(kind, content) for kind, content in self.indexed_fixture_chunks() if kind != b"PLTE"]
        with self.assertRaisesRegex(ValueError, "palette"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_idat_before_palette(self):
        parts = self.indexed_fixture_chunks()
        parts[1], parts[2] = parts[2], parts[1]
        with self.assertRaisesRegex(ValueError, "PLTE"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_nonconsecutive_idat(self):
        parts = self.indexed_fixture_chunks()
        image = parts[2][1]
        parts[2:3] = [(b"IDAT", image[:8]), (b"tEXt", b"Comment\x00valid"),
                      (b"IDAT", image[8:])]
        with self.assertRaisesRegex(ValueError, "consecutive"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_trailing_zlib_bytes_inside_idat(self):
        parts = [(kind, content + b"extra" if kind == b"IDAT" else content) for kind, content in self.source_chunks()]
        with self.assertRaisesRegex(ValueError, "trailing compressed"):
            self.validate_bytes(self.rebuild_chunks(parts))

    def test_rejects_invalid_indexed_bit_depth(self):
        parts = self.indexed_fixture_chunks()
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
