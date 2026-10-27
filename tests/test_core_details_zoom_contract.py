"""Native Core Details must prove actual 400% root text zoom and screenshot integrity."""

from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_details_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def png_header(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt:
        crc ^= 1
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", crc)


class CoreDetailsZoomContract(unittest.TestCase):
    def test_computed_scale_and_native_disclosure_behaviour(self):
        js = (ROOT / "tests/browser/core-details-parity.spec.js").read_text()
        for needle in (
            "require('./support/root-text-scale')",
            "await setRootTextScale(page, font, dir);",
            "await setRootTextScale(page, 32, 'rtl');",
            "await setRootTextScale(page, 64, 'rtl');",
            "320, 375, 390, 412, 768, 1440, 1920",
            "['ltr', 'rtl']",
            "summary.press('Enter')",
            "summary.press('Space')",
            "AxeBuilder",
            "openAuthenticatedEditor",
            "fullPage: false",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)
        self.assertNotIn("style.fontSize", js)
        for name in CAPTURES:
            self.assertIn(name.replace("ltr", "' + dir + '").replace("rtl-400.png", "' + dir + '-400.png")
                          if "forced" not in name else name, js)

    def test_ci_requires_all_three_real_viewports(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertEqual(len(CAPTURES), 3)
        self.assertIn("python3 tests/verify_core_details_zoom_evidence.py", workflow)
        for name in CAPTURES:
            with self.subTest(name=name):
                self.assertIn(name, workflow)

    def test_missing_corrupt_and_wrong_sized_pngs_fail_closed(self):
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
