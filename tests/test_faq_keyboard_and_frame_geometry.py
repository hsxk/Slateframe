"""Regression guards for native FAQ focus and complete Gutenberg text evidence."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
AXE = ROOT / 'tests/browser/knowledge-faq-axe.spec.js'
EDITOR = ROOT / 'tests/browser/knowledge-faq-editor.spec.js'


class FaqKeyboardAndFrameGeometry(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.axe = AXE.read_text(encoding='utf-8')
        cls.editor = EDITOR.read_text(encoding='utf-8')

    def test_real_tab_and_reverse_tab_traversal(self):
        self.assertIn("page.keyboard.press('Tab')", self.axe)
        self.assertIn("page.keyboard.press('Shift+Tab')", self.axe)
        self.assertIn('await expect(summaries.nth(2)).toBeFocused()', self.axe)

    def test_keyboard_focus_visible_in_normal_and_forced_colors(self):
        self.assertGreaterEqual(self.axe.count("node.matches(':focus-visible')"), 3)
        self.assertIn('390-rtl-200-forced-colors-keyboard-focus.png', self.axe)
        self.assertIn("forcedColors: 'active'", self.axe)

    def test_tab_does_not_expand_native_details(self):
        self.assertIn("await expect(details.nth(index)).not.toHaveAttribute('open')", self.axe)
        self.assertIn("summary.press(index % 2 === 0 ? 'Enter' : 'Space')", self.axe)

    def test_mobile_zoom_widths_and_44px_targets(self):
        self.assertIn('for (const width of [320, 375, 412])', self.editor)
        self.assertIn('expect(rect.height).toBeGreaterThanOrEqual(44)', self.editor)
        self.assertIn('expect(zoom.overflow', self.editor)

    def test_text_fragments_checked_against_both_clipping_axes(self):
        self.assertIn('range.getClientRects()', self.editor)
        self.assertIn('style.overflowX', self.editor)
        self.assertIn('style.overflowY', self.editor)
        self.assertIn('expect(closingGeometry.clippedByAncestor).toEqual([])', self.editor)

    def test_iframe_bounds_check_both_axes(self):
        self.assertIn('window.innerHeight', self.editor)
        self.assertIn('window.innerWidth', self.editor)
        self.assertIn('expect(closingGeometry.outsideFrame).toBe(false)', self.editor)

    def test_screenshot_after_scroll_and_geometry(self):
        scroll = self.editor.index('await closingParagraph.scrollIntoViewIfNeeded()')
        geometry = self.editor.index('const closingGeometry = await closingParagraph.evaluate')
        screenshot = self.editor.index('gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png')
        self.assertLess(scroll, geometry)
        self.assertLess(geometry, screenshot)

    def test_javascript_syntax(self):
        for file in (AXE, EDITOR):
            with self.subTest(file=file.name):
                subprocess.run(['node', '--check', str(file)], check=True, capture_output=True, text=True)


if __name__ == '__main__':
    unittest.main()
