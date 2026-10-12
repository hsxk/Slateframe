"""Keep classic and Core Search actions within the shared responsive system."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SearchMobileActionContract(unittest.TestCase):
    def test_classic_search_uses_intrinsic_grid_and_full_width_action(self):
        css = (ROOT / 'assets/css/search-form.css').read_text()
        self.assertIn('@media (max-width:640px)', css)
        self.assertIn('display:grid;& button{max-width:none}', css)
        self.assertIn('.slateframe-search-form button{max-width:45%}', css)
        self.assertNotIn('!important', css)

    def test_core_search_uses_same_mobile_action_width(self):
        css = (ROOT / 'style.css').read_text()
        self.assertIn('.wp-block-search__button-outside .wp-block-search__inside-wrapper{display:grid;grid-template-columns:minmax(0,1fr)}', css)
        self.assertIn('.wp-block-search__button-outside .wp-block-search__button{margin:0;inline-size:100%;white-space:normal}', css)
        self.assertLessEqual(len(css.encode('utf-8')), 16000)

    def test_regression_covers_viewports_and_keyboard_focus(self):
        browser = (ROOT / 'tests/browser/search-mobile-action.spec.js').read_text()
        for width in ('320', '375', '390', '412', '640', '768', '1440', '1920'):
            self.assertIn(width, browser)
        for token in ('ltr', 'rtl', '200%', 'forcedColors', 'toBeFocused', 'scrollWidth', 'focus-visible', 'FormData'):
            self.assertIn(token, browser)


if __name__ == '__main__':
    unittest.main()
