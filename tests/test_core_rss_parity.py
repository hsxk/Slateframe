"""Core RSS must remain a conditional, presentation-only WordPress block."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreRssParity(unittest.TestCase):
    def test_native_registration_and_editor_parity(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-rss.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for needle in ('function slateframe_register_core_rss_styles()',
                       "'core/rss',", "'handle' => 'slateframe-core-rss'",
                       "'assets/css/core-rss.css'",
                       "add_action( 'init', 'slateframe_register_core_rss_styles', 20 );"):
            with self.subTest(needle=needle):
                self.assertIn(needle, php)
        self.assertIn('assets/css/core-rss.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-rss.css) -le 600', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 600)
        for needle in ('.wp-block-rss', '.wp-block-rss li', '.wp-block-rss__item-title', '.wp-block-rss__item-title a',
                       'min-inline-size:min(100%,var(--slateframe-control))',
                       'min-block-size:var(--slateframe-control)',
                       '.wp-block-rss__item-publish-date', '.wp-block-rss__item-author',
                       '.wp-block-rss__item-excerpt', 'overflow-wrap:anywhere'):
            self.assertIn(needle, css)
        for forbidden in ('!important', 'direction:ltr', 'javascript', 'time2log_',
                          'wpcode_', '@import', 'url('):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/rss', php)
        self.assertNotIn('pre_http_request', php)

    def test_native_offline_core_renderer_fixture(self):
        php = (ROOT / 'tests/fixtures/core-rss-native.php.fixture').read_text(encoding='utf-8')
        for needle in ('pre_http_request', 'render_block(', "'core/rss'", 'wp_json_encode',
                       'displayExcerpt', 'displayAuthor', 'displayDate', "'list', 'grid'",
                       'wp-block-rss__item-title', 'example.org/slateframe-rss-fixture.xml'):
            self.assertIn(needle, php)

    def test_wordpress_browser_and_gutenberg_coverage(self):
        js = (ROOT / 'tests/browser/core-rss-parity.spec.js').read_text(encoding='utf-8')
        for needle in ('wp-block-rss', 'is-grid', '320, 375, 390, 412, 768, 1440, 1920',
                       "'ltr', 'rtl'", "fontSize = '32px'", "fontSize = '64px'",
                       "forcedColors: 'active'", 'new AxeBuilder',
                       "page.keyboard.press('Tab')", 'openAuthenticatedEditor',
                       'blocks.serialize', 'blocks.parse', 'feedURL', 'itemsToShow',
                       'displayExcerpt', 'displayAuthor', 'displayDate',
                       'core-rss-390-rtl-200-forced-colors.png',
                       "wp('eval-file'",
                       "page.goto('/?p=999999999',", 'finally'):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)


if __name__ == '__main__':
    unittest.main()
