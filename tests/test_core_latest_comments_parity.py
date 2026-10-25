"""Core Latest Comments is a native dynamic block, not a theme comment engine."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreLatestCommentsParity(unittest.TestCase):
    def test_conditional_editor_shared_css_and_budget(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-latest-comments.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ("function slateframe_register_core_latest_comments_styles()",
                      "'core/latest-comments',", "'slateframe-core-latest-comments'",
                      "'assets/css/core-latest-comments.css'",
                      "add_action( 'init', 'slateframe_register_core_latest_comments_styles', 20 );"):
            with self.subTest(token=token):
                self.assertIn(token, php)
        for token in ('.wp-block-latest-comments', '.wp-block-latest-comments__comment',
                      '.wp-block-latest-comments__comment-meta a',
                      '.wp-block-latest-comments__comment-excerpt',
                      'min-inline-size:0', 'max-inline-size:100%',
                      'min-inline-size:min(100%,var(--slateframe-control))',
                      'min-block-size:var(--slateframe-control)', 'overflow-wrap:anywhere'):
            with self.subTest(token=token):
                self.assertIn(token, css)
        self.assertIn('assets/css/core-latest-comments.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-latest-comments.css) -le 550', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 550)
        for forbidden in ('!important', 'javascript', 'time2log_', 'wpcode_',
                          'direction:ltr', 'position:fixed', 'display:none'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/latest-comments', php)

    def test_disposable_wordpress_a11y_and_gutenberg_evidence(self):
        js = (ROOT / 'tests/browser/core-latest-comments-parity.spec.js').read_text(encoding='utf-8')
        for token in ("wp('comment', 'create'", "wp('comment', 'delete'",
                      "wp('post', 'create'", "wp('post', 'delete'", '--comment_approved=0',
                      'get_comment_link(', 'finally', 'displayAvatar: show',
                      'displayDate: show', 'displayContent', 'displayExcerpt',
                      'supportsContent', 'WP_Block_Type_Registry',
                      '320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                      "fontSize = '32px'", "fontSize = '64px'",
                      "forcedColors: 'active'", 'new AxeBuilder',
                      "page.keyboard.press('Tab')", 'openAuthenticatedEditor',
                      'blocks.serialize', 'blocks.parse', 'fullPage: true',
                      'core-latest-comments-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            with self.subTest(token=token):
                self.assertIn(token, js)


if __name__ == '__main__':
    unittest.main()
