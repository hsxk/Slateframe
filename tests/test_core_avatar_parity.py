"""Native Core Avatar presentation and runtime acceptance."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreAvatarParity(unittest.TestCase):
    def test_conditional_editor_shared_style(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-avatar.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ('function slateframe_register_core_avatar_styles()',
                      "'core/avatar',", "'handle' => 'slateframe-core-avatar'",
                      "'assets/css/core-avatar.css'",
                      "add_action( 'init', 'slateframe_register_core_avatar_styles', 20 );"):
            with self.subTest(token=token):
                self.assertIn(token, php)
        for token in ('.wp-block-avatar', '.wp-block-avatar img',
                      '.wp-block-avatar__link', 'min-inline-size:0',
                      'max-inline-size:100%', 'min-block-size:var(--slateframe-control)',
                      'min-inline-size:min(100%,var(--slateframe-control))'):
            with self.subTest(token=token):
                self.assertIn(token, css)
        self.assertIn('test $(wc -c < assets/css/core-avatar.css) -le 400', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 400)
        for forbidden in ('!important', 'time2log_', 'wpcode_', 'direction:ltr',
                          'display:none', 'javascript', 'gravatar.com'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/avatar', php)

    def test_wordpress_and_editor_evidence(self):
        js = (ROOT / 'tests/browser/core-avatar-parity.spec.js').read_text(encoding='utf-8')
        for token in ("wp('post', 'create'", "wp('post', 'delete'", 'finally',
                      'get_author_posts_url(', 'wp:avatar', 'core/avatar',
                      '320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                      "fontSize = '64px'", "forcedColors: 'active'",
                      'new AxeBuilder', 'openAuthenticatedEditor',
                      'blocks.serialize', 'blocks.parse', "page.keyboard.press('Tab')",
                      'core-avatar-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            with self.subTest(token=token):
                self.assertIn(token, js)


if __name__ == '__main__':
    unittest.main()
