"""Native Core Post Author Biography conditional presentation contract."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostAuthorBiographyParity(unittest.TestCase):
    def test_editor_shared_conditional_asset(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-post-author-biography.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ("function slateframe_register_core_post_author_biography_styles()",
                      "'core/post-author-biography',",
                      "'handle' => 'slateframe-core-post-author-biography'",
                      "'assets/css/core-post-author-biography.css'",
                      "add_action( 'init', 'slateframe_register_core_post_author_biography_styles', 20 );"):
            self.assertIn(token, php)
        for token in ('.wp-block-post-author-biography', 'min-inline-size:0',
                      'max-inline-size:100%', 'overflow-wrap:anywhere', 'white-space:normal'):
            self.assertIn(token, css)
        self.assertIn('test $(wc -c < assets/css/core-post-author-biography.css) -le 180', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 180)
        for forbidden in ('!important', 'time2log_', 'wpcode_', 'direction:ltr',
                          'display:none', 'javascript'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/post-author-biography', php)

    def test_native_runtime_and_editor_evidence(self):
        js = (ROOT / 'tests/browser/core-post-author-biography-parity.spec.js').read_text()
        for token in ("wp('user', 'create'", "wp('user', 'delete'", "wp('post', 'delete'",
                      'finally', "'description'", 'wp:post-author-biography',
                      '320, 375, 390, 412, 768, 1440, 1920',
                      "'ltr', 'rtl'", 'fontSize = \'64px\'',
                      "forcedColors: 'active'", 'new AxeBuilder',
                      'openAuthenticatedEditor', 'blocks.serialize', 'blocks.parse',
                      'core-post-author-biography-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            self.assertIn(token, js)


if __name__ == '__main__':
    unittest.main()
