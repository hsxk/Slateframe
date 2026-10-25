"""Native Core Page List distribution and browser acceptance contract."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
class CorePageListParity(unittest.TestCase):
    def test_scoped_asset_and_editor_parity(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-page-list.css").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in ("slateframe_register_core_page_list_styles", "'core/page-list',",
                      "'slateframe-core-page-list'", "assets/css/core-page-list.css",
                      "add_action( 'init', 'slateframe_register_core_page_list_styles', 20 );"):
            self.assertIn(token, php)
        for token in (".wp-block-page-list", ":is(li,ul)", "min-inline-size:0",
                      "max-inline-size:100%", "min-inline-size:min(100%,var(--slateframe-control))",
                      "min-block-size:var(--slateframe-control)", "overflow-wrap:anywhere"):
            self.assertIn(token, css)
        self.assertIn("test $(wc -c < assets/css/core-page-list.css) -le 500", workflow)
        self.assertLessEqual(len(css.encode("utf-8")), 500)
        for forbidden in ("!important", "javascript", "time2log_", "wpcode_",
                          "direction:ltr", "position:fixed", "display:none"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/page-list", php)
    def test_real_wordpress_and_gutenberg_coverage(self):
        js = (ROOT / "tests/browser/core-page-list-parity.spec.js").read_text(encoding="utf-8")
        for token in ("--post_parent=", "--post_status=draft", "get_permalink(",
                      "published.includes(url)", "Core preserves parent/child/grandchild",
                      "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
                      "forcedColors: 'active'", "new AxeBuilder", "openAuthenticatedEditor",
                      "blocks.serialize", "blocks.parse", "finally", "wp('post', 'delete'",
                      "core-page-list-390-rtl-200-forced-colors.png"):
            self.assertIn(token, js)
if __name__ == "__main__":
    unittest.main()
