"""Protect real 400% native Core Navigation screenshots and their CI contract."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_navigation_zoom_evidence import CAPTURES, verify

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


class CoreNavigationZoomEvidence(unittest.TestCase):
    def test_exact_screenshots_and_complete_matrix(self):
        browser = (ROOT / "tests/browser/core-navigation-targets.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertIn("for (const font of [16, 32, 64])", browser)
        self.assertIn("expect(state.rootFont", browser)
        self.assertNotIn("width === 390 ? [16, 32, 64] : [16, 32]", browser)
        self.assertIn("python3 tests/verify_core_navigation_zoom_evidence.py", workflow)
        for name in CAPTURES:
            self.assertIn(name, browser)
            self.assertIn(name, workflow)

    def test_reject_missing_corrupt_truncated_wrong_dimensions_and_non_png(self):
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
                with self.assertRaisesRegex(ValueError, "390x900"):
                    verify(root)
                path.write_bytes(png()[:-12])
                with self.assertRaisesRegex(ValueError, "incomplete PNG"):
                    verify(root)
                damaged = bytearray(png())
                damaged[-20] ^= 1
                path.write_bytes(damaged)
                with self.assertRaisesRegex(ValueError, "corrupt PNG chunk"):
                    verify(root)
                path.write_bytes(b"not a png")
                with self.assertRaisesRegex(ValueError, "PNG signature"):
                    verify(root)
                path.write_bytes(png())
            verify(root)

    def test_reject_linked_evidence(self):
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
