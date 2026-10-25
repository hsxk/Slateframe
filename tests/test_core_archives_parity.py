"""Native Core Archives list/dropdown presentation contract."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreArchivesParity(unittest.TestCase):
    def test_block_scoped_style_and_editor_parity(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-archives.css").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for needle in ("function slateframe_register_core_archives_styles()",
                       "'core/archives',", "'handle' => 'slateframe-core-archives'",
                       "'assets/css/core-archives.css'",
                       "add_action( 'init', 'slateframe_register_core_archives_styles', 20 );"):
            self.assertIn(needle, php)
        for needle in (".wp-block-archives", ".wp-block-archives-dropdown select",
                       "min-inline-size:0", "max-inline-size:100%",
                       "min-inline-size:min(100%,var(--slateframe-control))",
                       "min-block-size:var(--slateframe-control)", "overflow-wrap:anywhere"):
            self.assertIn(needle, css)
        self.assertIn("assets/css/core-archives.css", workflow)
        self.assertIn("test $(wc -c < assets/css/core-archives.css) -le 550", workflow)
        self.assertLessEqual(len(css.encode("utf-8")), 550)
        for forbidden in ("!important", "javascript", "time2log_", "wpcode_", "direction:ltr"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/archives", php)

    def test_real_wordpress_browser_evidence(self):
        js = (ROOT / "tests/browser/core-archives-parity.spec.js").read_text(encoding="utf-8")
        for needle in ("wp('post', 'create'", "wp('post', 'delete'", "finally",
                       "get_month_link(2026, 8)", "get_month_link(2026, 9)",
                       "archive-dropdown", "select.selectOption(expected[0])",
                       "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
                       "forcedColors: 'active'", "new AxeBuilder",
                       "core-archives-390-rtl-200-forced-colors.png",
                       "openAuthenticatedEditor", "blocks.serialize", "blocks.parse"):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)


if __name__ == "__main__":
    unittest.main()
