"""Native Core Site Tagline parity and conditional presentation."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreSiteTaglineParity(unittest.TestCase):
    def test_conditional_editor_shared_asset(self):
        php = (ROOT / 'functions.php').read_text()
        css = (ROOT / 'assets/css/core-site-tagline.css').read_text()
        ci = (ROOT / '.github/workflows/quality.yml').read_text()
        for value in ("function slateframe_register_core_site_tagline_styles()",
                      "'core/site-tagline',", "'handle' => 'slateframe-core-site-tagline'",
                      "'assets/css/core-site-tagline.css'",
                      "add_action( 'init', 'slateframe_register_core_site_tagline_styles', 20 );"):
            self.assertIn(value, php)
        self.assertIn("'assets/css/core-site-tagline.css'", php.split('add_editor_style(', 1)[1].split(');', 1)[0])
        for value in ('.wp-block-site-tagline', 'min-inline-size:0', 'max-inline-size:100%',
                      'overflow-wrap:anywhere', 'white-space:normal'):
            self.assertIn(value, css)
        self.assertLessEqual(len(css.encode()), 240)
        self.assertIn('test $(wc -c < assets/css/core-site-tagline.css) -le 240', ci)
        for forbidden in ('!important', 'time2log_', 'wpcode_', 'javascript', 'display:none'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/site-tagline', php)

    def test_wordpress_editor_and_visual_evidence(self):
        js = (ROOT / 'tests/browser/core-site-tagline-parity.spec.js').read_text()
        for value in ("wp('option', 'get', 'blogdescription')", 'wp:site-tagline',
                      'core/site-tagline', '320, 375, 390, 412, 768, 1440, 1920',
                      "'ltr', 'rtl'", '[16, 32, 64]', 'forcedColors',
                      'AxeBuilder', 'openAuthenticatedEditor', 'blocks.serialize',
                      'blocks.parse', 'core-site-tagline-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'", "'--force'"):
            self.assertIn(value, js)
        for forbidden in ('set_theme_mod(', 'route.fulfill', 'test.only', 'test.fixme'):
            self.assertNotIn(forbidden, js)


if __name__ == '__main__':
    unittest.main()
