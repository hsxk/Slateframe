"""Native Core RSS/Archives exact 400% viewport screenshot regression."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_feeds_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def png_header(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt:
        crc ^= 1
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", crc)


class CoreFeedsZoomEvidence(unittest.TestCase):
    def test_native_wordpress_computed_scale_and_focus(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for block in ("rss", "archives"):
            spec = (ROOT / f"tests/browser/core-{block}-parity.spec.js").read_text(encoding="utf-8")
            self.assertIn("await setRootTextScale(page, 16, dir);", spec) if block == "rss" else self.assertIn("await setRootTextScale(page, font, dir);", spec)
            self.assertIn("await setRootTextScale(page, 32, 'rtl');", spec)
            self.assertIn("await setRootTextScale(page, 64, 'rtl');", spec)
            self.assertIn("for (const width of [320, 390])", spec)
            self.assertIn("await page.screenshot({", spec)
            self.assertIn("fullPage: false", spec)
            self.assertIn(f"core-{block}-390-rtl-400-forced-colors.png", spec)
            self.assertIn(f"core-{block}-390-rtl-400-forced-colors.png", workflow)
            self.assertIn("new AxeBuilder", spec)
            self.assertIn("openAuthenticatedEditor", spec)
        self.assertIn("python3 tests/verify_core_feeds_zoom_evidence.py", workflow)

    def test_missing_corrupt_wrong_size_and_non_png_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in CAPTURES:
                (root / name).write_bytes(png_header())
            verify(root)
            for name in CAPTURES:
                target = root / name
                target.unlink()
                with self.assertRaises(FileNotFoundError):
                    verify(root)
                target.write_bytes(png_header(width=320))
                with self.assertRaisesRegex(ValueError, "390x900"):
                    verify(root)
                target.write_bytes(png_header(corrupt=True))
                with self.assertRaisesRegex(ValueError, "corrupt IHDR"):
                    verify(root)
                target.write_bytes(b"not a png")
                with self.assertRaisesRegex(ValueError, "PNG signature"):
                    verify(root)
                target.write_bytes(png_header())
            verify(root)


if __name__ == "__main__":
    unittest.main()
