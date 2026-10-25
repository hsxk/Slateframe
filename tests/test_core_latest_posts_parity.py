"""Native Latest Posts must remain Core-owned and visually bounded."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreLatestPostsParity(unittest.TestCase):
    def test_conditional_native_block_style_and_editor_parity(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-latest-posts.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for needle in ('function slateframe_register_core_latest_posts_styles()',
                       "'core/latest-posts',", "'handle' => 'slateframe-core-latest-posts'",
                       "'assets/css/core-latest-posts.css'",
                       "add_action( 'init', 'slateframe_register_core_latest_posts_styles', 20 );"):
            self.assertIn(needle, php)
        self.assertIn("'assets/css/core-latest-posts.css'", php)
        self.assertIn('assets/css/core-latest-posts.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-latest-posts.css) -le 500', workflow)
        for needle in ('.wp-block-latest-posts', 'min-inline-size:0', 'max-inline-size:100%',
                       'min-inline-size:min(100%,var(--slateframe-control))',
                       'min-block-size:var(--slateframe-control)', 'overflow-wrap:anywhere',
                       '.wp-block-latest-posts__post-date', '.wp-block-latest-posts__post-excerpt'):
            self.assertIn(needle, css)
        self.assertLessEqual(len(css.encode('utf-8')), 500)
        for forbidden in ('!important', 'javascript', 'time2log_', 'wpcode_', 'direction:ltr'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/latest-posts', php)

    def test_real_wordpress_runtime_and_gutenberg_evidence(self):
        js = (ROOT / 'tests/browser/core-latest-posts-parity.spec.js').read_text(encoding='utf-8')
        for needle in ("wp('term', 'create'", "wp('term', 'delete'", "wp('post', 'create'",
                       "wp('post', 'delete'", 'finally', "'list', 'grid'",
                       '320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                       "fontSize = '32px'", "fontSize = '64px'",
                       "forcedColors: 'active'", 'new AxeBuilder', "page.keyboard.press('Tab')",
                       'core-latest-posts-390-rtl-200-forced-colors.png',
                       'openAuthenticatedEditor', 'blocks.serialize', 'blocks.parse',
                       'supportsLayout', 'supportsColumns', 'requestedLayout',
                       'serializedLayout', 'serializedColumns', 'postsToShow',
                       'wp-block-latest-posts__post-date', 'wp-block-latest-posts__post-excerpt',
                       'categories: [{ id: Number(category) }]', "displayPostContentRadio: 'excerpt'",
                       "page.goto('/?p=999999999'"):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)


if __name__ == '__main__':
    unittest.main()
