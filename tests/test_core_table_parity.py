"""Core Table responsive, Gutenberg, and release evidence contract."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreTableParity(unittest.TestCase):
    def test_conditional_asset_and_release_budget(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-table.css").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in ("function slateframe_register_core_table_styles()", "'core/table',",
                      "'handle' => 'slateframe-core-table'",
                      "'assets/css/core-table.css'",
                      "add_action( 'init', 'slateframe_register_core_table_styles', 20 );"):
            self.assertIn(token, php)
        self.assertIn("'assets/css/core-table.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for token in (".wp-block-table", "table.has-fixed-layout",
                      "min-inline-size:100%", "max-inline-size:var(--slateframe-wide)",
                      "overflow-wrap:anywhere", "figcaption",
                      "text-align:start", "forced-colors:active", "CanvasText"):
            self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 600)
        self.assertIn("test $(wc -c < assets/css/core-table.css) -le 600", ci)
        self.assertIn("slateframe/assets/css/core-table.css", ci)
        self.assertIn("core-table-${width}-${direction}.png", ci)
        for bad in ("!important", "time2log_", "wpcode_", "direction:ltr",
                    "display:none", "javascript"):
            self.assertNotIn(bad, css)
        self.assertEqual(php.count("add_filter( 'render_block_core/table', 'slateframe_focusable_table_block' );"), 1)

    def test_wordpress_and_editor_evidence(self):
        js = (ROOT / "tests/browser/core-table-parity.spec.js").read_text(encoding="utf-8")
        for token in ("wp('post', 'create'", "wp('post', 'delete'", "finally",
                      "wp:table", "has-fixed-layout", "is-style-stripes",
                      "figcaption", "日本語 中文 العربية", "320, 375, 390, 412, 768, 1440, 1920",
                      "'ltr', 'rtl'", "[16, 32, 64]", "forcedColors: 'active'",
                      "AxeBuilder", "openAuthenticatedEditor", "blocks.serialize",
                      "blocks.parse", "core-table-390-rtl-200-forced-colors.png",
                      "page.goto('/?p=999999999'"):
            self.assertIn(token, js)
        for token in ("setRootTextScale(page, font, dir)", "setRootTextScale(page, 32, 'rtl')",
                      "setRootTextScale(page, 64, 'rtl')", "core-table-390-rtl-400-forced-colors.png"):
            self.assertIn(token, js)
        for bad in ("test.only", "test.fixme", "route.fulfill", "set_theme_mod(",
                    "wp('option', 'update'"):
            self.assertNotIn(bad, js)


if __name__ == "__main__":
    unittest.main()
