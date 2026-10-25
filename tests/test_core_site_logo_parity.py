"""Core Site Logo asset and WordPress parity contracts."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]

class CoreSiteLogoParity(unittest.TestCase):
    def test_conditional_editor_shared_asset(self):
        php = (ROOT / 'functions.php').read_text()
        css = (ROOT / 'assets/css/core-site-logo.css').read_text()
        ci = (ROOT / '.github/workflows/quality.yml').read_text()
        for value in ("function slateframe_register_core_site_logo_styles()",
                      "'core/site-logo',", "'handle' => 'slateframe-core-site-logo'",
                      "'assets/css/core-site-logo.css'",
                      "add_action( 'init', 'slateframe_register_core_site_logo_styles', 20 );"):
            self.assertIn(value, php)
        for value in ('.wp-block-site-logo img', '.wp-block-site-logo a',
                      'min-inline-size:min(100%,var(--slateframe-control))',
                      'min-block-size:var(--slateframe-control)', 'max-inline-size:100%'):
            self.assertIn(value, css)
        self.assertLessEqual(len(css.encode()), 400)
        self.assertIn('test $(wc -c < assets/css/core-site-logo.css) -le 400', ci)
        for forbidden in ('!important', 'time2log_', 'wpcode_', 'javascript', 'display:none'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/site-logo', php)

    def test_wordpress_editor_and_visual_evidence(self):
        js = (ROOT / 'tests/browser/core-site-logo-parity.spec.js').read_text()
        for value in ('wp:site-logo', 'core/site-logo', "wp('media', 'import'",
                      'theme_mod_custom_logo', 'WPMU_PLUGIN_DIR', 'finally',
                      '320, 375, 390, 412, 768, 1440, 1920',
                      "'ltr', 'rtl'", 'forcedColors', 'new AxeBuilder',
                      'openAuthenticatedEditor', 'blocks.serialize',
                      'blocks.parse', 'core-site-logo-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            self.assertIn(value, js)
        self.assertNotIn('set_theme_mod(', js)
        self.assertNotIn('update_option("site_logo"', js)

if __name__ == '__main__':
    unittest.main()
