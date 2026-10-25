"""Core Group presentation is native, conditional, bounded and editor-shared."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreGroupParity(unittest.TestCase):
    def test_asset_and_namespace_contract(self):
        php = (ROOT / "functions.php").read_text()
        css = (ROOT / "assets/css/core-group.css").read_text()
        ci = (ROOT / ".github/workflows/quality.yml").read_text()
        for value in ("function slateframe_register_core_group_styles()",
                      "'core/group',", "'handle' => 'slateframe-core-group'",
                      "'assets/css/core-group.css'",
                      "add_action( 'init', 'slateframe_register_core_group_styles', 20 );"):
            self.assertIn(value, php)
        self.assertIn("'assets/css/core-group.css'", php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for value in (".wp-block-group", ":not(.alignwide)", ":not(.alignfull)",
                      "min-inline-size:0", "max-inline-size:100%", "overflow-wrap:anywhere"):
            self.assertIn(value, css)
        self.assertLessEqual(len(css.encode()), 240)
        self.assertIn("test $(wc -c < assets/css/core-group.css) -le 240", ci)
        for forbidden in ("!important", "display:none", "time2log_", "wpcode_", "javascript"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/group", php)

    def test_real_wordpress_evidence_and_gutenberg(self):
        js = (ROOT / "tests/browser/core-group-parity.spec.js").read_text()
        for value in ("wp('post', 'create'", "wp:group", "wp:paragraph", "wp:button",
                      "日本語 中文 العربية", "320, 375, 390, 412, 768, 1440, 1920",
                      "'ltr', 'rtl'", "[16, 32, 64]", "forcedColors", "AxeBuilder",
                      "openAuthenticatedEditor", "blocks.serialize", "blocks.parse",
                      "core-group-390-rtl-200-forced-colors.png", "'--force'"):
            self.assertIn(value, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill", "set_theme_mod("):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
