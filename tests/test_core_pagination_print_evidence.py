"""Fail-closed regression tests for real Core Pagination print screenshots."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_pagination_print_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xffffffff)


def png(width=390, height=900):
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    scanline = b"\x00" + b"\x00" * (width * 3)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(scanline * height)) + chunk(b"IEND", b"")


class PaginationPrintEvidenceTest(unittest.TestCase):
    def test_exact_head_workflow_and_browser_captures(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertIn("python3 tests/verify_core_pagination_print_evidence.py", workflow)
        sources = (
            (ROOT / "tests/browser/core-comments-pagination-parity.spec.js").read_text(),
            (ROOT / "tests/browser/portfolio-pagination-controls.spec.js").read_text(),
        )
        for name in CAPTURES:
            self.assertIn(name, workflow)
            self.assertTrue(any(name in source for source in sources))

    def test_valid_and_reject_missing_bad_size_truncated_corrupt_and_linked(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            verify(root)
            path = root / CAPTURES[0]
            path.unlink()
            with self.assertRaises(FileNotFoundError):
                verify(root)
            path.write_bytes(png(320))
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
            path.unlink()
            target = root / "target.png"
            target.write_bytes(png())
            path.symlink_to(target)
            with self.assertRaisesRegex(ValueError, "linked screenshot"):
                verify(root)


if __name__ == "__main__":
    unittest.main()
