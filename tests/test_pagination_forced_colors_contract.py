"""Guard WordPress native pagination and aggregate CSS budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
STYLE = ROOT / 'style.css'
BROWSER = ROOT / 'tests/browser/pagination-forced-colors.spec.js'


class PaginationForcedColorsContract(unittest.TestCase):
    def test_current_page_has_non_color_marker_in_system_high_contrast(self):
        css = STYLE.read_text(encoding='utf-8')
        rule = ':is(nav,.wp-block-query-pagination) .current{outline:2px solid Highlight}'
        self.assertIn('@media(forced-colors:active){', css)
        self.assertIn(rule, css)
        self.assertEqual(css.count(rule), 1)
        self.assertNotIn('forced-color-adjust:none', rule)

    def test_core_semantics_and_touch_targets_remain(self):
        css = STYLE.read_text(encoding='utf-8')
        reading = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        self.assertIn('.slateframe-pagination .current{', css)
        self.assertIn('.post-page-numbers.current{', reading)
        self.assertIn('--slateframe-control:44px', css)

    def test_real_wordpress_browser_coverage_includes_keyboard_zoom_and_rtl(self):
        script = BROWSER.read_text(encoding='utf-8')
        for phrase in ("forcedColors: 'active'", "['ltr', 'rtl']", 'aria-current',
                       "keyboard.press('Tab')", "keyboard.press('Shift+Tab')", "'400%'",
                       'outlineColor', 'outlineOffset', 'scrollWidth', 'fullPage: true'):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, script)

    def test_aggregate_photography_discussion_budget_not_weakened(self):
        assets = ('style.css', 'assets/css/navigation.css', 'assets/css/footer.css',
                  'assets/js/theme.js', 'assets/css/reading.css', 'assets/css/publishing.css',
                  'assets/css/photography.css', 'assets/css/forms.css', 'assets/css/comments.css')
        total = sum((ROOT / asset).stat().st_size for asset in assets)
        self.assertLessEqual(total, 43000, f'Photography discussion CSS+JS budget exceeded: {total}')

    def test_compact_form_selector_preserves_checkbox_and_radio_semantics(self):
        css = STYLE.read_text(encoding='utf-8')
        self.assertIn('label:has(>input:is([type=checkbox],[type=radio]))', css)
        self.assertIn('input:is([type=checkbox],[type=radio])+label', css)
        self.assertIn('form input:is([type=range],[type=color],[type=file]){', css)
        self.assertIn('&[type=file]{white-space:normal;&::file-selector-button{', css)


if __name__ == '__main__':
    unittest.main()
