"""Keep native fieldset legend padding bounded under 400% text zoom."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class LegendPaddingContract(unittest.TestCase):
    def test_token_based_bounded_legend_padding(self):
        css = (ROOT / 'assets/css/form-content.css').read_text(encoding='utf-8')
        self.assertIn('padding-inline:min(var(--slateframe-space-2),4px)', css)
        self.assertIn('overflow-wrap:anywhere', css)
        self.assertLessEqual(len(css.encode('utf-8')), 750)
        self.assertNotIn('!important', css)

    def test_word_level_browser_coverage(self):
        source = (ROOT / 'tests/browser/fieldset-legend-zoom.spec.js').read_text(encoding='utf-8')
        for needle in ("['forms', 'form-content']", "['ltr', 'rtl']", '[16, 32, 64]', "'controls'.length",
                       'width >= 375', 'forcedColors', 'fieldset-legend-rtl-400-',
                       'scrollWidth - document.documentElement.clientWidth'):
            with self.subTest(needle=needle):
                self.assertIn(needle, source)


if __name__ == '__main__':
    unittest.main()
