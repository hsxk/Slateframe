"""Protect real-WordPress FAQ accessibility coverage and native disclosure behavior."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tests/browser/knowledge-faq-axe.spec.js'


class KnowledgeFaqAxeContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding='utf-8')

    def test_real_wordpress_pattern_and_disposable_fixture(self):
        self.assertIn("WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')", self.source)
        self.assertIn("'--post_status=publish'", self.source)
        self.assertIn("wp('post', 'delete', id, '--force')", self.source)
        self.assertIn('finally {', self.source)

    def test_mobile_rtl_and_desktop_ltr(self):
        self.assertIn("{ width: 390, direction: 'rtl' }", self.source)
        self.assertIn("{ width: 1440, direction: 'ltr' }", self.source)
        self.assertIn("await page.setViewportSize({ width, height: 900 })", self.source)

    def test_all_native_summaries_and_expanded_answers(self):
        self.assertIn("await expect(details).toHaveCount(3)", self.source)
        self.assertIn("await expect(summaries.nth(index)).toHaveAccessibleName(/\\S/)", self.source)
        self.assertIn("for (const expanded of [false, true])", self.source)
        self.assertIn("await expect(details.nth(index)).toHaveAttribute('open')", self.source)
        self.assertIn("await expect(details.nth(index).locator('p')).toBeVisible()", self.source)

    def test_native_keyboard_open_and_close(self):
        self.assertIn("await summary.focus()", self.source)
        self.assertIn("await expect(summary).toBeFocused()", self.source)
        self.assertIn("summary.press(index % 2 === 0 ? 'Enter' : 'Space')", self.source)
        self.assertIn("summary.press(index % 2 === 0 ? 'Space' : 'Enter')", self.source)
        self.assertIn("await expect(details.nth(index)).not.toHaveAttribute('open')", self.source)

    def test_closed_expanded_and_forced_color_evidence(self):
        self.assertIn("(expanded ? 'expanded' : 'closed')", self.source)
        self.assertIn('knowledge-faq-axe-390-rtl-expanded-200-forced-colors.png', self.source)
        self.assertIn("forcedColors: 'active'", self.source)

    def test_touch_targets_and_no_horizontal_overflow(self):
        self.assertIn('document.documentElement.scrollWidth - document.documentElement.clientWidth', self.source)
        self.assertIn('expect(geometry.overflow', self.source)
        self.assertIn('expect(height).toBeGreaterThanOrEqual(44)', self.source)

    def test_wcag_tags_without_disabled_rules(self):
        self.assertIn(".include('.slateframe-knowledge-faq')", self.source)
        self.assertIn(".withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])", self.source)
        self.assertIn('expect(violations(result)', self.source)
        self.assertNotIn('.disableRules(', self.source)


if __name__ == '__main__':
    unittest.main()
