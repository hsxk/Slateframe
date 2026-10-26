"""Native Core Post Comments Link remains a conditional presentation adapter."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostCommentsLinkParity(unittest.TestCase):
    def test_conditional_asset_and_gutenberg_parity(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-post-comments-link.css").read_text(encoding="utf-8")
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for needle in (
            "function slateframe_register_core_post_comments_link_styles()",
            "'core/post-comments-link',",
            "'handle' => 'slateframe-core-post-comments-link'",
            "'assets/css/core-post-comments-link.css'",
            "add_action( 'init', 'slateframe_register_core_post_comments_link_styles', 20 );",
        ):
            self.assertIn(needle, php)
        self.assertIn("'assets/css/core-post-comments-link.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for needle in (
            ".wp-block-post-comments-link", ".wp-block-post-comments-link a",
            "min-inline-size:0", "max-inline-size:100%", "display:inline-flex",
            "min-block-size:var(--slateframe-control)", "overflow-wrap:anywhere",
        ):
            self.assertIn(needle, css)
        self.assertLessEqual(len(css.encode("utf-8")), 380)
        self.assertIn("test $(wc -c < assets/css/core-post-comments-link.css) -le 380", ci)
        self.assertIn("slateframe/assets/css/core-post-comments-link.css", ci)
        for forbidden in ("!important", "display:none", "time2log_", "wpcode_", "javascript"):
            self.assertNotIn(forbidden, css)
        self.assertNotIn("render_block_core/post-comments-link", php)

    def test_disposable_wordpress_and_accessibility_evidence(self):
        js = (ROOT / "tests/browser/core-post-comments-link-parity.spec.js").read_text(encoding="utf-8")
        for needle in (
            "wp('post', 'create'", "wp('comment', 'create'",
            "wp('comment', 'delete'", "wp('post', 'delete'",
            "get_comments_link(", "finally", "--comment_status=open",
            "wp:query", "wp:post-template", "--post_type=page",
            "320, 375, 390, 412, 768, 1440, 1920",
            "'ltr', 'rtl'", "[16, 32, 64]", "fontSize = '64px'",
            "forcedColors: 'active'", "AxeBuilder", "openAuthenticatedEditor",
            "blocks.serialize", "blocks.parse", "page.keyboard.press('Tab')",
            "core-post-comments-link-390-rtl-200-forced-colors.png",
            "page.goto('/?p=999999999'",
        ):
            self.assertIn(needle, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill", "set_theme_mod("):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
