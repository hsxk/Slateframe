"""Ensure real WordPress Gutenberg login specs run in an isolated serial group."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class EditorLoginIsolationContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        cls.editor = (ROOT / 'tests/browser/cjk-heading-editor.spec.js').read_text(encoding='utf-8')

    def test_authenticated_group_exists(self):
        self.assertIn('authenticated_specs=()', self.workflow)
        self.assertIn("elif grep -Eq 'openAuthenticatedEditor|support/editor-login'", self.workflow)
        self.assertIn('authenticated_specs+=("$spec")', self.workflow)

    def test_editor_fixture_is_actually_classified(self):
        self.assertIn('openAuthenticatedEditor', self.editor)

    def test_serial_login_without_skipping(self):
        self.assertIn('npx playwright test "${authenticated_specs[@]}" --workers=1', self.workflow)
        self.assertIn('test "${#authenticated_specs[@]}" -gt 0', self.workflow)

    def test_existing_readonly_and_stateful_suites_remain(self):
        self.assertIn('npx playwright test "${readonly_specs[@]}"', self.workflow)
        self.assertIn('npx playwright test "${stateful_specs[@]}" --workers=1', self.workflow)
        self.assertIn('execFileSync|execSync|spawnSync', self.workflow)

    def test_no_retry_or_timeout_relaxation(self):
        self.assertNotIn('npx playwright test "${authenticated_specs[@]}" --workers=1 --retries', self.workflow)


if __name__ == '__main__':
    unittest.main()
