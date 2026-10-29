"""Native MathML containment and evidence contracts without a renderer dependency."""
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class InlineMathReflow(unittest.TestCase):
    def test_core_first_bounded_css(self):
        css = (ROOT / 'assets/css/reading.css').read_text()
        self.assertIn(':is(.slateframe-prose,.editor-styles-wrapper) math:not([display=block])', css)
        self.assertIn('display:inline-block;max-inline-size:100%;overflow-x:auto', css)
        self.assertIn('text-wrap:balance;overflow-wrap:anywhere;', css)
        self.assertLessEqual(len(css.encode()), 7000)
        self.assertNotIn('mathjax', css.lower())

    def test_real_wordpress_evidence_and_gutenberg(self):
        browser = (ROOT / 'tests/browser/inline-math-reflow.spec.js').read_text()
        for token in ('[320, 375, 390, 412, 768, 1440, 1920]',
                      "['ltr', 'rtl']", '[16, 32, 64]', 'scrollWidth',
                      "'core/paragraph'", 'blocks.serialize', 'blocks.parse',
                      "forcedColors: 'active'", 'math:not([display="block"])'):
            self.assertIn(token, browser)
        workflow = (ROOT / '.github/workflows/quality.yml').read_text()
        self.assertIn('python3 tests/verify_inline_math_zoom_evidence.py test-artifacts/screenshots', workflow)

    def test_required_evidence_names(self):
        from verify_inline_math_zoom_evidence import CAPTURES
        self.assertEqual(len(CAPTURES), 6)
        self.assertEqual(len(set(CAPTURES)), 6)
        self.assertTrue(all(name.startswith('inline-math-390-') for name in CAPTURES))

    def test_missing_and_linked_evidence_rejected(self):
        from verify_inline_math_zoom_evidence import verify
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with self.assertRaises((OSError, ValueError)):
                verify(root)
            (root / 'inline-math-390-ltr-400-paragraph.png').symlink_to(root / 'missing.png')
            with self.assertRaises((OSError, ValueError)):
                verify(root)

if __name__ == '__main__':
    unittest.main()
