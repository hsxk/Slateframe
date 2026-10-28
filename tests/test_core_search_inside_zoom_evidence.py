"""Prevent missing, linked or corrupt Core Search 400% browser evidence."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_search_inside_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, data):
    payload = kind + data
    return (struct.pack(">I", len(data)) + payload
            + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF))


def png(width=390, height=900):
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    scanline = b"\x00" + b"\x00" * (width * 3)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(scanline * height))
            + chunk(b"IEND", b""))


class CoreSearchInsideZoomEvidence(unittest.TestCase):
    def test_real_wordpress_matrix_and_ci_gate(self):
        browser = (ROOT / "tests/browser/core-search-button-inside.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertIn("for (const font of [16,32,64])", browser)
        self.assertNotIn("width <= 640 ? [16,32,64] : [16,32]", browser)
        self.assertIn("expect(g.rootFont", browser)
        self.assertIn("await button.scrollIntoViewIfNeeded()", browser)
        self.assertIn("python3 tests/verify_core_search_inside_zoom_evidence.py", workflow)
        for name in CAPTURES:
            self.assertIn(name, browser)
            self.assertIn(name, workflow)

    def test_reject_missing_corrupt_truncated_wrong_size_and_non_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            verify(root)
            for name in CAPTURES:
                path = root / name
                path.unlink()
                with self.assertRaises(FileNotFoundError):
                    verify(root)
                path.write_bytes(png(width=320))
                with self.assertRaises(ValueError):
                    verify(root)
                path.write_bytes(png()[:-12])
                with self.assertRaises(ValueError):
                    verify(root)
                damaged = bytearray(png())
                damaged[-20] ^= 1
                path.write_bytes(damaged)
                with self.assertRaises(ValueError):
                    verify(root)
                path.write_bytes(b"not a png")
                with self.assertRaises(ValueError):
                    verify(root)
                path.write_bytes(png())
            verify(root)

    def test_reject_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            target = root / "target.png"
            target.write_bytes(png())
            linked = root / CAPTURES[0]
            linked.unlink()
            linked.symlink_to(target)
            with self.assertRaisesRegex(ValueError, "linked screenshot"):
                verify(root)


if __name__ == "__main__":
    unittest.main()
