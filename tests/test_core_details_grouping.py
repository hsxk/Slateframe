"""Native named Core Details groups preserve browser-owned exclusivity."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreDetailsGrouping(unittest.TestCase):
    def test_real_wordpress_grouping_is_exercised_without_custom_js(self):
        browser = (ROOT / 'tests/browser/core-details-grouping.spec.js').read_text()
        for needle in (
            "wp('post', 'create'", 'wp:details', 'name="slateframe-faq-group"',
            "toHaveAttribute('name', 'slateframe-faq-group')",
            "firstSummary.press('Enter')", "secondSummary.press('Enter')",
            "independentSummary.press('Enter')", "firstSummary.press('Space')",
            "second).not.toHaveAttribute('open')",
            "independent).toHaveAttribute('open', '')",
            '320, 375, 390, 412, 768, 1440, 1920',
            "'ltr', 'rtl'", '[16, 32, 64]', 'AxeBuilder',
            "forcedColors: 'active'", 'core-details-grouping-390-rtl-200-forced-colors.png',
            "wp('post', 'delete'", "'--force'",
        ):
            self.assertIn(needle, browser)
        for forbidden in ('test.only', 'test.fixme', 'route.fulfill',
                          'window.addEventListener', 'set_theme_mod(', 'page.addScriptTag'):
            self.assertNotIn(forbidden, browser)

    def test_exact_sha_screenshots_are_required_by_ci(self):
        ci = (ROOT / '.github/workflows/quality.yml').read_text()
        self.assertIn('core-details-grouping-${width}-${direction}.png', ci)
        self.assertIn('core-details-grouping-390-rtl-200-forced-colors.png', ci)
        self.assertIn('Missing native Details grouping evidence', ci)
        self.assertIn('Missing native Details grouping forced-colors evidence', ci)
        self.assertIn('SLATEFRAME_EVIDENCE_SHA', ci)


if __name__ == '__main__':
    unittest.main()
