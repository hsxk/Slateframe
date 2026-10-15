"""Guard native authored form button reflow without extra JavaScript."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'assets/css/form-content.css').read_text(encoding='utf-8')
BROWSER = (ROOT / 'tests/browser/authored-form-zoom.spec.js').read_text(encoding='utf-8')


class AuthoredFormZoomContract(unittest.TestCase):
    def test_shared_native_button_reflow_and_existing_asset_budget(self):
        self.assertIn('form .slateframe-form-actions{flex-wrap:wrap}', CSS)
        self.assertLessEqual(len(CSS.encode('utf-8')), 750)
        self.assertNotIn('!important', CSS)

    def test_real_wordpress_browser_checks_zoom_direction_and_focus(self):
        for value in ('[16, 32, 64]', "['ltr', 'rtl']", 'pageOverflow',
                      'bodyOverflow', 'innerOverflow', 'flexWrap', 'Shift+Tab',
                      ':focus-visible', "forcedColors: 'active'",
                      'authored-form-rtl-400-forced-colors-',
                      'AxeBuilder'):
            with self.subTest(value=value):
                self.assertIn(value, BROWSER)

    def test_theme_local_style_loading_without_runtime_dependency(self):
        self.assertIn("['forms', 'form-content']", BROWSER)
        self.assertIn('/assets/css/${name}.css', BROWSER)
        self.assertNotIn('cdn.', BROWSER)
        self.assertNotIn('fetch(', BROWSER)


if __name__ == '__main__':
    unittest.main()
