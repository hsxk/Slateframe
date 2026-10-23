"""Keep the native search form accessible alongside optional Core Search widgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SearchLandmarkContract(unittest.TestCase):
    def test_theme_search_landmark_has_translatable_name(self):
        source = (ROOT / 'searchform.php').read_text(encoding='utf-8')
        self.assertIn('role="search" aria-label="<?php esc_attr_e( \'Site search\', \'slateframe\' ); ?>"', source)
        self.assertEqual(source.count('role="search"'), 1)
        self.assertIn('class="slateframe-search-form"', source)

    def test_native_search_keyboard_and_label_are_preserved(self):
        source = (ROOT / 'searchform.php').read_text(encoding='utf-8')
        self.assertIn('type="search" name="s" enterkeyhint="search"', source)
        self.assertIn('esc_html_e( \'Search for:\', \'slateframe\' )', source)
        self.assertIn('esc_attr( get_search_query( false ) )', source)
        self.assertIn('method="get"', source)
        self.assertIn('type="submit"', source)

    def test_real_wordpress_browser_coverage(self):
        spec = (ROOT / 'tests/browser/search-landmark-keyboard.spec.js').read_text(encoding='utf-8')
        for token in ('getByRole', 'aria-label', 'enterkeyhint', 'node.labels',
                      "input.press('Enter')", '日本語 & العربية',
                      '320, 390, 1440', 'slateframe-browser-missing',
                      'search-landmark-viewport-'):
            with self.subTest(token=token):
                self.assertIn(token, spec)


if __name__ == '__main__':
    unittest.main()
