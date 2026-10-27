"""Native Core Query No Results is conditional, bounded and editor-safe."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreQueryNoResultsParity(unittest.TestCase):
    def test_conditional_editor_shared_style_and_package(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-query-no-results.css").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in (
            "function slateframe_register_core_query_no_results_styles()",
            "'core/query-no-results',",
            "'handle' => 'slateframe-core-query-no-results'",
            "'assets/css/core-query-no-results.css'",
            "add_action( 'init', 'slateframe_register_core_query_no_results_styles', 20 );",
        ):
            with self.subTest(token=token):
                self.assertIn(token, php)
        self.assertIn("'assets/css/core-query-no-results.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for token in (".wp-block-query-no-results", "min-inline-size:0",
                      "max-inline-size:100%", "overflow-wrap:anywhere",
                      "var(--slateframe-stack-gap)", "var(--slateframe-rule)"):
            self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 360)
        self.assertIn("test $(wc -c < assets/css/core-query-no-results.css) -le 360", ci)
        self.assertIn("grep -qx 'slateframe/assets/css/core-query-no-results.css' /tmp/package.txt", ci)
        for forbidden in ("!important", "display:none", "time2log_", "wpcode_",
                          "direction:ltr", "javascript", "WP_Query(", "render_block_core/query-no-results"):
            self.assertNotIn(forbidden, css + php[php.find("function slateframe_register_core_query_no_results_styles()"):][:700])

    def test_disposable_wordpress_and_editor_acceptance(self):
        js = (ROOT / "tests/browser/core-query-no-results-parity.spec.js").read_text(encoding="utf-8")
        for token in (
            "wp('post', 'create'", "wp('post', 'delete'", "finally",
            "wp:query", "wp:post-template", "wp:query-no-results",
            "slateframe-empty-query", "slateframe-populated-query",
            "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
            "setRootTextScale(page, font, dir)", "setRootTextScale(page, 64, 'rtl')",
            "forcedColors: 'active'", "new AxeBuilder",
            "page.keyboard.press('Tab')", "openAuthenticatedEditor",
            "blocks.serialize", "blocks.parse",
            "core-query-no-results-390-rtl-200-forced-colors.png",
            "core-query-no-results-390-rtl-400-forced-colors.png",
            "core-query-no-results-390-' + dir + '-400.png",
            "page.goto('/?p=999999999'",
        ):
            with self.subTest(token=token):
                self.assertIn(token, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill", "set_theme_mod(",
                          "node.style.fontSize", "node.style.fontSize ="):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
