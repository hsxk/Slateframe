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

    def test_plugin_query_loop_list_reset_and_editor_asset_parity(self):
        """Core-compatible plugin markup must not expose browser list bullets."""
        query = (ROOT / "assets/css/query-loop.css").read_text()
        bootstrap = (ROOT / "functions.php").read_text()
        self.assertIn(".wp-block-post-template{list-style:none;", query)
        self.assertIn("padding-inline:0", query)
        self.assertIn("margin-inline:0", query)
        self.assertIn("'assets/css/query-loop.css'", bootstrap)
        self.assertLessEqual(len(query.encode("utf-8")), 3000)

    def test_comment_form_and_thread_depth(self):
        css = (ROOT / "assets/css/comments.css").read_text()
        self.assertIn(".comment-form-url,.comment-form-comment)", css)
        self.assertIn("max-inline-size:34rem", css)
        self.assertIn("@media(max-width:480px)", css)

    def test_search_core_and_theme_localizations(self):
        core = (ROOT / "assets/css/forms.css").read_text()
        base = (ROOT / "style.css").read_text()
        own = (ROOT / "assets/css/search-form.css").read_text()
        self.assertIn(".wp-block-search__inside-wrapper{flex-wrap:wrap", base)
        self.assertIn("flex:1 1 16rem", base)
        self.assertIn("margin-inline-start:0", core)
        self.assertLessEqual(len(core.encode("utf-8")), 1300)
        self.assertIn(".slateframe-search-form button{flex:1 1 10rem}", own)
        self.assertIn("display:flex;flex-wrap:wrap", own)
        self.assertIn("@media(max-width:640px){.slateframe-search-form{display:grid}}", own)
        self.assertLessEqual(len(own.encode("utf-8")), 300)

    def test_core_file_focus_ring_uses_accessible_theme_token(self):
        css = (ROOT / "assets/css/reading.css").read_text()
        base = (ROOT / "style.css").read_text()
        self.assertIn(":focus-visible,.wp-block-file>a:focus-visible:focus{", base)
        self.assertIn("outline:var(--slateframe-focus-width) solid var(--slateframe-focus)", base)
        self.assertIn("--slateframe-focus-width:3px", base)
        self.assertLessEqual(len(css.encode("utf-8")), 7000)

    def test_css_static_budgets(self):
        for name, limit in {"content-modes.css":7000,"editor.css":5000,"comments.css":3000}.items():
            with self.subTest(name=name):
                self.assertLessEqual((ROOT / "assets/css" / name).stat().st_size, limit)


if __name__ == "__main__":
    unittest.main()
