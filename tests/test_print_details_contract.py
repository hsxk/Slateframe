"""Ensure print-only Core Details visibility preserves native screen interaction."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
JS = (ROOT / 'assets/js/theme.js').read_text(encoding='utf-8')
BROWSER = (ROOT / 'tests/browser/print-closed-details.spec.js').read_text(encoding='utf-8')


class PrintDetailsContractTest(unittest.TestCase):
    def test_shared_script_budget_and_native_lifecycle(self):
        self.assertLessEqual(len(JS.encode('utf-8')), 3376)
        for token in ("'beforeprint'", "'afterprint'", "details:not([open])", 'pd.forEach(x=>x.open=1)', 'pd?.forEach(x=>x.open=0)', 'pd||=', 'pd=0'):
            with self.subTest(token=token):
                self.assertIn(token, JS)

    def test_print_scope_excludes_unrelated_disclosures(self):
        self.assertIn(".slateframe-prose details:not([open])", JS)
        self.assertNotIn('querySelectorAll(\'details', JS)

    def test_wordpress_browser_contract_checks_state_restoration(self):
        for token in ('SLATEFRAME_POST_PATH', "'beforeprint'", "'afterprint'", 'print-nested-body', 'print-open-body', 'scrollWidth', 'print-closed-details-', '200%', "'rtl'"):
            with self.subTest(token=token):
                self.assertIn(token, BROWSER)


if __name__ == '__main__':
    unittest.main()
