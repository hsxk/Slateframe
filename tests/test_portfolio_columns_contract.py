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

    def test_named_container_reflow_is_bounded_and_scoped(self):
        reflow = (ROOT / 'assets/css/portfolio-reflow.css').read_text(encoding='utf-8')
        self.assertLessEqual(len(reflow.encode('utf-8')), 260)
        self.assertIn('.slateframe-project-grid{container:slateframe-portfolio/inline-size}', reflow)
        self.assertIn('@container slateframe-portfolio (max-width:35rem)', reflow)
        self.assertIn('.wp-block-post-template:where(:not(.is-layout-grid))', reflow)
        self.assertIn('grid-template-columns:minmax(0,1fr)', reflow)
        self.assertNotIn('overflow:hidden', reflow)
        self.assertNotIn('!important', reflow)

    def test_conditional_frontend_and_editor_parity(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        self.assertIn("'assets/css/query-loop.css', 'assets/css/portfolio-reflow.css', 'assets/css/editor.css'", php)
        self.assertIn("'slateframe-portfolio-reflow'", php)
        self.assertIn("array( 'slateframe-query-loop' )", php)
        self.assertIn("get_template_directory_uri() . '/assets/css/portfolio-reflow.css'", php)

    def test_all_authored_columns_rtl_cjk_and_core_grid_survive_zoom(self):
        browser = (ROOT / 'tests/browser/portfolio-core-columns.spec.js').read_text(encoding='utf-8')
        self.assertIn('w <= 35 * rootPx ? 1 : columns(chosen, w)', browser)
        self.assertIn('for (const chosen of [1, 2, 3, 4, 5, 6])', browser)
        self.assertIn('Core Grid must survive 400%', browser)
        self.assertIn('for (const viewport of [641, 650, 680, 720, 768, 900])', browser)
        self.assertIn('for (const chosen of [1, 2, 3, 4, 5, 6])', browser)
        self.assertIn("for (const dir of ['ltr', 'rtl'])", browser)
        self.assertIn("node.style.fontSize = '64px'", browser)
        self.assertIn('expect(target.height).toBeGreaterThanOrEqual(43)', browser)

    def test_exact_sha_evidence_and_budget_gates(self):
        browser = (ROOT / 'tests/browser/portfolio-core-columns.spec.js').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        self.assertIn('portfolio-reflow-${viewport}-${direction}-400.png', workflow)
        self.assertIn('portfolio-reflow-680-${direction}-default.png', workflow)
        self.assertIn('for viewport in 320 375 390 412 768 1440 1920; do', workflow)
        self.assertIn('portfolio-reflow-390-rtl-400-forced-colors.png', workflow)
        self.assertIn(".include('.slateframe-project-grid')", browser)
        self.assertIn(".withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])", browser)
        self.assertIn("forcedColors: 'active'", browser)
        self.assertIn('assets/css/portfolio-reflow.css', workflow)
        self.assertIn('test $(wc -c < assets/css/portfolio-reflow.css) -le 260', workflow)

    def test_plugin_shortcode_reflow_keeps_normal_size_and_core_grid(self):
        plugin = (ROOT / 'tests/browser/plugin-coexistence.spec.js').read_text(encoding='utf-8')
        self.assertIn('baselineTracks', plugin)
        self.assertIn('normal-size columns', plugin)
        self.assertIn('layout.containerWidth <= 35 * layout.rootFontSize', plugin)
        self.assertIn('200% container reflow', plugin)
        self.assertIn("'portfolio-reflow':0", plugin)
        self.assertIn("'portfolio-reflow':1", plugin)
        self.assertIn('const coreGrid =', plugin)
        self.assertIn('Core grid columns', plugin)


if __name__ == '__main__':
    unittest.main()
