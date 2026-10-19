"""Guard real Core Details keyboard-focus visual evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tests/browser/knowledge-faq-axe.spec.js'


class FaqFocusCapture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding='utf-8')

    def test_keyboard_focus_and_forced_colors_remain_required(self):
        self.assertIn("await page.keyboard.press('Tab')", self.source)
        self.assertIn("node.matches(':focus-visible')", self.source)
        self.assertIn("forcedColors: 'active'", self.source)

    def test_real_outline_style_and_width_are_verified(self):
        self.assertIn('style.outlineStyle', self.source)
        self.assertIn('parseFloat(style.outlineWidth)', self.source)
        self.assertIn("expect(focusOutline.style).not.toBe('none')", self.source)
        self.assertIn('expect(focusOutline.width).toBeGreaterThan(0)', self.source)

    def test_capture_includes_context_outside_summary_box(self):
        self.assertIn('await details.nth(1).screenshot({', self.source)
        self.assertNotIn('await summaries.nth(1).screenshot({', self.source)
        self.assertIn('knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png', self.source)


if __name__ == '__main__':
    unittest.main()
