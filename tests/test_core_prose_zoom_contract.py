"""Prevent false 400% claims in native Core prose and Query Loop links."""

from pathlib import Path
import struct
import unittest
import zlib

from verify_prose_zoom_evidence import CAPTURES, check_capture, verify

ROOT = Path(__file__).resolve().parents[1]
BROWSER = ROOT / "tests" / "browser"


def png_header(width=390, height=900, corrupt_crc=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt_crc:
        crc ^= 1
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", len(ihdr)) + chunk + struct.pack(">I", crc)


class CoreProseZoomContract(unittest.TestCase):
    def test_computed_root_scale_in_four_core_suites(self):
        for name in (
            "core-paragraph-parity.spec.js",
            "core-heading-parity.spec.js",
            "core-read-more-parity.spec.js",
            "core-post-excerpt-parity.spec.js",
        ):
            with self.subTest(name=name):
                source = (BROWSER / name).read_text(encoding="utf-8")
                self.assertIn("require('./support/root-text-scale')", source)
                self.assertIn("await setRootTextScale(page, font, dir);", source)
                self.assertIn("await setRootTextScale(page, 32, 'rtl');", source)
                self.assertIn("await setRootTextScale(page, 64, 'rtl');", source)
                self.assertNotIn("style.fontSize", source)

    def test_six_viewport_captures_are_required_by_workflow(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        self.assertEqual(len(CAPTURES), 6)
        self.assertIn("python3 tests/verify_prose_zoom_evidence.py", workflow)
        for name in CAPTURES:
            with self.subTest(name=name):
                self.assertIn(name, workflow)
                block = name.split("-390-")[0]
                source = (BROWSER / (block + "-parity.spec.js")).read_text(encoding="utf-8")
                self.assertIn("core-" + block[5:] + "-390-", source)
                self.assertIn("fullPage: false", source)

    def test_png_header_rejects_wrong_dimensions_and_crc(self):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path = root / CAPTURES[0]
            path.write_bytes(png_header())
            check_capture(path)
            path.write_bytes(png_header(width=320))
            with self.assertRaisesRegex(ValueError, "390x900"):
                check_capture(path)
            path.write_bytes(png_header(corrupt_crc=True))
            with self.assertRaisesRegex(ValueError, "corrupt IHDR"):
                check_capture(path)
            path.write_bytes(b"not a png")
            with self.assertRaisesRegex(ValueError, "PNG signature"):
                check_capture(path)
            with self.assertRaises(OSError):
                verify(root)


if __name__ == "__main__":
    unittest.main()
