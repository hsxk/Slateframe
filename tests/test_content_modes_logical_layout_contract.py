"""Guard RTL-safe layout and high-zoom text wrapping in core content modes.

These assertions complement browser screenshots: they prevent accidental
replacement of logical properties with physical left/right layout rules.
"""
from pathlib import Path
import re
import unittest

CSS = Path(__file__).resolve().parents[1] / "assets/css/content-modes.css"


class ContentModesLogicalLayoutContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.css = CSS.read_text(encoding="utf-8")

    def test_core_content_modes_avoid_physical_direction_properties(self):
        physical = re.findall(
            r"(?<![\w-])(margin-left|margin-right|padding-left|padding-right|"
            r"border-left|border-right|left|right|text-align)\s*:",
            self.css,
        )
        self.assertEqual([], physical, "Use logical inline properties for RTL parity")

    def test_knowledge_and_portfolio_wrap_long_identifiers(self):
        self.assertRegex(
            self.css,
            r"\.slateframe-knowledge-procedure\{[^}]*min-inline-size:0;"
            r"[^}]*overflow-wrap:anywhere",
        )
        self.assertRegex(
            self.css,
            r"\.slateframe-project-meta\{[^}]*overflow-wrap:anywhere",
        )

    def test_editor_columns_and_project_cards_allow_shrinkage(self):
        self.assertIn(
            ".editor-styles-wrapper .wp-block-columns>.wp-block-column"
            "{min-inline-size:0;overflow-wrap:anywhere}",
            self.css,
        )
        self.assertRegex(
            self.css,
            r"\.slateframe-project-card>:is\([^)]*\)\{[^}]*"
            r"min-inline-size:0;overflow-wrap:anywhere",
        )

    def test_existing_css_byte_budget_is_preserved(self):
        self.assertLessEqual(CSS.stat().st_size, 7000)


if __name__ == "__main__":
    unittest.main()
