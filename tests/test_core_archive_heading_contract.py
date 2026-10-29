"""Core-first archive headings and term descriptions remain bounded and editor-compatible."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class ArchiveHeadingContract(unittest.TestCase):
    def test_conditional_registration_and_editor_parity(self):
        source = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("function slateframe_register_core_archive_heading_styles()", source)
        self.assertIn("array( 'query-title', 'term-description' )", source)
        self.assertIn("wp_enqueue_block_style(", source)
        self.assertIn("add_action( 'init', 'slateframe_register_core_archive_heading_styles', 20 );", source)
        for block in ("query-title", "term-description"):
            self.assertIn("'assets/css/core-" + block + ".css'", source)

    def test_small_scoped_styles_without_runtime_js(self):
        for block in ("query-title", "term-description"):
            css = (ROOT / "assets/css" / ("core-" + block + ".css")).read_text()
            self.assertIn("overflow-wrap:anywhere", css)
            self.assertIn("max-inline-size:100%", css)
            self.assertIn("min-inline-size:0", css)
            self.assertLessEqual(len(css.encode()), 300)
            self.assertNotIn("!important", css)
            self.assertNotIn("@import", css)

    def test_real_browser_contract(self):
        js = (ROOT / "tests/browser/core-archive-heading-parity.spec.js").read_text()
        for required in ("[320, 375, 390, 412, 768, 1440, 1920]",
                         "['ltr', 'rtl']", "[16, 32, 64]",
                         "getClientRects()", "forcedColors: 'active'",
                         "AxeBuilder", "openAuthenticatedEditor",
                         "core-archive-heading-390-rtl-400-forced-colors.png",
                         "core-term-description-390-rtl-400-forced-colors.png",
                         "core/query-title", "core/term-description"):
            with self.subTest(required=required):
                self.assertIn(required, js)

if __name__ == "__main__":
    unittest.main()
