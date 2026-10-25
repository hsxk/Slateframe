"""Core Login/out remains native, bounded and editor-shared."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class CoreLoginoutParity(unittest.TestCase):
    def test_conditional_styles_and_budget(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-loginout.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for item in ("function slateframe_register_core_loginout_styles()",
                     "'core/loginout',", "'slateframe-core-loginout'",
                     "'assets/css/core-loginout.css'",
                     "add_action( 'init', 'slateframe_register_core_loginout_styles', 20 );"):
            self.assertIn(item, php)
        for item in ('.wp-block-loginout>a', '.wp-block-loginout form label',
                     'min-block-size:var(--slateframe-control)',
                     'max-inline-size:100%', 'overflow-wrap:anywhere'):
            self.assertIn(item, css)
        self.assertIn('assets/css/core-loginout.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-loginout.css) -le 750', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 750)
        for item in ('!important', 'time2log_', 'wpcode_', 'display:none', 'wp-login.php'):
            self.assertNotIn(item, css)
        self.assertNotIn('render_block_core/loginout', php)

    def test_browser_and_gutenberg_coverage(self):
        js = (ROOT / 'tests/browser/core-loginout-parity.spec.js').read_text(encoding='utf-8')
        for item in ('displayLoginAsForm', 'redirectToCurrent', 'action=logout',
                     '_wpnonce=', '320, 375, 390, 412, 768, 1440, 1920',
                     "'ltr', 'rtl'", "fontSize = '64px'", "forcedColors: 'active'",
                     'new AxeBuilder', "page.keyboard.press('Tab')",
                     'openAuthenticatedEditor', 'blocks.serialize', 'blocks.parse',
                     "page.goto('/?p=999999999'", 'finally'):
            self.assertIn(item, js)

if __name__ == '__main__':
    unittest.main()
