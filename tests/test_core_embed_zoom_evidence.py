"""Core Embed fallback controls and genuine 400% screenshot contract."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_embed_zoom_evidence import CAPTURE, verify

ROOT = Path(__file__).resolve().parents[1]


def png_header(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt:
        crc ^= 1
    return b"\\x89PNG\\r\\n\\x1a\\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", crc)


class CoreEmbedZoomEvidence(unittest.TestCase):
    def test_native_fallback_target_and_computed_zoom(self):
        css = (ROOT / "assets/css/core-embed.css").read_text(encoding="utf-8")
        js = (ROOT / "tests/browser/core-embed-parity.spec.js").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        self.assertIn(".wp-block-embed__wrapper>a", css)
        self.assertIn("min-block-size:var(--slateframe-control)", css)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertIn("await setRootTextScale(page, 16, direction);", js)
        self.assertIn("await setRootTextScale(page, 32, 'rtl');", js)
        self.assertIn("await setRootTextScale(page, 64, 'rtl');", js)
        self.assertIn("fallback link 44px target", js)
        self.assertIn("forcedColors: 'active'", js)
        self.assertIn("fullPage: false", js)
        self.assertIn(CAPTURE, js)
        self.assertIn(CAPTURE, workflow)
        self.assertIn("python3 tests/verify_core_embed_zoom_evidence.py", workflow)
        self.assertIn("new AxeBuilder", js)
        self.assertIn("openAuthenticatedEditor", js)
        self.assertIn("320, 375, 390, 412, 768, 1440, 1920", js)
        self.assertNotIn("style.fontSize", js)

    def test_missing_corrupt_wrong_size_and_non_png_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target = root / CAPTURE
            target.write_bytes(png_header())
            verify(root)
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
