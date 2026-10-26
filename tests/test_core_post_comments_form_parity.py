"""Native Core Post Comments Form is a conditional, presentation-only adapter."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostCommentsFormParity(unittest.TestCase):
    def test_core_ownership_and_editor_shared_asset(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-post-comments-form.css").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in (
            "function slateframe_register_core_post_comments_form_styles()",
            "'core/post-comments-form',",
            "'handle' => 'slateframe-core-post-comments-form'",
            "'assets/css/core-post-comments-form.css'",
            "add_action( 'init', 'slateframe_register_core_post_comments_form_styles', 20 );",
        ):
            self.assertIn(token, php)
        self.assertIn("'assets/css/core-post-comments-form.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for token in (
            ".wp-block-post-comments-form", "min-inline-size:0",
            "max-inline-size:100%", "overflow-wrap:anywhere",
            "box-sizing:border-box", "comment-form-cookies-consent",
            "min-block-size:var(--slateframe-control)",
        ):
            self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 850)
        self.assertIn("test $(wc -c < assets/css/core-post-comments-form.css) -le 850", ci)
        self.assertIn("grep -qx 'slateframe/assets/css/core-post-comments-form.css' /tmp/package.txt", ci)
        for forbidden in ("!important", "display:none", "time2log_", "wpcode_",
                          "direction:ltr", "javascript"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/post-comments-form", php)
        self.assertNotIn("comment_form(", php)

    def test_wordpress_browser_and_editor_coverage(self):
        js = (ROOT / "tests/browser/core-post-comments-form-parity.spec.js").read_text(
            encoding="utf-8")
        for token in (
            "wp('post', 'create'", "wp('post', 'delete'", "finally",
            "--comment_status=open", "--comment_status=closed",
            "wp:post-comments-form", "form#commentform", "textarea#comment",
            "label[for=\"comment\"]", "320, 375, 390, 412, 768, 1440, 1920",
            "'ltr', 'rtl'", "[16, 32, 64]", "fontSize = '64px'",
            "forcedColors: 'active'", "AxeBuilder", "openAuthenticatedEditor",
            "blocks.serialize", "blocks.parse", "page.keyboard.press('Tab')",
            "core-post-comments-form-390-rtl-200-forced-colors.png",
            "page.goto('/?p=999999999'",
        ):
            self.assertIn(token, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill", "set_theme_mod("):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
