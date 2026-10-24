"""Protect real Gutenberg login, session, editor identity and safety boundaries."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
HELPER = (ROOT / "tests/browser/support/editor-login.js").read_text(encoding="utf-8")
CORE = (ROOT / "tests/browser/support/wordpress-login.js").read_text(encoding="utf-8")
QUALITY = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
EDITOR = (ROOT / "tests/browser/editor.spec.js").read_text(encoding="utf-8")
CJK = (ROOT / "tests/browser/cjk-heading-editor.spec.js").read_text(encoding="utf-8")


class GutenbergLoginContract(unittest.TestCase):
    def test_both_real_editor_suites_share_login_boundary(self):
        self.assertIn("openAuthenticatedEditor(page, editorPostId)", EDITOR)
        self.assertIn("openAuthenticatedEditor(page, postId)", CJK)
        self.assertNotIn("page.waitForURL(/\\/wp-admin\\//)", EDITOR)

    def test_login_performs_real_wordpress_post_and_signed_session_verification(self):
        # The browser form navigation event was absent in a real failing trace.
        # Preserve actual WP authentication while avoiding that event race.
        for marker in ("page.request.post(loginURL", "form: buildLoginForm(loginURL, editorURL)",
                       "maxRedirects: 0", "validateLoginRedirect(response, loginURL, editorURL)",
                       "page.context().cookies(loginURL)", "hasWordPressSession(cookies)"):
            self.assertIn(marker, HELPER)
        self.assertNotIn("waitForResponse", HELPER)
        for marker in ("log: 'admin'", "pwd: 'ci-password'", "testcookie: '1'",
                       "status !== 302 && status !== 303", "headers()['location']",
                       "wordpress_logged_in_"):
            self.assertIn(marker, CORE)

    def test_no_credentials_leave_expected_fixture(self):
        for marker in ("expectedLoginURL.origin", "expectedLoginURL.pathname",
                       "loopback WordPress fixture", "Unexpected WordPress login endpoint"):
            self.assertIn(marker, HELPER)
        self.assertLess(HELPER.index("Unexpected WordPress login endpoint for the configured fixture."),
                        HELPER.index("page.request.post(loginURL"))
        self.assertIn("redirect.origin !== editor.origin", CORE)
        self.assertIn("!redirect.pathname.startsWith(adminPath)", CORE)

    def test_editor_identity_and_core_store_are_checked(self):
        for marker in ("Number.isSafeInteger", "actual.pathname", "actual.origin",
                       "searchParams.get('post')", "searchParams.get('action')",
                       "'core/block-editor'", "getBlocks?.().length"):
            self.assertIn(marker, HELPER)

    def test_real_behavior_regressions_execute_in_ci(self):
        self.assertIn("node tests/browser/test-wordpress-login.cjs", QUALITY)
        self.assertIn("node tests/browser/test-editor-login-helper.cjs", QUALITY)
        self.assertIn("npx playwright test \"${authenticated_specs[@]}\" --workers=1", QUALITY)


if __name__ == "__main__":
    unittest.main()
