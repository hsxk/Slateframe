"""Core Post Excerpt conditional assets and browser coverage."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]

class CorePostExcerptParity(unittest.TestCase):
    def test_conditional_editor_shared_css_and_budget(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-post-excerpt.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ('function slateframe_register_core_post_excerpt_styles()',
                      "'core/post-excerpt',", "'handle' => 'slateframe-core-post-excerpt'",
                      "'assets/css/core-post-excerpt.css'",
                      "add_action( 'init', 'slateframe_register_core_post_excerpt_styles', 20 );"):
            with self.subTest(token=token): self.assertIn(token, php)
        for token in ('.wp-block-post-excerpt', '.wp-block-post-excerpt__excerpt',
                      '.wp-block-post-excerpt__more-link', 'overflow-wrap:anywhere',
                      'min-inline-size:0', 'max-inline-size:100%',
                      'min-block-size:var(--slateframe-control)',
                      'min-inline-size:min(100%,var(--slateframe-control))'):
            with self.subTest(token=token): self.assertIn(token, css)
        self.assertIn('assets/css/core-post-excerpt.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-post-excerpt.css) -le 480', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 480)
        for bad in ('!important', 'time2log_', 'wpcode_', 'direction:ltr',
                    'display:none', 'javascript'): self.assertNotIn(bad, css)
        self.assertNotIn('render_block_core/post-excerpt', php)

    def test_real_wordpress_editor_and_responsive_coverage(self):
        js = (ROOT / 'tests/browser/core-post-excerpt-parity.spec.js').read_text(encoding='utf-8')
        for token in ("wp('post', 'create'", "wp('post', 'delete'", 'finally',
                      'get_permalink(', '--post_excerpt=', 'moreText', 'showMoreOnNewLine',
                      'excerptLength', 'core/post-excerpt', '320, 375, 390, 412, 768, 1440, 1920',
                      "'ltr', 'rtl'", "fontSize = '64px'", "forcedColors: 'active'",
                      'new AxeBuilder', 'openAuthenticatedEditor', 'blocks.serialize',
                      'blocks.parse', "page.keyboard.press('Tab')",
                      'core-post-excerpt-390-rtl-200-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            with self.subTest(token=token): self.assertIn(token, js)

if __name__ == '__main__':
    unittest.main()
