"""Reject desktop-width crops mislabeled as narrow RTL FAQ evidence."""
from pathlib import Path
import re
import struct
import tempfile
import unittest
import zlib

import verify_browser_inventory as inventory

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tests/verify_browser_inventory.py'


class FaqViewportWidth(unittest.TestCase):
    def test_every_required_faq_crop_has_correct_viewport_limit(self):
        self.assertEqual(set(inventory.FAQ_VIEWPORT_WIDTH), inventory.REQUIRED_FAQ)
        for name, limit in inventory.FAQ_VIEWPORT_WIDTH.items():
            with self.subTest(name=name):
                self.assertEqual(limit, 1440 if '-1440-' in name else 390)

    def test_mobile_crops_cannot_be_desktop_sized(self):
        name = 'gutenberg-knowledge-faq-390-rtl-200-forced-colors.png'
        inventory.check_faq_viewport_width(name, 390)
        inventory.check_faq_viewport_width(name, 200)
        with self.assertRaisesRegex(ValueError, 'FAQ crop exceeds viewport'):
            inventory.check_faq_viewport_width(name, 391)
        with self.assertRaisesRegex(ValueError, 'FAQ crop exceeds viewport'):
            inventory.check_faq_viewport_width(name, 1440)

    def test_desktop_element_crop_can_be_narrower(self):
        name = 'gutenberg-knowledge-faq-1440-ltr.png'
        inventory.check_faq_viewport_width(name, 736)
        inventory.check_faq_viewport_width(name, 1440)
        with self.assertRaisesRegex(ValueError, 'FAQ crop exceeds viewport'):
            inventory.check_faq_viewport_width(name, 1441)

    @staticmethod
    def _png(width, height=120):
        def chunk(kind, payload):
            return (struct.pack('>I', len(payload)) + kind + payload +
                    struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff))
        header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        raster = (b'\x00' + b'\x00' * (width * 3)) * height
        return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) +
                chunk(b'IDAT', zlib.compress(raster)) + chunk(b'IEND', b''))

    def _fixture(self, root):
        for name in inventory.REQUIRED_SCREENSHOTS:
            match = re.search(r'viewport-(320|375|390|412|768|1440|1920)', name)
            width = int(match.group(1)) if match else (1440 if '-1440-' in name else 390)
            (root / name).write_bytes(self._png(width))

    def test_real_scan_rejects_mislabeled_mobile_crop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._fixture(root)
            name = 'knowledge-faq-axe-390-rtl-closed.png'
            (root / name).write_bytes(self._png(391))
            with self.assertRaisesRegex(ValueError, 'FAQ crop exceeds viewport'):
                inventory.scan(root)

    def test_real_scan_accepts_desktop_element_crop(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self._fixture(root)
            name = 'gutenberg-knowledge-faq-1440-ltr.png'
            (root / name).write_bytes(self._png(736))
            self.assertEqual(len(inventory.scan(root)), len(inventory.REQUIRED_SCREENSHOTS))

    def test_other_crops_not_subject_to_faq_width_limit(self):
        inventory.check_faq_viewport_width('viewport-320-page.png', 390)
        self.assertIn('check_faq_viewport_width(path.name, actual_width)', SOURCE.read_text())


if __name__ == '__main__':
    unittest.main()
