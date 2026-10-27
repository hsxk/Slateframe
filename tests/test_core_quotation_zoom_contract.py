"""Keep native Core quotation 400% acceptance tied to computed Chromium text."""

from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_quotation_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def png_header(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt:
        crc ^= 1
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", crc)


class CoreQuotationZoomContract(unittest.TestCase):
    def test_real_root_scale_and_native_quotation_semantics(self):
        for block in ("quote", "pullquote", "verse"):
            with self.subTest(block=block):
                source = (ROOT / f"tests/browser/core-{block}-parity.spec.js").read_text()
                self.assertIn("require('./support/root-text-scale')", source)
                self.assertIn("await setRootTextScale(page, font, dir);", source)
                self.assertIn("await setRootTextScale(page, 32, 'rtl');", source)
                self.assertIn("await setRootTextScale(page, 64, 'rtl');", source)
                self.assertNotIn("style.fontSize", source)
                self.assertIn("320, 375, 390, 412, 768, 1440, 1920", source)
                self.assertIn("'ltr', 'rtl'", source)
                self.assertIn("AxeBuilder", source)
                self.assertIn("openAuthenticatedEditor", source)
                self.assertIn("fullPage: false", source)
                self.assertIn(f"core-{block}-390-", source)
                self.assertIn(f"core-{block}-390-rtl-400-forced-colors.png", source)

    def test_nine_captures_required_in_actions(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertEqual(len(CAPTURES), 9)
        self.assertIn("python3 tests/verify_quotation_zoom_evidence.py", workflow)
        for name in CAPTURES:
            with self.subTest(name=name):
                self.assertIn(name, workflow)

    def test_rejects_missing_corrupt_and_wrong_sized_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png_header())
            verify(root)
            target = root / CAPTURES[-1]
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


if __name__ == "__main__":
    unittest.main()
