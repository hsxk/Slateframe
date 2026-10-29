"""Native Core Comments thread conditional styling and runtime coverage."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class CoreCommentsThreadParity(unittest.TestCase):
    def test_core_first_conditional_asset(self):
        php = (ROOT / "functions.php").read_text(encoding="utf-8")
        css = (ROOT / "assets/css/core-comments-thread.css").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in ("function slateframe_register_core_comments_thread_styles()",
                      "'core/comments',", "'handle' => 'slateframe-core-comments-thread'",
                      "'assets/css/core-comments-thread.css'",
                      "add_action( 'init', 'slateframe_register_core_comments_thread_styles', 20 );"):
            self.assertIn(token, php)
        self.assertIn("'assets/css/core-comments-thread.css'",
                      php.split("add_editor_style(", 1)[1].split(");", 1)[0])
        for token in (".wp-block-comments", ".wp-block-comment-template",
                      ".wp-block-comment-author-name", ".wp-block-comment-date",
                      ".wp-block-comment-reply-link", ".wp-block-comment-content",
                      "min-block-size:var(--slateframe-control)",
                      "overflow-wrap:anywhere", "padding-inline-start",
                      "@media(max-width:640px)"):
            self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 900)
        self.assertIn("test $(wc -c < assets/css/core-comments-thread.css) -le 900", workflow)
        self.assertIn("grep -qx 'slateframe/assets/css/core-comments-thread.css' /tmp/package.txt", workflow)
        self.assertIn("python3 tests/verify_core_comments_thread_evidence.py", workflow)
        for bad in ("!important", "display:none", "direction:ltr", "javascript", "time2log"):
            self.assertNotIn(bad, css)
        self.assertNotIn("render_block_core/comments", php)

    def test_real_wordpress_editor_and_screenshots(self):
        js = (ROOT / "tests/browser/core-comments-thread-parity.spec.js").read_text(encoding="utf-8")
        for token in ("wp('post', 'create'", "wp('comment', 'create'",
                      "wp('comment', 'delete'", "'--comment_approved=1'",
                      "'--comment_approved=0'", "wp:comments", "wp:comment-template",
                      "wp:comment-author-name", "wp:comment-content",
                      "wp:comment-date", "wp:comment-reply-link",
                      "320, 375, 390, 412, 768, 1440, 1920",
                      "['ltr', 'rtl']", "[16, 32, 64]",
                      "forcedColors: 'active'", "AxeBuilder",
                      "openAuthenticatedEditor", "blocks.serialize", "blocks.parse",
                      "core-comments-thread-390-rtl-400.png",
                      "core-comments-thread-1440-ltr.png"):
            self.assertIn(token, js)
        for bad in ("test.only", "test.fixme", "route.fulfill", "set_theme_mod("):
            self.assertNotIn(bad, js)

if __name__ == "__main__":
    unittest.main()
