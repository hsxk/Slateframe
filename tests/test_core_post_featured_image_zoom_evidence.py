"""Core Post Featured Image 400% evidence must be genuine, complete and unlinked."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_core_post_featured_image_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, data):
    payload = kind + data
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xffffffff)


def png(width=390, height=900):
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    scanline = b'\x00' + b'\x00' * (width * 3)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(scanline * height)) + chunk(b'IEND', b'')


class CorePostFeaturedImageZoomEvidence(unittest.TestCase):
    def test_full_computed_matrix_and_mandatory_ci(self):
        browser = (ROOT / 'tests/browser/core-post-featured-image-parity.spec.js').read_text()
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        for needle in (
            'for (const font of [16, 32, 64])',
            "for (const dir of ['ltr', 'rtl'])",
            'await setRootTextScale(page, font, dir)',
            'expect(state.rootFont',
            'expect(state.direction',
            'await linked.scrollIntoViewIfNeeded()',
            'await expect(linked).toBeFocused()',
            'openAuthenticatedEditor',
        ):
            self.assertIn(needle, browser)
        self.assertIn('python3 tests/verify_core_post_featured_image_zoom_evidence.py', workflow)
        for name in CAPTURES:
            self.assertIn(name, workflow)
        self.assertIn("'test-artifacts/screenshots/core-post-featured-image-390-' + dir + '-400.png'", browser)
        self.assertIn(CAPTURES[-1], browser)

    def test_reject_missing_wrong_size_truncation_crc_and_non_png(self):
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
                path.write_bytes(b'not png')
                with self.assertRaises(ValueError):
                    verify(root)
                path.write_bytes(png())
            verify(root)

    def test_reject_linked_capture_and_linked_parent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            target = root / 'target.png'
            target.write_bytes(png())
            path = root / CAPTURES[0]
            path.unlink()
            path.symlink_to(target)
            with self.assertRaisesRegex(ValueError, 'linked screenshot'):
                verify(root)
            path.unlink()
            path.write_bytes(png())
            linked_root = root.parent / (root.name + '-linked')
            linked_root.symlink_to(root, target_is_directory=True)
            try:
                with self.assertRaisesRegex(ValueError, 'linked screenshot'):
                    verify(linked_root)
            finally:
                linked_root.unlink()


if __name__ == '__main__':
    unittest.main()
