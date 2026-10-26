"""Core Comments Title presentation and approved-count regression."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreCommentsTitleParity(unittest.TestCase):
    def test_editor_shared_conditional_asset(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-comments-title.css").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in ("function slateframe_register_core_comments_title_styles()",
                      "'core/comments-title',",
                      "'handle' => 'slateframe-core-comments-title'",
                      "'assets/css/core-comments-title.css'",
                      "add_action( 'init', 'slateframe_register_core_comments_title_styles', 20 );"):
            self.assertIn(token, php)
        self.assertIn("'assets/css/core-comments-title.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for token in (".wp-block-comments-title", "min-inline-size:0",
                      "max-inline-size:100%", "overflow-wrap:anywhere",
                      "word-break:normal"):
            self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 240)
        self.assertIn("test $(wc -c < assets/css/core-comments-title.css) -le 240", ci)
        self.assertIn("grep -qx 'slateframe/assets/css/core-comments-title.css' /tmp/package.txt", ci)
        for bad in ("!important", "display:none", "time2log_", "wpcode_",
                    "direction:ltr", "javascript"):
            self.assertNotIn(bad, css)
        self.assertNotIn("render_block_core/comments-title", php)

    def test_disposable_wordpress_and_editor_evidence(self):
        js = (ROOT / "tests/browser/core-comments-title-parity.spec.js").read_text(encoding="utf-8")
        for token in ("wp('post', 'create'", "wp('comment', 'create'",
                      "wp('comment', 'delete'", "wp('post', 'delete'", "finally",
                      "'--comment_approved=0'", "'--comment_approved=1'",
                      "wp:comments", "wp:comments-title", "showPostTitle",
                      "showCommentsCount", "320, 375, 390, 412, 768, 1440, 1920",
                      "'ltr', 'rtl'", "fontSize = '64px'", "forcedColors: 'active'",
                      "AxeBuilder", "openAuthenticatedEditor", "blocks.serialize",
                      "blocks.parse", "page.keyboard.press('Tab')",
                      "core-comments-title-390-rtl-200-forced-colors.png",
                      "page.goto('/?p=999999999'"):
            self.assertIn(token, js)
        for bad in ("test.only", "test.fixme", "route.fulfill",
                    "set_theme_mod(", "wp('option', 'update'"):
            self.assertNotIn(bad, js)


if __name__ == "__main__":
    unittest.main()
