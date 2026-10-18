"""Guard WordPress Core login request and CI regression test wiring."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class GutenbergLoginRequestContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.helper = (ROOT / 'tests/browser/support/editor-login.js').read_text(encoding='utf-8')
        cls.workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')

    def test_browser_shared_cookie_post(self):
        self.assertIn('page.request.post(loginURL', self.helper)
        self.assertIn('maxRedirects: 0', self.helper)
        self.assertIn('hasWordPressSession(cookies)', self.helper)
        self.assertIn("select?.getBlocks?.().length", self.helper)

    def test_credentials_protected_by_fixture_origin_and_path(self):
        self.assertIn('expectedLoginURL.pathname', self.helper)
        self.assertIn("'127.0.0.1', 'localhost', '[::1]'", self.helper)
        self.assertLess(self.helper.index('Unexpected WordPress login endpoint for the configured fixture.'),
                        self.helper.index('page.request.post(loginURL'))

    def test_regressions_are_executed_in_static_ci(self):
        self.assertIn('node tests/browser/test-wordpress-login.cjs', self.workflow)
        self.assertIn('node tests/browser/test-editor-login-helper.cjs', self.workflow)

    def test_no_timeout_relaxation_or_skips(self):
        self.assertNotIn('waitForResponse', self.helper)
        self.assertNotIn('setDefaultTimeout', self.helper)
        self.assertNotIn('test.skip', self.helper)


if __name__ == '__main__':
    unittest.main()
