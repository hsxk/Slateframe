"""Guard native Core Separator presentation, authored colors, and evidence gates."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreSeparatorParity(unittest.TestCase):
    def test_conditional_editor_shared_asset_and_strict_budget(self):
        php = (ROOT / "functions.php").read_text()
        css = (ROOT / "assets/css/core-separator.css").read_text()
        ci = (ROOT / ".github/workflows/quality.yml").read_text()
        for value in ("function slateframe_register_core_separator_styles()",
                      "'core/separator',", "'handle' => 'slateframe-core-separator'",
                      "'assets/css/core-separator.css'",
                      "add_action( 'init', 'slateframe_register_core_separator_styles', 20 );"):
            self.assertIn(value, php)
        self.assertIn("'assets/css/core-separator.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for value in (".wp-block-separator", "box-sizing:border-box",
                      "max-inline-size:100%", ":not(.has-text-color)",
                      "--slateframe-border", "forced-colors:active", "CanvasText"):
            self.assertIn(value, css)
        self.assertLessEqual(len(css.encode()), 280)
        self.assertIn("test $(wc -c < assets/css/core-separator.css) -le 280", ci)
        self.assertIn("grep -qx 'slateframe/assets/css/core-separator.css' /tmp/package.txt", ci)
        for forbidden in ("!important", "display:none", "time2log", "wpcode_",
                          "javascript", "pointer-events:none", "content:"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/separator", php)

    def test_real_wordpress_keyboard_axe_visuals_and_gutenberg(self):
        js = (ROOT / "tests/browser/core-separator-parity.spec.js").read_text()
        ci = (ROOT / ".github/workflows/quality.yml").read_text()
        for value in ("wp('post', 'create'", "wp:separator", "is-style-wide",
                      "is-style-dots", "has-text-color", "日本語 中文 العربية",
                      "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
                      "[16, 32, 64]", "forcedColors", "AxeBuilder",
                      "openAuthenticatedEditor", "blocks.serialize", "blocks.parse",
                      "core-separator-390-rtl-200-forced-colors.png", "'--force'"):
            self.assertIn(value, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill",
                          "set_theme_mod(", "window.addEventListener"):
            self.assertNotIn(forbidden, js)
        self.assertIn("Missing Core Separator evidence", ci)
        self.assertIn("Missing Core Separator forced-colors evidence", ci)


if __name__ == "__main__":
    unittest.main()
