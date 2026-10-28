"""Reject missing, linked, truncated and corrupt native Categories screenshots."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_categories_zoom_evidence import CAPTURES, verify

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


class CoreCategoriesZoomEvidence(unittest.TestCase):
    def test_exact_matrix_and_workflow_gate(self):
        browser = (ROOT / "tests/browser/core-categories-parity.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertIn("for (const font of [16, 32, 64])", browser)
        self.assertIn("await setRootTextScale(page, font, dir)", browser)
        self.assertIn("expect(state.rootFont", browser)
        self.assertIn("await select.scrollIntoViewIfNeeded()", browser)
        self.assertIn("python3 tests/verify_core_categories_zoom_evidence.py", workflow)
        for name in CAPTURES:
            self.assertIn(name, workflow)
        # Two LTR/RTL captures use one generated filename; the forced-colors
        # capture is a fixed name. Check both branches without weakening the gate.
        self.assertIn("'core-categories-390-' + dir + '-400.png'", browser)
        self.assertIn("for (const dir of ['ltr', 'rtl'])", browser)
        self.assertIn(CAPTURES[2], browser)
        for direction, name in zip(('ltr', 'rtl'), CAPTURES[:2]):
            self.assertEqual('core-categories-390-' + direction + '-400.png', name)

    def test_missing_corrupt_truncated_wrong_size_non_png(self):
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
                path.write_bytes(png(width=320))
                with self.assertRaises(ValueError):
                    verify(root)
                path.write_bytes(png()[:-12])
                with self.assertRaises(ValueError):
                    verify(root)
                damaged = bytearray(png())
                damaged[-20] ^= 1
                path.write_bytes(damaged)
                with self.assertRaises(ValueError):
                    verify(root)
                path.write_bytes(b"not a png")
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
