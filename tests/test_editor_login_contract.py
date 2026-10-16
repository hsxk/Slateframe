"""Protect the real Gutenberg login boundary without weakening browser coverage."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HELPER = (ROOT / "tests/browser/support/editor-login.js").read_text(encoding="utf-8")
EDITOR = (ROOT / "tests/browser/editor.spec.js").read_text(encoding="utf-8")
CJK = (ROOT / "tests/browser/cjk-heading-editor.spec.js").read_text(encoding="utf-8")


class GutenbergLoginContract(unittest.TestCase):
    def test_both_real_editor_suites_share_login_boundary(self):
        self.assertIn("openAuthenticatedEditor(page, editorPostId)", EDITOR)
        self.assertIn("openAuthenticatedEditor(page, postId)", CJK)
        self.assertNotIn("page.waitForURL(/\\/wp-admin\\//)", EDITOR)

    def test_login_observes_actual_post_and_session(self):
        for marker in ("waitForResponse", "response.request().method() === 'POST'",
                       "url.pathname === loginPath", "wordpress_logged_in_",
                       "response.status() >= 400"):
            self.assertIn(marker, HELPER)

    def test_editor_identity_and_core_store_are_checked(self):
        for marker in ("Number.isSafeInteger", "editorURL.pathname",
                       "editorURL.origin", "searchParams.get('post')",
                       "searchParams.get('action')", "'core/block-editor'"):
            self.assertIn(marker, HELPER)


if __name__ == "__main__":
    unittest.main()
