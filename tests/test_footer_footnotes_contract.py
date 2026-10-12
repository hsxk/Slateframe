"""Preserve WordPress Core Footnotes numbering in footer widgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FooterFootnotesContract(unittest.TestCase):
    def test_footnotes_and_nested_core_lists_exempt(self):
        css = (ROOT / 'assets/css/footer.css').read_text(encoding='utf-8')
        self.assertIn(':not(.wp-block-list,.wp-block-list *,.wp-block-footnotes,.wp-block-footnotes *)', css)
        self.assertLessEqual(len(css.encode('utf-8')), 2000)
        self.assertIn('list-style:none', css)

    def test_browser_regression_has_visual_and_accessibility_checks(self):
        spec = (ROOT / 'tests/browser/footer-footnotes.spec.js').read_text(encoding='utf-8')
        for token in ('wp-block-footnotes', 'listStyleType', '320', '375', '390',
                      '412', '768', '1440', '1920', 'rtl', '200%',
                      'forcedColors', 'toBeFocused', 'scrollWidth', 'screenshot'):
            self.assertIn(token, spec)


if __name__ == '__main__':
    unittest.main()
