"""Guard native Core Read More presentation and browser evidence."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]

class CoreReadMoreParity(unittest.TestCase):
    def test_conditional_asset_and_budget(self):
        php = (ROOT / 'functions.php').read_text()
        css = (ROOT / 'assets/css/core-read-more.css').read_text()
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        for value in ("function slateframe_register_core_read_more_styles()",
                      "'core/read-more',", "'handle' => 'slateframe-core-read-more'",
                      "'assets/css/core-read-more.css'",
                      "add_action( 'init', 'slateframe_register_core_read_more_styles', 20 );"):
            self.assertIn(value, php)
        for value in ('.wp-block-read-more', 'min-block-size:var(--slateframe-control)',
                      'min-inline-size:min(100%,var(--slateframe-control))',
                      'max-inline-size:100%', 'overflow-wrap:anywhere', 'white-space:normal'):
            self.assertIn(value, css)
        self.assertIn('test $(wc -c < assets/css/core-read-more.css) -le 300', workflow)
        self.assertLessEqual(len(css.encode()), 300)
        for forbidden in ('!important', 'time2log_', 'wpcode_', 'direction:ltr', 'display:none'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/read-more', php)

    def test_real_wordpress_editor_and_a11y_evidence(self):
        js = (ROOT / 'tests/browser/core-read-more-parity.spec.js').read_text()
        for value in ("wp('post', 'create'", "wp('post', 'delete'", 'finally',
                      'get_permalink(', 'wp:query', 'wp:post-template', 'core/read-more',
                      '320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                      "await setRootTextScale(page, 64, 'rtl');", "forcedColors: 'active'", 'new AxeBuilder',
                      "require('./support/root-text-scale')", 'openAuthenticatedEditor', 'blocks.serialize', 'blocks.parse',
                      "page.keyboard.press('Tab')", 'screen-reader-text',
                      'core-read-more-390-rtl-200-forced-colors.png'):
            self.assertIn(value, js)
        for forbidden in ('route.fulfill', 'test.only', 'test.fixme'):
            self.assertNotIn(forbidden, js)

if __name__ == '__main__':
    unittest.main()
