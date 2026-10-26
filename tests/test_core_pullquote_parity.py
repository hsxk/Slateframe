"""Native Core Pullquote retains WordPress ownership and bounded presentation."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePullquoteParity(unittest.TestCase):
    def test_asset_namespace_and_editor_contract(self):
        php = (ROOT / 'functions.php').read_text()
        css = (ROOT / 'assets/css/core-pullquote.css').read_text()
        ci = (ROOT / '.github/workflows/quality.yml').read_text()
        for expected in ('function slateframe_register_core_pullquote_styles()',
                         "'core/pullquote',", "'handle' => 'slateframe-core-pullquote'",
                         "'assets/css/core-pullquote.css'",
                         "add_action( 'init', 'slateframe_register_core_pullquote_styles', 20 );"):
            self.assertIn(expected, php)
        self.assertIn("'assets/css/core-pullquote.css'",
                      php.split('add_editor_style(', 1)[1].split(');', 1)[0])
        for expected in ('.wp-block-pullquote', 'overflow-wrap:anywhere',
                         'min-inline-size:0', 'CanvasText'):
            self.assertIn(expected, css)
        self.assertLessEqual(len(css.encode()), 440)
        self.assertIn('test $(wc -c < assets/css/core-pullquote.css) -le 440', ci)
        self.assertIn('slateframe/assets/css/core-pullquote.css', ci)
        for forbidden in ('!important', 'display:none', 'time2log_', 'wpcode_', 'javascript'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/pullquote', php)

    def test_wordpress_evidence_and_gutenberg(self):
        js = (ROOT / 'tests/browser/core-pullquote-parity.spec.js').read_text()
        for expected in ("wp('post', 'create'", 'wp:pullquote', 'is-style-solid-color',
                         '<cite>', '日本語 中文 العربية',
                         '320, 375, 390, 412, 768, 1440, 1920',
                         "'ltr', 'rtl'", '[16, 32, 64]', 'forcedColors',
                         'AxeBuilder', 'openAuthenticatedEditor', 'blocks.serialize',
                         'blocks.parse', 'core-pullquote-390-rtl-200-forced-colors.png',
                         "'--force'"):
            self.assertIn(expected, js)
        for forbidden in ('test.only', 'test.fixme', 'route.fulfill', 'set_theme_mod('):
            self.assertNotIn(forbidden, js)


if __name__ == '__main__':
    unittest.main()
