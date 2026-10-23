"""Verify CJK site identity tracking without adding runtime JavaScript."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
RULE = '.slateframe-brand-title:is(:lang(zh),:lang(ja),:lang(ko)){letter-spacing:normal}'


class CjkBrandTrackingContract(unittest.TestCase):
    def test_language_rule_is_scoped_to_site_identity(self):
        css = (ROOT / 'assets/css/navigation.css').read_text(encoding='utf-8')
        self.assertEqual(css.count(RULE), 1)
        self.assertNotIn('.slateframe-brand-title{letter-spacing:normal}', css)
        self.assertIn('text-decoration:underline .1em', css)

    def test_core_header_markup_and_menu_are_preserved(self):
        header = (ROOT / 'header.php').read_text(encoding='utf-8')
        self.assertIn('class="slateframe-brand-title"', header)
        self.assertIn('wp_nav_menu(', header)
        self.assertNotIn('<script', header)

    def test_browser_covers_multilingual_rtl_zoom_and_evidence(self):
        spec = (ROOT / 'tests/browser/cjk-brand-tracking.spec.js').read_text(encoding='utf-8')
        for marker in ('320, 375, 390, 412, 768, 1440, 1920',
                       "'ja', 'zh-Hans', 'zh-Hant', 'ko-KR', 'en'",
                       "'ltr', 'rtl'", "'100%', '400%'",
                       'forcedColors', 'toBeFocused()', 'fullPage: true',
                       'cjk-brand-', "rootLang"):
            with self.subTest(marker=marker):
                self.assertIn(marker, spec)

    def test_navigation_and_combined_css_budgets(self):
        self.assertLessEqual((ROOT / 'assets/css/navigation.css').stat().st_size, 4000)
        paths = ('style.css', 'assets/css/navigation.css', 'assets/css/footer.css',
                 'assets/js/theme.js', 'assets/css/reading.css',
                 'assets/css/publishing.css', 'assets/css/photography.css',
                 'assets/css/forms.css', 'assets/css/comments.css')
        self.assertLessEqual(sum((ROOT / name).stat().st_size for name in paths), 43000)


if __name__ == '__main__':
    unittest.main()
