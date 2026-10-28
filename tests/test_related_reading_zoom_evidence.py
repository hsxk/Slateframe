"""Discovery and 404 long-text reflow must have complete 400% PNG evidence."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_related_reading_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, payload):
    body = kind + payload
    return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def png(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
    scanline = b"\x00" + b"\x00" * (width * 3)
    data += chunk(b"IDAT", zlib.compress(scanline * height))
    data += chunk(b"IEND", b"")
    return data[:-8] + b"broken!!" if corrupt else data


class RelatedReadingZoomEvidence(unittest.TestCase):
    def test_runtime_browser_and_workflow_contract(self):
        css = (ROOT / "assets/css/publishing.css").read_text(encoding="utf-8")
        base = (ROOT / "style.css").read_text(encoding="utf-8")
        spec = (ROOT / "tests/browser/related-reading-zoom.spec.js").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        # Core-first inherited wrapping already exists. Do not duplicate CSS
        # or weaken any shared runtime budget merely to add screenshot tests.
        self.assertLessEqual(len(css.encode("utf-8")), 4500)
        self.assertRegex(base, r"body\{[^}]*overflow-wrap:anywhere")
        self.assertNotIn("overflow-wrap:normal", css)
        for token in ("await setRootTextScale(page, font, dir)",
                      "for (const width of [320, 375, 390, 412, 768, 1440, 1920])",
                      "new AxeBuilder", "scrollIntoViewIfNeeded", "fullPage: false",
                      "related-reading", "404-recovery", "post-navigation"):
            self.assertIn(token, spec)
        for name in CAPTURES:
            self.assertIn(name, workflow)
        self.assertIn("python3 tests/verify_related_reading_zoom_evidence.py", workflow)

    def test_missing_truncated_crc_wrong_size_and_non_png_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            verify(root)
            for name in CAPTURES:
                target = root / name
                target.unlink()
                with self.assertRaises(FileNotFoundError):
                    verify(root)
                target.write_bytes(png(width=320))
                with self.assertRaisesRegex(ValueError, "390x900"):
                    verify(root)
                target.write_bytes(png(corrupt=True))
                with self.assertRaisesRegex(ValueError, "corrupt PNG chunk|invalid PNG end"):
                    verify(root)
                target.write_bytes(png()[:-12])
                with self.assertRaisesRegex(ValueError, "incomplete PNG"):
                    verify(root)
                target.write_bytes(b"not a png")
                with self.assertRaisesRegex(ValueError, "PNG signature"):
                    verify(root)
                target.write_bytes(png())
            verify(root)


if __name__ == "__main__":
    unittest.main()
