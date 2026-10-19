"""Protect FAQ evidence producers, inventory names and minimum visible crops.

This is a no-network static contract: actual screenshot acceptance still requires
real WordPress/Chromium artifacts from the exact commit SHA.
"""
import ast
from pathlib import Path
import re
import struct
import tempfile
import unittest
import zlib

import verify_browser_inventory as inventory

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / 'tests/verify_browser_inventory.py'
EDITOR = ROOT / 'tests/browser/knowledge-faq-editor.spec.js'
AXE = ROOT / 'tests/browser/knowledge-faq-axe.spec.js'


class FaqEvidenceIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inventory = INVENTORY.read_text(encoding='utf-8')
        cls.editor = EDITOR.read_text(encoding='utf-8')
        cls.axe = AXE.read_text(encoding='utf-8')
        tree = ast.parse(cls.inventory)
        names = {'REQUIRED_FAQ', 'FAQ_MIN_CROP_HEIGHT'}
        cls.assignments = {
            target.id: node.value
            for node in tree.body if isinstance(node, ast.Assign)
            for target in node.targets if isinstance(target, ast.Name) and target.id in names
        }
        cls.faq = frozenset(ast.literal_eval(cls.assignments['REQUIRED_FAQ'].args[0]))
        cls.crop_limits = ast.literal_eval(cls.assignments['FAQ_MIN_CROP_HEIGHT'])
        fn = next(node for node in tree.body if isinstance(node, ast.FunctionDef)
                  and node.name == 'check_faq_crop_dimensions')
        cls.namespace = {'FAQ_MIN_CROP_HEIGHT': cls.crop_limits}
        exec(compile(ast.Module(body=[fn], type_ignores=[]), str(INVENTORY), 'exec'), cls.namespace)

    def test_all_nine_required_faq_names_are_produced(self):
        self.assertEqual(len(self.faq), 9)
        expected = {
            'gutenberg-knowledge-faq-390-rtl-200-forced-colors.png',
            'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png',
            'gutenberg-knowledge-faq-1440-ltr.png',
            'knowledge-faq-axe-390-rtl-expanded-200-forced-colors.png',
            'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png',
        }
        expected.update(f'knowledge-faq-axe-{width}-{direction}-{state}.png'
                        for width, direction in ((390, 'rtl'), (1440, 'ltr'))
                        for state in ('closed', 'expanded'))
        self.assertEqual(self.faq, expected)
        for name in (item for item in expected if item.startswith('gutenberg-')):
            with self.subTest(name=name):
                self.assertIn(name, self.editor)
        for name in ('knowledge-faq-axe-390-rtl-expanded-200-forced-colors.png',
                     'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png'):
            self.assertIn(name, self.axe)
        for marker in ("{ width: 390, direction: 'rtl' }", "{ width: 1440, direction: 'ltr' }",
                       "(expanded ? 'expanded' : 'closed') + '.png'"):
            self.assertIn(marker, self.axe)

    def test_final_paragraph_crop_must_be_multiline_height(self):
        name = 'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png'
        self.assertIn(name, self.faq)
        self.assertEqual(self.crop_limits[name], 80)
        with self.assertRaisesRegex(ValueError, 'Incomplete FAQ visual crop'):
            self.namespace['check_faq_crop_dimensions'](name, 79)
        self.namespace['check_faq_crop_dimensions'](name, 80)
        self.namespace['check_faq_crop_dimensions'](name, 200)

    def test_keyboard_focus_crop_preserves_control_height(self):
        name = 'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png'
        self.assertIn(name, self.faq)
        self.assertEqual(self.crop_limits[name], 44)
        with self.assertRaisesRegex(ValueError, 'Incomplete FAQ visual crop'):
            self.namespace['check_faq_crop_dimensions'](name, 43)
        self.namespace['check_faq_crop_dimensions'](name, 44)

    def test_other_screenshots_are_not_given_arbitrary_height_thresholds(self):
        self.namespace['check_faq_crop_dimensions']('viewport-320-page.png', 24)
        self.namespace['check_faq_crop_dimensions']('knowledge-faq-axe-1440-ltr-closed.png', 24)
        self.assertIn('check_faq_crop_dimensions(path.name, height)', self.inventory)
        self.assertIn('actual_width, height = validate_png(path, width)', self.inventory)

    @staticmethod
    def _png(width, height):
        def chunk(kind, payload):
            return (struct.pack('>I', len(payload)) + kind + payload +
                    struct.pack('>I', zlib.crc32(kind + payload) & 0xffffffff))
        header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
        raster = (b'\x00' + b'\x00' * (width * 3)) * height
        return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) +
                chunk(b'IDAT', zlib.compress(raster)) + chunk(b'IEND', b''))

    def _fixture(self, root, short_name=None, short_height=None):
        for name in inventory.REQUIRED_SCREENSHOTS:
            viewport = re.search(r'(?:viewport-|faq-axe-|gutenberg-knowledge-faq-)(320|375|390|412|768|1440|1920)', name)
            width = int(viewport.group(1)) if viewport else 390
            height = 120
            if name == short_name:
                height = short_height
            (root / name).write_bytes(self._png(width, height))

    def test_real_inventory_scan_accepts_complete_valid_png_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._fixture(root)
            records = inventory.scan(root)
            self.assertEqual(set(records), inventory.REQUIRED_SCREENSHOTS)
            self.assertEqual(len(records), len(inventory.REQUIRED_SCREENSHOTS))

    def test_real_inventory_scan_rejects_short_final_paragraph(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            name = 'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png'
            self._fixture(root, name, 79)
            with self.assertRaisesRegex(ValueError, 'Incomplete FAQ visual crop'):
                inventory.scan(root)

    def test_real_inventory_scan_rejects_short_keyboard_focus(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            name = 'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png'
            self._fixture(root, name, 43)
            with self.assertRaisesRegex(ValueError, 'Incomplete FAQ visual crop'):
                inventory.scan(root)

    def test_real_inventory_scan_rejects_missing_required_faq(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._fixture(root)
            (root / 'knowledge-faq-axe-390-rtl-closed.png').unlink()
            for index in range(50):
                (root / f'extra-{index}.png').write_bytes(self._png(390, 120))
            with self.assertRaisesRegex(ValueError, 'Missing required visual coverage'):
                inventory.scan(root)

    def test_real_inventory_scan_rejects_symlinked_faq_crop(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._fixture(root)
            name = 'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png'
            (root / name).unlink()
            (root / name).symlink_to(root / 'gutenberg-knowledge-faq-1440-ltr.png')
            with self.assertRaisesRegex(ValueError, 'Linked or nonregular artifact entry'):
                inventory.scan(root)

    def test_real_inventory_scan_rejects_wrong_full_page_viewport(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._fixture(root)
            (root / 'viewport-320-page.png').write_bytes(self._png(390, 120))
            with self.assertRaisesRegex(ValueError, 'Full-page viewport width mismatch'):
                inventory.scan(root)

    def test_real_inventory_scan_rejects_truncated_faq_png(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self._fixture(root)
            (root / 'knowledge-faq-axe-390-rtl-closed.png').write_bytes(b'\x89PNG\r\n\x1a\n')
            with self.assertRaisesRegex(ValueError, 'Invalid screenshot PNG'):
                inventory.scan(root)

    def test_producers_preserve_exact_wordpress_and_accessibility_checks(self):
        for text in ("WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')",
                     "await closingParagraph.scrollIntoViewIfNeeded()",
                     "expect(closingGeometry.outsideFrame).toBe(false)"):
            self.assertIn(text, self.editor)
        for text in (".withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])",
                     "page.keyboard.press('Shift+Tab')",
                     "node.matches(':focus-visible')"):
            self.assertIn(text, self.axe)


if __name__ == '__main__':
    unittest.main()
