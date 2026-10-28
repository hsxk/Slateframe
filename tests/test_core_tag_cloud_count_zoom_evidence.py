"""Fail-closed regression for the Core Tag Cloud 400% RTL screenshot."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib
from verify_core_tag_cloud_count_zoom_evidence import CAPTURE, verify

ROOT = Path(__file__).resolve().parents[1]

def png_header(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt:
        crc ^= 1
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", crc)

class CoreTagCloudCountZoomEvidence(unittest.TestCase):
    def test_runtime_and_browser_contract(self):
        css = (ROOT / "assets/css/core-tag-cloud.css").read_text()
        js = (ROOT / "tests/browser/core-tag-cloud-parity.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertIn(".tag-link-count{white-space:normal;overflow-wrap:anywhere}", css)
        self.assertNotIn(".tag-link-count{white-space:nowrap}", css)
        self.assertLessEqual(len(css.encode()), 400)
        for marker in ("await setRootTextScale(page, 64, 'rtl');",
                       "getComputedStyle(node).fontSize", "for (const viewportWidth of [320, 390])",
                       "await stressLink.scrollIntoViewIfNeeded();",
                       "await expect(stressLink).toBeFocused();", "fullPage: false", CAPTURE):
            self.assertIn(marker, js)
        self.assertIn(CAPTURE, workflow)
        self.assertIn("python3 tests/verify_core_tag_cloud_count_zoom_evidence.py", workflow)
        self.assertIn("new AxeBuilder", js)
        self.assertIn("openAuthenticatedEditor", js)

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
