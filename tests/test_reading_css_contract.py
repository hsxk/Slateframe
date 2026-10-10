"""Guard shared Slateframe Gutenberg/frontend reading rhythm and asset budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
READING = ROOT / "assets/css/reading.css"
EDITOR = ROOT / "assets/css/editor.css"


class SharedReadingCssTest(unittest.TestCase):
    def test_semantic_blocks_share_scope(self):
        css = READING.read_text(encoding="utf-8")
        self.assertEqual(css.count(":is(.slateframe-prose,.editor-styles-wrapper){"), 1)
        for selector in (
            "& h2{", "& h3{", "& h4{", "& :is(h5,h6){",
            "& :is(ul,ol){", "& dl{", "& dt{", "& dd{", "& hr{",
            "& .wp-block-pullquote blockquote{", "& .wp-block-details summary{",
            "& .wp-block-footnotes li{",
        ):
            with self.subTest(selector=selector):
                self.assertIn(selector, css)

    def test_editor_has_no_competing_duplicate_typography(self):
        editor = EDITOR.read_text(encoding="utf-8")
        for selector in (
            ".editor-styles-wrapper h2 {", ".editor-styles-wrapper h3 {",
            ".editor-styles-wrapper :is(h2, h3, h4) {",
            ".editor-styles-wrapper .wp-block-details summary {",
            ".editor-styles-wrapper .wp-block-footnotes {",
        ):
            with self.subTest(selector=selector):
                self.assertNotIn(selector, editor)

    def test_existing_asset_budgets(self):
        self.assertLessEqual(READING.stat().st_size, 7000)
        self.assertLessEqual(EDITOR.stat().st_size, 5000)


if __name__ == "__main__":
    unittest.main()
