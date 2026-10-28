"""Guard complete, bounded and unlinked real Knowledge FAQ screenshot evidence."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_knowledge_faq_zoom_evidence import CAPTURES, verify

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


class KnowledgeFaqZoomEvidence(unittest.TestCase):
    def test_real_wordpress_matrix_and_hard_gate(self):
        browser = (ROOT / "tests/browser/knowledge-faq-400-zoom.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        for marker in ("WP_Block_Patterns_Registry", "setRootTextScale(page, font, direction)",
                       "for (const font of [16, 32, 64])", "state.rootFont",
                       "await summary.scrollIntoViewIfNeeded()", "summary.press('Enter')",
                       "summary.press('Space')", "forcedColors: 'active'"):
            self.assertIn(marker, browser)
        self.assertIn("python3 tests/verify_knowledge_faq_zoom_evidence.py", workflow)
        self.assertIn("'test-artifacts/screenshots/knowledge-faq-390-' + direction + '-400.png'", browser)
        self.assertIn("for (const direction of ['ltr', 'rtl'])", browser)
        self.assertIn(CAPTURES[2], browser)
        for name in CAPTURES:
            self.assertIn(name, workflow)

    def test_corruption_and_dimensions(self):
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
                for bad in (png(width=320), png(height=899), png()[:-12], b"not a PNG"):
                    path.write_bytes(bad)
                    with self.assertRaises(ValueError):
                        verify(root)
                damaged = bytearray(png())
                damaged[-20] ^= 1
                path.write_bytes(damaged)
                with self.assertRaises(ValueError):
                    verify(root)
                path.write_bytes(png())
            verify(root)

    def test_reject_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            target = root / "target.png"
            target.write_bytes(png())
            link = root / CAPTURES[0]
            link.unlink()
            link.symlink_to(target)
            with self.assertRaisesRegex(ValueError, "linked screenshot"):
                verify(root)


if __name__ == "__main__":
    unittest.main()
