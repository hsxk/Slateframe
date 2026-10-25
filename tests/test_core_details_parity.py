"""Native Core Details stays semantic, conditional and editor-shared."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreDetailsParity(unittest.TestCase):
    def test_native_block_registration_and_budget(self):
        php = (ROOT / "functions.php").read_text()
        css = (ROOT / "assets/css/core-details.css").read_text()
        ci = (ROOT / ".github/workflows/quality.yml").read_text()
        for needle in ("function slateframe_register_core_details_styles()",
                       "'core/details',", "'handle' => 'slateframe-core-details'",
                       "'assets/css/core-details.css'",
                       "add_action( 'init', 'slateframe_register_core_details_styles', 20 );"):
            self.assertIn(needle, php)
        self.assertIn("'assets/css/core-details.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for needle in (".wp-block-details", ">summary", "min-inline-size:0",
                       "overflow-wrap:anywhere", "min-block-size:var(--slateframe-control)",
                       ":focus-visible", "currentColor"):
            self.assertIn(needle, css)
        self.assertLessEqual(len(css.encode()), 400)
        self.assertIn("test $(wc -c < assets/css/core-details.css) -le 400", ci)
        for forbidden in ("!important", "display:none", "display:flex", "time2log",
                          "javascript", "pointer-events:none"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/details", php)

    def test_wordpress_keyboard_axe_and_visual_inventory(self):
        js = (ROOT / "tests/browser/core-details-parity.spec.js").read_text()
        ci = (ROOT / ".github/workflows/quality.yml").read_text()
        for needle in ("wp('post', 'create'", "wp:details", "<summary>",
                       "日本語 中文 العربية", "summary.press('Enter')",
                       "summary.press('Space')", "toHaveAttribute('open'",
                       "320, 375, 390, 412, 768, 1440, 1920",
                       "'ltr', 'rtl'", "[16, 32, 64]", "forcedColors",
                       "AxeBuilder", "openAuthenticatedEditor",
                       "blocks.serialize", "blocks.parse",
                       "core-details-390-rtl-200-forced-colors.png",
                       "wp('post', 'delete'", "'--force'"):
            self.assertIn(needle, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill",
                          "set_theme_mod(", "window.addEventListener"):
            self.assertNotIn(forbidden, js)
        self.assertIn("Missing native Details evidence", ci)
        self.assertIn("Missing native Details forced-colors evidence", ci)


if __name__ == "__main__":
    unittest.main()
