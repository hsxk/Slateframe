"""Guard native Core Post Featured Image responsive and editor parity."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostFeaturedImageParity(unittest.TestCase):
    def test_conditional_asset_and_editor_parity(self):
        functions = (ROOT / 'functions.php').read_text()
        css = (ROOT / 'assets/css/core-post-featured-image.css').read_text()
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        self.assertIn("'core/post-featured-image'", functions)
        self.assertIn("'slateframe-core-post-featured-image'", functions)
        self.assertIn("'assets/css/core-post-featured-image.css'", functions)
        self.assertIn("'path'   => get_template_directory() . '/assets/css/core-post-featured-image.css'", functions)
        self.assertIn('assets/css/core-post-featured-image.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-post-featured-image.css) -le 400', workflow)
        self.assertLessEqual(len(css.encode()), 400)
        self.assertIn('.wp-block-post-featured-image img', css)
        self.assertIn('.wp-block-post-featured-image a', css)
        self.assertIn('min-block-size:var(--slateframe-control)', css)
        self.assertIn('outline-offset:var(--slateframe-focus-offset)', css)
        self.assertNotIn('!important', css)
        self.assertNotIn('object-fit', css)
        self.assertNotIn('aspect-ratio', css)

    def test_runtime_and_editor_evidence(self):
        spec = (ROOT / 'tests/browser/core-post-featured-image-parity.spec.js').read_text()
        for value in ('320', '375', '390', '412', '768', '1440', '1920',
                      "'ltr'", "'rtl'", '[16, 32, 64]', 'forcedColors',
                      'AxeBuilder', 'openAuthenticatedEditor', 'permalink',
                      "'--force'", "'/?p=999999999'", 'toBeFocused',
                      'media', 'import', '_wp_attachment_image_alt',
                      'core-post-featured-image-390-rtl-200-forced-colors.png'):
            self.assertIn(value, spec)
        self.assertNotIn('route.fulfill', spec)
        self.assertNotIn('test.fixme', spec)
        self.assertNotIn('test.only', spec)


if __name__ == '__main__':
    unittest.main()
