"""Core-first print presentation contracts without a separate rendering engine."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PRINT = ROOT / "assets/css/print.css"


class PrintPresentationContractTest(unittest.TestCase):
    def test_print_css_stays_bounded_and_plugin_independent(self):
        css = PRINT.read_text(encoding="utf-8")
        self.assertIn("@media print {", css)
        self.assertLessEqual(len(css.encode("utf-8")), 3000)
        for forbidden in ("@import", "100vw", "time2log", "tablepress"):
            self.assertNotIn(forbidden, css.lower())

    def test_native_media_enqueue(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("'slateframe-print'", php)
        self.assertIn("'/assets/css/print.css'", php)
        self.assertRegex(php, r"'slateframe-print'[\s\S]*?\$version,\s*'print'\s*\)")

    def test_accessible_print_boundaries_and_core_blocks(self):
        css = "".join(PRINT.read_text(encoding="utf-8").split())
        for term in (
            ".slateframe-site-header", ".slateframe-site-footer",
            ".slateframe-comments", ".slateframe-related",
            ".wp-lightbox-overlay", ".slateframe-prose",
            ".wp-block-table", ".slateframe-prose>table",
            ".wp-block-cover__image-background",
            ".slateframe-entry-hero-image", ".wp-block-spacer",
            ".slateframe-pagination", "position:static!important",
            "box-sizing:border-box!important", "max-height:18cm!important",
            "overflow:visible!important", "break-inside:avoid",
            "table-header-group", "table-footer-group",
            "orphans:3", "widows:3", "color:#000!important",
        ):
            with self.subTest(term=term):
                self.assertIn(term, css)

    def test_ordinary_portrait_images_are_page_bounded(self):
        css = PRINT.read_text(encoding="utf-8")
        self.assertIn(".slateframe-prose img{max-block-size:18cm!important", css)
        self.assertIn("width:auto!important;max-width:100%;height:auto!important", css)

    def test_actions_artifact_gate(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        self.assertIn("print-article-viewport-" + chr(36) + "{viewport}.png", workflow)
        self.assertIn("Missing print evidence:", workflow)


if __name__ == "__main__":
    unittest.main()
