"""Regression guard for long multilingual native Core Footnotes return links."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_footnote_long_label_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, data):
    return (struct.pack(">I", len(data)) + kind + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF))


def png(width=390, height=900):
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    scanline = b"\x00" + b"\x00" * (width * 3)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(scanline * height))
            + chunk(b"IEND", b""))


class CoreFootnoteLongLabelEvidence(unittest.TestCase):
    def test_core_first_runtime_fix_and_budget(self):
        css = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        base = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertNotIn('.slateframe-prose .wp-block-footnotes a[href^="#"]{overflow-wrap:normal}', css)
        self.assertRegex(base, r"body\{[^}]*overflow-wrap:anywhere")
        self.assertLessEqual(len(css.encode("utf-8")), 7000)

    def test_real_browser_matrix_and_ci_evidence(self):
        spec = (ROOT / "tests/browser/core-footnotes-navigation.spec.js").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in ("[320, 375, 390, 412, 768, 1440, 1920]", "[16, 32, 64]",
                      "setRootTextScale(page, font, dir)", "forcedColors: 'active'",
                      "new AxeBuilder", "fullPage: false", "document containment"):
            self.assertIn(token, spec)
        self.assertEqual(len(CAPTURES), 3)
        for name in CAPTURES:
            self.assertIn(name, spec)
        self.assertIn("python3 tests/verify_footnote_long_label_evidence.py", workflow)

    def test_valid_missing_wrong_size_truncated_crc_non_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            verify(root)
            for name in CAPTURES:
                path = root / name
                path.unlink()
                with self.assertRaisesRegex(ValueError, "missing"):
                    verify(root)
                path.write_bytes(png(width=320))
                with self.assertRaisesRegex(ValueError, "390x900"):
                    verify(root)
                path.write_bytes(png()[:-12])
                with self.assertRaisesRegex(ValueError, "incomplete|truncated"):
                    verify(root)
                damaged = bytearray(png())
                damaged[25] ^= 1
                path.write_bytes(damaged)
                with self.assertRaisesRegex(ValueError, "CRC"):
                    verify(root)
                path.write_bytes(b"not a PNG")
                with self.assertRaisesRegex(ValueError, "signature"):
                    verify(root)
                path.write_bytes(png())
            verify(root)

    def test_linked_evidence_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / "actual.png"
            target.write_bytes(png())
            for name in CAPTURES:
                (root / name).write_bytes(png())
            path = root / CAPTURES[0]
            path.unlink()
            path.symlink_to(target)
            with self.assertRaisesRegex(ValueError, "linked"):
                verify(root)


if __name__ == "__main__":
    unittest.main()
