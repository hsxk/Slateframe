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

    def test_core_details_keeps_native_disclosure_affordance(self):
        css = READING.read_text(encoding="utf-8")
        self.assertIn("& .wp-block-details summary{display:list-item;", css)
        self.assertIn("min-block-size:var(--slateframe-control)", css)
        self.assertIn("padding-block:max(.25em,calc((var(--slateframe-control) - 1.5em)/2))", css)
        self.assertIn("list-style-position:inside;overflow-wrap:anywhere;cursor:pointer", css)
        self.assertIn("border-block:var(--slateframe-rule)", css)
        self.assertIn("margin-block-end:var(--slateframe-component-gap)", css)
        self.assertIn("& .wp-block-details[open]>summary+*{margin-block-start:0}", css)
        self.assertNotIn(".wp-block-details summary::marker{", css)
        self.assertNotIn("& .wp-block-details summary{min-block-size:var(--slateframe-control);display:flex;", css)

    def test_native_scroll_focus_keeps_core_semantics_and_budget(self):
        css = READING.read_text(encoding="utf-8")
        selector = ":is(.wp-block-code,.wp-block-table,.wp-block-calendar):focus-visible"
        self.assertEqual(css.count(selector), 1)
        self.assertIn(selector + "{outline:2px solid Highlight;outline-offset:-2px}", css)
        self.assertNotIn("-webkit-overflow-scrolling:touch", css)
        self.assertNotIn(".wp-block-table{tabindex:", css)
        self.assertLessEqual(len(css.encode("utf-8")), 7000)

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

    def test_core_table_of_contents_is_plugin_agnostic(self):
        reading = READING.read_text(encoding="utf-8")
        self.assertIn(".slateframe-prose .wp-block-table-of-contents", reading)
        self.assertIn("min-block-size:var(--slateframe-control)", reading)
        for path in (ROOT / "style.css", ROOT / "rtl.css", *(ROOT / "assets/css").glob("*.css")):
            css = path.read_text(encoding="utf-8").lower()
            for legacy in ("ez-toc", "yoast", "jetpack", "wpcode", "polylang", "time2log", "time2analyze"):
                with self.subTest(file=path.name, legacy=legacy):
                    self.assertNotIn(legacy, css)

    def test_existing_asset_budgets(self):
        self.assertLessEqual(READING.stat().st_size, 7000)
        self.assertLessEqual(EDITOR.stat().st_size, 5000)

    def test_portfolio_metrics_follow_core_columns(self):
        css = (ROOT / "assets/css/content-modes.css").read_text(encoding="utf-8")
        self.assertIn("@media (max-width:781px){", css)
        self.assertIn("is-style-slateframe-metrics:not(.is-not-stacked-on-mobile)", css)
        self.assertIn("min-inline-size:0;padding:var(--slateframe-stack-gap)", css)
        self.assertIn("overflow-wrap:anywhere;", css)
        self.assertIn("border-inline-start:0;border-block-start:var(--slateframe-rule)", css)
        self.assertLessEqual(len(css.encode("utf-8")), 7000)


if __name__ == "__main__":
    unittest.main()
