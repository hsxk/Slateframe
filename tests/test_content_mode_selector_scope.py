"""Keep content-mode selector compaction semantically scoped to Core blocks."""

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "assets/css/content-modes.css"


class ContentModeSelectorBoundaries(unittest.TestCase):
    def setUp(self):
        self.css = CSS.read_text(encoding="utf-8")

    def test_checklist_core_and_classic_list_share_one_rule(self):
        # The unqualified class already covers .wp-block-list; duplicating
        # that selector only consumes the tight content-modes CSS budget.
        self.assertIn(
            ".is-style-slateframe-checklist>li{position:relative;",
            self.css,
        )
        self.assertIn(
            ".is-style-slateframe-checklist>li::before{position:absolute;",
            self.css,
        )
        self.assertNotIn(
            ".wp-block-list.is-style-slateframe-checklist>li,",
            self.css,
        )
        self.assertNotIn(
            ".wp-block-list.is-style-slateframe-checklist>li::before,",
            self.css,
        )

    def test_first_and_last_child_reset_stays_inside_supported_group_styles(self):
        selector = (
            ".wp-block-group:is(.is-style-slateframe-key-facts,"
            ".is-style-slateframe-learning-callout,"
            ".is-style-slateframe-project-brief,"
            ".is-style-slateframe-definition)"
        )
        self.assertIn(
            selector
            + "{&>:first-child{margin-block-start:0}"
            + "&>:last-child{margin-block-end:0}}",
            self.css,
        )
        self.assertNotIn(
            ".wp-block-group>:first-child{margin-block-start:0}",
            self.css,
        )
        self.assertNotIn(
            ".wp-block-group>:last-child{margin-block-end:0}",
            self.css,
        )

    def test_existing_static_budget_is_not_raised(self):
        self.assertLessEqual(len(CSS.read_bytes()), 7000)
        self.assertIn(".wp-block-columns.is-style-slateframe-metrics", self.css)
        self.assertIn(".slateframe-knowledge-checklist", self.css)
        self.assertIn("@media(forced-colors:active)", self.css)


if __name__ == "__main__":
    unittest.main()
