"""Native Core Post Author Name presentation and runtime acceptance."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostAuthorNameParity(unittest.TestCase):
    def test_conditional_editor_shared_style(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-post-author-name.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ('function slateframe_register_core_post_author_name_styles()',
                      "'core/post-author-name',",
                      "'handle' => 'slateframe-core-post-author-name'",
                      "'assets/css/core-post-author-name.css'",
                      "add_action( 'init', 'slateframe_register_core_post_author_name_styles', 20 );"):
            with self.subTest(token=token):
                self.assertIn(token, php)
        for token in ('.wp-block-post-author-name', '.wp-block-post-author-name a',
                      'min-inline-size:0', 'max-inline-size:100%',
                      'overflow-wrap:anywhere', 'min-block-size:var(--slateframe-control)',
                      'min-inline-size:min(100%,var(--slateframe-control))'):
            with self.subTest(token=token):
                self.assertIn(token, css)
        self.assertIn('assets/css/core-post-author-name.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-post-author-name.css) -le 400', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 400)
        for bad in ('!important', 'time2log_', 'wpcode_', 'direction:ltr',
                    'display:none', 'javascript'):
            self.assertNotIn(bad, css)
        self.assertNotIn('render_block_core/post-author-name', php)

    def test_wordpress_and_editor_evidence(self):
        js = (ROOT / 'tests/browser/core-post-author-name-parity.spec.js').read_text(encoding='utf-8')
        for token in ("wp('post', 'create'", "wp('post', 'delete'", 'finally',
                      'get_author_posts_url(', 'isLink', 'core/post-author-name',
                      '320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                      "fontSize = '64px'", "forcedColors: 'active'",
                      'new AxeBuilder', 'openAuthenticatedEditor', 'blocks.serialize',
                      'blocks.parse', "page.keyboard.press('Tab')",
                      'core-post-author-name-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            with self.subTest(token=token):
                self.assertIn(token, js)


if __name__ == '__main__':
    unittest.main()
