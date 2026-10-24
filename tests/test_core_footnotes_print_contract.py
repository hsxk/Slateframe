"""Printed Core Footnotes stay readable without screen-sized touch targets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PRINT = (ROOT / 'assets/css/print.css').read_text(encoding='utf-8')
BROWSER = (ROOT / 'tests/browser/core-footnotes-print.spec.js').read_text(encoding='utf-8')


class CoreFootnotesPrintContract(unittest.TestCase):
    def test_print_footnotes_reset_screen_target_dimensions(self):
        screen = (ROOT / 'style.css').read_text(encoding='utf-8')
        self.assertIn('@media screen{.wp-block-footnotes a[href^="#fnref"]', screen)
        self.assertEqual(PRINT.count('@media print'), 1)
        self.assertIn(':focus{outline:0}', PRINT)
        self.assertIn('scroll-margin-block-start:var(--slateframe-header-height)', screen.split('@media screen{', 1)[1])
        self.assertNotIn('}}:is([id^=fnref],.wp-block-footnotes li[id^=fn])', screen)
        self.assertLessEqual(len(PRINT.encode('utf-8')), 3000)
        self.assertNotIn('@media print', (ROOT / 'style.css').read_text(encoding='utf-8'))

    def test_real_wordpress_print_browser_coverage(self):
        for token in ('SLATEFRAME_POST_PATH', 'slateframe-print-css',
                      "media: 'print'", "media: 'screen'", 'printWidth',
                      'printHeight', 'focusOutline', 'targetOutline', 'rgb(0, 0, 0)', 'sourceTarget', 'toBeVisible', 'screenshot', 'rtl'):
            with self.subTest(token=token):
                self.assertIn(token, BROWSER)


if __name__ == '__main__':
    unittest.main()
