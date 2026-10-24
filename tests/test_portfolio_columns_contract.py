"""Protect native Query Loop column choices without expanding CSS budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PortfolioColumnsContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.css = (ROOT / 'assets/css/query-loop.css').read_text(encoding='utf-8')

    def test_budget_is_unchanged(self):
        self.assertLessEqual(len(self.css.encode('utf-8')), 3000)

    def test_native_flex_column_choices_are_supported(self):
        for count in range(1, 7):
            self.assertIn(f'&.columns-{count}{{--slateframe-project-columns:{count}}}', self.css)
        self.assertIn('repeat(var(--slateframe-project-columns),minmax(0,1fr))', self.css)

    def test_native_grid_layout_is_not_overridden(self):
        self.assertIn('.wp-block-post-template:where(:not(.is-layout-grid))', self.css)
        self.assertNotIn('.wp-block-post-template{display:grid!important;', self.css)

    def test_tablet_and_mobile_caps_preserve_single_column_choices(self):
        self.assertIn('repeat(min(2,var(--slateframe-project-columns)),minmax(0,1fr))', self.css)
        self.assertIn('@media(max-width:640px)', self.css)

    def test_footer_query_loop_remains_one_column(self):
        self.assertIn('.slateframe-footer-content .wp-block-post-template{grid-template-columns:1fr}', self.css)
        self.assertIn(':where(:not(.is-layout-grid))', self.css)


if __name__ == '__main__':
    unittest.main()
