"""Protect full PR and main-merge CI without redundant development push runs."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = (
    ROOT / ".github" / "workflows" / "quality.yml",
    ROOT / ".github" / "workflows" / "photography.yml",
)


class WorkflowTriggerBoundariesTest(unittest.TestCase):
    """PR HEAD and main merge must both retain all existing quality gates."""

    def test_main_push_only_and_pr_to_main(self):
        for path in WORKFLOWS:
            with self.subTest(workflow=path.name):
                source = path.read_text(encoding="utf-8")
                push = re.search(r"(?m)^  push:\n    branches: \[(.*?)\]$", source)
                self.assertIsNotNone(push)
                self.assertEqual(push.group(1), "main")
                pr = re.search(r"(?m)^  pull_request:\n    branches: \[(.*?)\]$", source)
                self.assertIsNotNone(pr)
                self.assertIn("main", [part.strip() for part in pr.group(1).split(",")])

    def test_exact_head_checkout_and_concurrency(self):
        for path in WORKFLOWS:
            with self.subTest(workflow=path.name):
                source = path.read_text(encoding="utf-8")
                self.assertIn("github.event.pull_request.head.sha || github.sha", source)
                self.assertIn("cancel-in-progress: true", source)
                self.assertIn("persist-credentials: false", source)

    def test_quality_keeps_all_compatibility_and_browser_gates(self):
        source = WORKFLOWS[0].read_text(encoding="utf-8")
        for required in (
            "Static quality", "Browser smoke", "WordPress.org Theme Check",
            "WordPress coding standards", "Build distributable",
            "Compatibility · WP ${{ matrix.wordpress }} · PHP ${{ matrix.php }}",
        ):
            with self.subTest(job=required):
                self.assertIn(required, source)
        # GitHub expands one matrix job into four checks; the YAML contains
        # the expression and include pairs, not four literal job names.
        matrix = re.findall(
            r"(?m)^          - wordpress: '([^']+)'\n            php: '([^']+)'$",
            source,
        )
        self.assertCountEqual(matrix, [
            ("6.7", "7.4"), ("6.7", "8.3"),
            ("latest", "7.4"), ("latest", "8.3"),
        ])

    def test_photography_keeps_native_lightbox_gate(self):
        source = WORKFLOWS[1].read_text(encoding="utf-8")
        self.assertIn("Raster images and native lightbox", source)
        self.assertIn("slateframe-photography-runtime", source)


if __name__ == "__main__":
    unittest.main()
