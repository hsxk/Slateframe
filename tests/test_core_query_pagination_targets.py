"""Guard native Core Query Pagination without adding a custom renderer or JS."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreQueryPaginationTargets(unittest.TestCase):
    def test_core_selector_is_site_neutral_and_editor_visible(self):
        css = (ROOT / "style.css").read_text()
        php = (ROOT / "functions.php").read_text()
        selector = ".wp-block-query-pagination :is(a,.page-numbers)"
        self.assertIn(selector, css)
        self.assertIn(".slateframe-pagination .page-numbers," + selector + "{display:grid", css)
        self.assertIn("min-inline-size:var(--slateframe-control)", css)
        self.assertIn("min-block-size:var(--slateframe-control)", css)
        self.assertIn("overflow-wrap:anywhere", css.rsplit(selector, 1)[1][:300])
        self.assertIn("font-variant-numeric:tabular-nums", css.split(selector, 1)[1][:300])
        self.assertIn(".wp-block-query-pagination .current{background:var(--slateframe-text);color:var(--slateframe-bg);font-weight:700}", css)
        self.assertIn(".wp-block-query-pagination .current{outline:2px solid CanvasText", css)
        self.assertNotIn(".slateframe-project-grid " + selector, css)
        self.assertIn("add_theme_support( 'editor-styles' )", php)
        self.assertIn("add_editor_style( array( 'style.css'", php)

    def test_budget_and_runtime_evidence(self):
        style = (ROOT / "style.css").stat().st_size
        nav = (ROOT / "assets/css/navigation.css").stat().st_size
        footer = (ROOT / "assets/css/footer.css").stat().st_size
        js = (ROOT / "assets/js/theme.js").stat().st_size
        forms = (ROOT / "assets/css/forms.css").stat().st_size
        self.assertLessEqual(style, 16000)
        self.assertLessEqual(style + nav + footer + js + forms, 24500)
        browser = (ROOT / "tests/browser/portfolio-pagination-controls.spec.js").read_text()
        for marker in ("320, 375, 390, 412, 768, 1440, 1920", "16, 32, 64",
                       "'ltr', 'rtl'", "forcedColors: 'active'", "toBeFocused()",
                       "new AxeBuilder", ".page-numbers.current", "await next.click()",
                       "await back.click()", "UnbrokenProjectLabel", "test-artifacts/screenshots/"):
            self.assertIn(marker, browser)


if __name__ == "__main__":
    unittest.main()
