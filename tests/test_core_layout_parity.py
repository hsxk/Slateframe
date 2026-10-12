"""Guard Core-first responsive Portfolio, comments and Search without relaxing CSS budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ResponsiveCoreContracts(unittest.TestCase):
    def test_portfolio_front_end_and_editor_match(self):
        front = (ROOT / "assets/css/content-modes.css").read_text()
        editor = (ROOT / "assets/css/editor.css").read_text()
        self.assertIn(".slateframe-project-card > :is(.wp-block-post-title,.wp-block-post-excerpt,.wp-block-post-date)", front)
        self.assertIn("max-width:none", editor)
        self.assertIn(".slateframe-project-card :is(.wp-block-post-title,.wp-block-post-excerpt,.wp-block-post-date)", editor)

    def test_comment_form_and_thread_depth(self):
        css = (ROOT / "assets/css/comments.css").read_text()
        self.assertIn(".comment-form-url,.comment-form-comment)", css)
        self.assertIn("max-inline-size:34rem", css)
        self.assertIn("@media(max-width:480px)", css)

    def test_search_core_and_theme_localizations(self):
        core = (ROOT / "assets/css/forms.css").read_text()
        own = (ROOT / "assets/css/search-form.css").read_text()
        self.assertIn(".wp-block-search__inside-wrapper{flex-wrap:wrap", core)
        self.assertIn("flex:1 1 min(100%,16rem)", core)
        self.assertIn("max-inline-size:45%", own)

    def test_css_static_budgets(self):
        for name, limit in {"content-modes.css":7000,"editor.css":5000,"comments.css":3000}.items():
            with self.subTest(name=name):
                self.assertLessEqual((ROOT / "assets/css" / name).stat().st_size, limit)


if __name__ == "__main__":
    unittest.main()
