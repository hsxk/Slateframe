"""Native Core Post Comments Count remains Core-owned and responsive."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostCommentsCountParity(unittest.TestCase):
    def test_conditional_editor_shared_style_and_package(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-post-comments-count.css").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in (
            "function slateframe_register_core_post_comments_count_styles()",
            "'core/post-comments-count',",
            "'handle' => 'slateframe-core-post-comments-count'",
            "'assets/css/core-post-comments-count.css'",
            "add_action( 'init', 'slateframe_register_core_post_comments_count_styles', 20 );",
        ):
            with self.subTest(token=token):
                self.assertIn(token, php)
        self.assertIn("'assets/css/core-post-comments-count.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for token in (".wp-block-post-comments-count", "min-inline-size:0",
                      "max-inline-size:100%", "overflow-wrap:anywhere",
                      "font-variant-numeric:tabular-nums", "word-break:normal"):
            self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 240)
        self.assertIn("test $(wc -c < assets/css/core-post-comments-count.css) -le 240", ci)
        self.assertIn("grep -qx 'slateframe/assets/css/core-post-comments-count.css' /tmp/package.txt", ci)
        for forbidden in ("!important", "display:none", "time2log_", "wpcode_",
                          "direction:ltr", "javascript", "get_comments_number("):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/post-comments-count", php)

    def test_real_wordpress_and_editor_evidence(self):
        js = (ROOT / "tests/browser/core-post-comments-count-parity.spec.js").read_text(encoding="utf-8")
        for token in (
            "wp('post', 'create'", "wp('comment', 'create'",
            "wp('comment', 'delete'", "wp('post', 'delete'", "finally",
            "'--comment_approved=0'", "'--comment_approved=1'",
            "'--comment_status=closed'",
            "wp:query", "wp:post-template", "wp:post-comments-count",
            "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
            "fontSize = '64px'", "forcedColors: 'active'",
            "AxeBuilder", "openAuthenticatedEditor", "blocks.serialize",
            "blocks.parse", "page.keyboard.press('Tab')",
            "core-post-comments-count-390-rtl-200-forced-colors.png",
            "page.goto('/?p=999999999'",
        ):
            with self.subTest(token=token):
                self.assertIn(token, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill",
                          "set_theme_mod(", "wp('option', 'update'"):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
