"""Native Core Image caption, media link and Gutenberg presentation contracts."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreImageCaptionParity(unittest.TestCase):
    def test_block_conditional_style_and_release_budget(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-image.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for token in ('function slateframe_register_core_image_styles()',
                      "'core/image',", "'handle' => 'slateframe-core-image'",
                      "'assets/css/core-image.css'",
                      "add_action( 'init', 'slateframe_register_core_image_styles', 20 );"):
            with self.subTest(token=token):
                self.assertIn(token, php)
        for token in ('.wp-block-image', 'figcaption', 'min-inline-size:0',
                      'max-inline-size:100%', 'overflow-wrap:anywhere'):
            with self.subTest(token=token):
                self.assertIn(token, css)
        self.assertIn('assets/css/core-image.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-image.css) -le 220', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 220)
        for bad in ('!important', 'time2log_', 'wpcode_', 'direction:ltr',
                    'display:none', 'javascript', 'object-fit:cover'):
            self.assertNotIn(bad, css)
        self.assertNotIn('render_block_core/image', php)

    def test_wordpress_browser_and_editor_evidence(self):
        js = (ROOT / 'tests/browser/core-image-caption-parity.spec.js').read_text(encoding='utf-8')
        for token in ("wp('media', 'import'", "wp('post', 'create'",
                      "wp('post', 'delete'", 'finally', 'wp_get_attachment_url',
                      'linkDestination', 'figcaption', 'core/image',
                      '320, 375, 390, 412, 768, 1440, 1920',
                      "'ltr', 'rtl'", 'for (const font of [16, 32, 64])',
                      'await setRootTextScale(page, font, dir)',
                      "forcedColors: 'active'", 'new AxeBuilder',
                      'openAuthenticatedEditor', 'blocks.serialize', 'blocks.parse',
                      "page.keyboard.press('Tab')",
                      'core-image-caption-390-rtl-200-forced-colors.png',
                      'core-image-caption-390-rtl-400-forced-colors.png',
                      "page.goto('/?p=999999999'"):
            with self.subTest(token=token):
                self.assertIn(token, js)


if __name__ == '__main__':
    unittest.main()
