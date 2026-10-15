"""Guard native Classic pre focus parity without extra markup or JavaScript."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ClassicPreFocusContract(unittest.TestCase):
    def test_native_pre_focus(self):
        css = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        selector = ':is(.wp-block-code,.wp-block-table,.wp-block-calendar,.slateframe-prose pre):focus-visible'
        self.assertIn(selector + '{outline:2px solid Highlight;outline-offset:-2px}', css)
        self.assertIn('.slateframe-prose pre:not(.wp-block-verse),.wp-block-code{overflow:auto;', css)
        self.assertLessEqual(len(css.encode('utf-8')), 7000)

    def test_wordpress_browser_contract(self):
        js = (ROOT / 'tests/browser/classic-pre-focus.spec.js').read_text(encoding='utf-8')
        for needle in ('[320, 375, 390, 412, 768, 1440, 1920]', "['ltr', 'rtl']",
                       "page.keyboard.press('Tab')", 'toBeFocused()', "fontSize = '400%'",
                       "forcedColors: 'active'", 'outlineWidth', 'pageOverflow',
                       'classic-pre-320-rtl-400-forced-colors.png'):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)
