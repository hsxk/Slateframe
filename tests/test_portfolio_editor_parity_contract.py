"""Ensure native Portfolio cards have matching frontend and Gutenberg treatment."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "assets/css/content-modes.css"
FUNCTIONS = ROOT / "functions.php"

class PortfolioEditorParityContract(unittest.TestCase):
    def test_frontend_and_editor_share_text_only_rule(self):
        css = CSS.read_text(encoding="utf-8")
        self.assertIn(":is(.slateframe-main,.editor-styles-wrapper) .slateframe-project-grid .slateframe-project-card:not(:has(.wp-block-post-featured-image img))", css)
        self.assertNotIn(".slateframe-main .slateframe-project-grid .slateframe-project-card:not(", css)

    def test_image_presence_controls_decoration(self):
        css = CSS.read_text(encoding="utf-8")
        self.assertIn(":not(:has(.wp-block-post-featured-image img))", css)
        self.assertIn("border-inline-start:2px solid var(--slateframe-accent)", css)
        self.assertIn("padding-inline-start:var(--slateframe-stack-gap)", css)

    def test_editor_uses_the_same_stylesheet(self):
        functions = FUNCTIONS.read_text(encoding="utf-8")
        self.assertIn("add_theme_support( 'editor-styles' )", functions)
        self.assertIn("'assets/css/content-modes.css'", functions)
        self.assertIn("add_editor_style(", functions)

    def test_existing_budget_is_unchanged(self):
        self.assertLessEqual(CSS.stat().st_size, 7000)

if __name__ == "__main__":
    unittest.main()
