"""Guard classic Search 400% reflow without weakening the 300-byte budget."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'assets/css/search-form.css').read_text(encoding='utf-8')
BROWSER = (ROOT / 'tests/browser/search-large-text-reflow.spec.js').read_text(encoding='utf-8')


class SearchLargeTextContract(unittest.TestCase):
    def test_budget_and_shared_tokens(self):
        self.assertLessEqual(len(CSS.encode('utf-8')), 300)
        self.assertIn('gap:var(--slateframe-component-gap)', CSS)
        self.assertIn('margin-block-start:var(--slateframe-stack-gap)', CSS)
        self.assertNotIn('!important', CSS)

    def test_large_text_reflow_does_not_weaken_mobile_grid(self):
        self.assertIn('display:flex;flex-wrap:wrap', CSS)
        self.assertIn('& label{flex:1 1 24rem;min-width:0}', CSS)
        self.assertIn('.slateframe-search-form button{flex:1 1 10rem}', CSS)
        self.assertIn('@media(max-width:640px){.slateframe-search-form{display:grid}}', CSS)
        self.assertNotIn('max-width:45%', CSS)

    def test_real_wordpress_browser_regression_coverage(self):
        for token in ('?s=Portable', 'new FormData', "['ltr', 'rtl']", '[16, 32, 64]',
                      'viewport >= 768', 'formWidth * 0.8', 'AxeBuilder', 'forcedColors',
                      "toBeFocused", "focus-visible", 'screenshot', 'overflow'):
            with self.subTest(token=token):
                self.assertIn(token, BROWSER)


if __name__ == '__main__':
    unittest.main()
