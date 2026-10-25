"""Native Core Post Terms presentation and browser acceptance contract."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostTermsParity(unittest.TestCase):
    def test_conditional_core_only_css_and_editor(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-post-terms.css").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for needle in (
            "function slateframe_register_core_post_terms_styles()",
            "'core/post-terms',",
            "'handle' => 'slateframe-core-post-terms'",
            "'assets/css/core-post-terms.css'",
            "add_action( 'init', 'slateframe_register_core_post_terms_styles', 20 );",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, php)
        for needle in (
            ".wp-block-post-terms", ".wp-block-post-terms a",
            ".wp-block-post-terms__separator", "min-inline-size:0",
            "max-inline-size:100%", "display:inline-block",
            "box-sizing:border-box", "overflow-wrap:anywhere",
            "min-block-size:var(--slateframe-control)",
            "min-inline-size:min(100%,var(--slateframe-control))",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, css)
        self.assertIn("assets/css/core-post-terms.css", workflow)
        self.assertIn("test $(wc -c < assets/css/core-post-terms.css) -le 450", workflow)
        self.assertLessEqual(len(css.encode("utf-8")), 450)
        for forbidden in ("!important", "javascript", "time2log_", "wpcode_",
                          "direction:ltr", "font-size:", "display:none"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/post-terms", php)

    def test_disposable_wordpress_and_editor_evidence(self):
        js = (ROOT / "tests/browser/core-post-terms-parity.spec.js").read_text(encoding="utf-8")
        for needle in (
            "wp('term', 'create'", "wp('post', 'create'",
            "wp('term', 'delete'", "wp('post', 'delete'",
            "wp('post', 'term', 'set'", "get_term_link(",
            "post_tag", "category", "finally",
            "320, 375, 390, 412, 768, 1440, 1920",
            "'ltr', 'rtl'", "fontSize = '64px'",
            "forcedColors: 'active'", "new AxeBuilder",
            "openAuthenticatedEditor", "blocks.serialize",
            "blocks.parse", "page.keyboard.press('Tab')",
            "core-post-terms-390-rtl-200-forced-colors.png",
            "page.goto('/?p=999999999'",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)


if __name__ == "__main__":
    unittest.main()
