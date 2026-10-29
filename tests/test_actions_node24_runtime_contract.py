"""Guard maintained official Actions majors and unchanged test runtime policy."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = (
    ROOT / ".github/workflows/quality.yml",
    ROOT / ".github/workflows/photography.yml",
)


class ActionsNode24RuntimeContract(unittest.TestCase):
    def test_official_actions_use_maintained_v7(self):
        for path in WORKFLOWS:
            source = path.read_text(encoding="utf-8")
            with self.subTest(workflow=path.name):
                for action in ("checkout", "setup-node", "upload-artifact"):
                    versions = re.findall(r"actions/" + action + r"@v(\d+)", source)
                    self.assertTrue(versions, action)
                    self.assertTrue(all(version == "7" for version in versions), action)

    def test_browser_node_version_and_cache_policy_unchanged(self):
        for path in WORKFLOWS:
            source = path.read_text(encoding="utf-8")
            with self.subTest(workflow=path.name):
                self.assertIn("node-version: '22'", source)
                self.assertEqual(source.count("package-manager-cache: false"), 1)
                self.assertNotIn("always-auth:", source)
                self.assertNotIn("registry-url:", source)

    def test_all_checkouts_preserve_exact_sha_and_read_only_credentials(self):
        for path in WORKFLOWS:
            source = path.read_text(encoding="utf-8")
            blocks = re.findall(
                r"^\s+- uses: actions/checkout@v7\n((?:\s+[^\n]*\n){0,7})",
                source,
                re.M,
            )
            with self.subTest(workflow=path.name):
                self.assertTrue(blocks)
                for block in blocks:
                    self.assertIn("github.event.pull_request.head.sha || github.sha", block)
                    self.assertIn("github.event.pull_request.head.repo.full_name || github.repository", block)
                    self.assertIn("persist-credentials: false", block)

    def test_workflow_permissions_remain_read_only(self):
        for path in WORKFLOWS:
            source = path.read_text(encoding="utf-8")
            with self.subTest(workflow=path.name):
                self.assertIn("permissions:\n  contents: read", source)
                self.assertNotIn("contents: write", source)


if __name__ == "__main__":
    unittest.main()
