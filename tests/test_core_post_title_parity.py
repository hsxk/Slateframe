"""Guard native Core Post Title parity and contextual presentation."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostTitleParity(unittest.TestCase):
    def test_conditional_asset_and_editor_parity(self):
        functions = (ROOT / 'functions.php').read_text()
        css = (ROOT / 'assets/css/core-post-title.css').read_text()
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        self.assertIn("'core/post-title'", functions)
        self.assertIn("'slateframe-core-post-title'", functions)
        self.assertIn("'assets/css/core-post-title.css'", functions)
        self.assertIn("'path'   => get_template_directory() . '/assets/css/core-post-title.css'", functions)
        self.assertIn('assets/css/core-post-title.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-post-title.css) -le 400', workflow)
        self.assertLessEqual(len(css.encode()), 400)
        self.assertIn('.wp-block-post-title a', css)
        self.assertIn('min-block-size:var(--slateframe-control)', css)
        self.assertIn('overflow-wrap:anywhere', css)
        self.assertNotIn('position:absolute', css)
        self.assertNotIn('!important', css)

    def test_runtime_and_editor_evidence(self):
        spec = (ROOT / 'tests/browser/core-post-title-parity.spec.js').read_text()
        for value in ('320', '375', '390', '412', '768', '1440', '1920',
                      "'ltr'", "'rtl'", '[16, 32, 64]', 'forcedColors',
                      'AxeBuilder', 'openAuthenticatedEditor', 'permalink',
                      "'--force'", "'/?p=999999999'", 'toBeFocused',
                      'core-post-title-390-rtl-200-forced-colors.png'):
            self.assertIn(value, spec)
        self.assertNotIn('route.fulfill', spec)
        self.assertNotIn('test.fixme', spec)
        self.assertNotIn('test.only', spec)


if __name__ == '__main__':
    unittest.main()
