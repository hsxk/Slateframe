"""Native Core metadata 400% zoom evidence and fail-closed PNG contracts."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_metadata_zoom_evidence import BLOCKS, CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def header(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt:
        crc ^= 1
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", crc)


class CoreMetadataZoomEvidence(unittest.TestCase):
    def test_computed_scale_and_native_wordpress_matrix(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        self.assertIn("python3 tests/verify_core_metadata_zoom_evidence.py", workflow)
        self.assertEqual(len(CAPTURES), 9)
        for block in BLOCKS:
            js = (ROOT / "tests/browser" / f"core-{block}-parity.spec.js").read_text(encoding="utf-8")
            self.assertIn("require('./support/root-text-scale')", js)
            self.assertIn("await setRootTextScale(page, font, dir);", js)
            self.assertIn("await setRootTextScale(page, 32, 'rtl');", js)
            self.assertIn("await setRootTextScale(page, 64, 'rtl');", js)
            self.assertIn("fullPage: false", js)
            self.assertIn("forcedColors: 'active'", js)
            self.assertIn("new AxeBuilder", js)
            self.assertIn("openAuthenticatedEditor", js)
            self.assertIn("blocks.serialize", js)
            self.assertIn("320, 375, 390, 412, 768, 1440, 1920", js)
            self.assertNotIn("style.fontSize", js)
            self.assertIn(f"core-{block}-390-' + dir + '-400.png", js)
        for name in CAPTURES:
            self.assertIn(name, workflow)

    def test_reject_missing_wrong_size_corrupt_and_non_png(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in CAPTURES:
                (root / name).write_bytes(header())
            verify(root)
            last = root / CAPTURES[-1]
            last.unlink()
            with self.assertRaises(FileNotFoundError):
                verify(root)
            last.write_bytes(header(width=320))
            with self.assertRaisesRegex(ValueError, "390x900"):
                verify(root)
            last.write_bytes(header(corrupt=True))
            with self.assertRaisesRegex(ValueError, "corrupt IHDR"):
                verify(root)
            last.write_bytes(b"not a png")
            with self.assertRaisesRegex(ValueError, "PNG signature"):
                verify(root)


if __name__ == "__main__":
    unittest.main()
