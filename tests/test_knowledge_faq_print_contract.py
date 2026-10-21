"""Printed Core Details answers must not silently disappear from Knowledge articles."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PRINT = ROOT / 'assets/css/print.css'
BROWSER = ROOT / 'tests/browser/knowledge-faq-print.spec.js'


class KnowledgeFaqPrintContract(unittest.TestCase):
    def test_closed_disclosure_answers_are_restored_only_for_print(self):
        css = PRINT.read_text(encoding='utf-8')
        self.assertIn('@media print', css)
        self.assertRegex(css, r'\.slateframe-prose\s+details:not\(\[open\]\)::details-content\s*\{content-visibility:visible!important\}')
        self.assertNotIn('details:not([open]) > :not(summary){display:block!important}', css)

    def test_summary_stays_with_answer_even_when_initially_closed(self):
        css = PRINT.read_text(encoding='utf-8')
        self.assertRegex(css, r'\.slateframe-prose\s+details>summary\s*\{break-after:avoid;list-style:none\}')
        self.assertNotIn('details[open]>summary{break-after:avoid}', css)

    def test_real_wordpress_fixture_and_responsive_print_assertions(self):
        source = BROWSER.read_text(encoding='utf-8')
        for fragment in ('WP_Block_Patterns_Registry', 'slateframe/knowledge-faq',
                         '--post_type=page', '--post_content=', '--force',
                         "media: 'print'", "['ltr', 'rtl']", "'200%'",
                         'getBoundingClientRect()', 'document.documentElement.scrollWidth',
                         'not.toHaveAttribute(\'open\')', 'toBeHidden()',
                         "media: 'screen'", "forcedColors: direction === 'rtl' ? 'active' : 'none'",
                         'viewport-${viewport(info)}-knowledge-faq-print-'):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, source)


if __name__ == '__main__':
    unittest.main()
