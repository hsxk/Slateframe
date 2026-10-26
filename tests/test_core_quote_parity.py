"""Core Quote keeps native markup, plain variants, and Gutenberg parity."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreQuoteParity(unittest.TestCase):
    def test_asset_namespace_and_editor_contract(self):
        php = (ROOT / "functions.php").read_text()
        css = (ROOT / "assets/css/core-quote.css").read_text()
        ci = (ROOT / ".github/workflows/quality.yml").read_text()
        for value in ("function slateframe_register_core_quote_styles()", "'core/quote',",
                      "'handle' => 'slateframe-core-quote'", "'assets/css/core-quote.css'",
                      "add_action( 'init', 'slateframe_register_core_quote_styles', 20 );"):
            self.assertIn(value, php)
        self.assertIn("'assets/css/core-quote.css'", php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for value in (".wp-block-quote", ".is-style-plain", "border-inline-start:0",
                      "padding-inline-start:0", "overflow-wrap:anywhere", "CanvasText"):
            self.assertIn(value, css)
        self.assertLessEqual(len(css.encode()), 450)
        self.assertIn("test $(wc -c < assets/css/core-quote.css) -le 450", ci)
        self.assertIn("slateframe/assets/css/core-quote.css", ci)
        for forbidden in ("!important", "display:none", "time2log_", "wpcode_", "javascript"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/quote", php)

    def test_wordpress_evidence_and_gutenberg(self):
        js = (ROOT / "tests/browser/core-quote-parity.spec.js").read_text()
        for value in ("wp('post', 'create'", "wp:quote", "is-style-plain", "<cite>",
                      "日本語 中文 العربية", "320, 375, 390, 412, 768, 1440, 1920",
                      "'ltr', 'rtl'", "[16, 32, 64]", "forcedColors", "AxeBuilder",
                      "openAuthenticatedEditor", "blocks.serialize", "blocks.parse",
                      "core-quote-390-rtl-200-forced-colors.png", "'--force'"):
            self.assertIn(value, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill", "set_theme_mod("):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
