"""Keep WordPress Core footnote citations inline in footer widgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FooterFootnoteInlineContract(unittest.TestCase):
    def test_footer_footnote_inline_links_do_not_inherit_utility_link_display(self):
        css = (ROOT / 'assets/css/footer.css').read_text(encoding='utf-8')
        self.assertIn('.slateframe-footer-widget :is(sup a,', css)
        self.assertIn('.wp-block-footnotes a:not([href^="#fnref"])', css)
        self.assertIn('{display:inline}', css)
        self.assertLessEqual(len(css.encode('utf-8')), 2000)

    def test_real_wordpress_browser_covers_source_citation_and_return(self):
        spec = (ROOT / 'tests/browser/footer-footnote-inline.spec.js').read_text(encoding='utf-8')
        for token in ('320', '375', '390', '412', '768', '1440', '1920',
                      "'ltr', 'rtl'", '200%', 'forcedColors', 'AxeBuilder',
                      'toBeFocused', 'toHaveURL', 'screenshot', 'scrollWidth',
                      'wp-block-footnotes', 'inline-grid', 'inline'):
            with self.subTest(token=token):
                self.assertIn(token, spec)


if __name__ == '__main__':
    unittest.main()
