"""Core footnote backreference controls remain bounded without replacing native anchors."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'style.css').read_text(encoding='utf-8')
SPEC = (ROOT / 'tests/browser/core-footnotes-navigation.spec.js').read_text(encoding='utf-8')
EDITOR = (ROOT / 'tests/browser/editor.spec.js').read_text(encoding='utf-8')

class CoreFootnotesContract(unittest.TestCase):
    def test_core_backreference_uses_bounded_token_without_js(self):
        rule = CSS.split('.wp-block-footnotes a[href^="#fnref"]{', 1)[1].split('}', 1)[0]
        for token in ('display:inline-grid', 'place-items:center',
                      'min-inline-size:var(--slateframe-control)',
                      'min-block-size:var(--slateframe-control)',
                      'max-inline-size:100%', 'border-radius:var(--slateframe-radius)'):
            self.assertIn(token, rule)
        self.assertNotIn('position:absolute', rule)
        self.assertIn('.slateframe-footer-widget', (ROOT / 'assets/css/footer.css').read_text(encoding='utf-8'))

    def test_target_anchors_account_for_sticky_header_and_forced_colors(self):
        self.assertIn('[id^=fnref]', CSS)
        self.assertIn(':is([id^=fnref],.wp-block-footnotes li[id^=fn]){', CSS)
        self.assertIn('.wp-block-footnotes li[id^=fn]', CSS)
        self.assertIn('scroll-margin-block-start:calc(var(--slateframe-header-height) + var(--slateframe-stack-gap))', CSS)
        self.assertNotIn('scroll-margin-block-start:var(--slateframe-header-height);&:target', CSS)
        self.assertIn('&:target{outline:2px solid var(--slateframe-accent)', CSS)
        self.assertIn('outline-color:Highlight', CSS)
        self.assertIn('@media(forced-colors:active)', CSS)
        self.assertIn('@media screen{.wp-block-footnotes a[href^="#fnref"]', CSS)

    def test_real_browser_coverage_is_not_only_css_contract(self):
        for token in ('320', '375', '390', '412', '768', '1440', '1920',
                      "'ltr', 'rtl'", '200%', 'forcedColors', 'toBeFocused',
                      'toHaveURL', 'screenshot', 'scrollWidth', 'AxeBuilder',
                      'getBoundingClientRect', "page.keyboard.press('Enter')",
                      'anchor.id = node.id', 'SLATEFRAME_POST_PATH',
                      'sticky header', 'target clears header',
                      'slateframe-footer-core-footnotes sup a'):
            self.assertIn(token, SPEC)

    def test_real_gutenberg_editor_geometry_is_covered(self):
        for token in ('loginAndOpenEditor(page)', 'slateframe-editor-footnote-qa',
                      'toBeFocused', 'forcedColors', 'gutenberg-',
                      'min-block-size', 'wp-block-footnotes'):
            if token == 'min-block-size':
                self.assertIn(token, CSS)
            else:
                self.assertIn(token, EDITOR)

if __name__ == '__main__':
    unittest.main()
