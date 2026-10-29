"""Fail closed when Social Links 400% screenshots are missing or invalid."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_social_links_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, data):
    payload = kind + data
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xffffffff)


def png(width=390, height=900):
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    scanline = b'\x00' + b'\x00' * (width * 3)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(scanline * height)) + chunk(b'IEND', b'')


class SocialLinksEvidence(unittest.TestCase):
    def test_exact_head_ci_contract(self):
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        browser = (ROOT / 'tests/browser/core-social-links-parity.spec.js').read_text()
        self.assertIn('python3 tests/verify_core_social_links_zoom_evidence.py', workflow)
        self.assertIn('largeAxe', browser)
        for name in CAPTURES:
            self.assertIn(name, workflow)
            self.assertIn(name, browser)

    def test_reject_missing_dimensions_corruption_and_symlinks(self):
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
            path.write_bytes(png())
            target = root / 'target.png'
            target.write_bytes(png())
            path.unlink()
            path.symlink_to(target)
            with self.assertRaisesRegex(ValueError, 'linked screenshot'):
                verify(root)


if __name__ == '__main__':
    unittest.main()
