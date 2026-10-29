"""Guard independently downloadable, exact-HEAD WordPress.org ZIP evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/quality.yml"
DISTIGNORE = ROOT / ".distignore"


class DistributionArtifactContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW.read_text(encoding="utf-8")
        cls.job = cls.workflow.split("\n  theme-check:\n", 1)[1].split("\n  wordpress-smoke:\n", 1)[0]

    def test_artifact_is_uploaded_only_after_actual_theme_check(self):
        job = self.job
        self.assertLess(job.index("name: Build production theme"), job.index("name: Install WordPress, Theme Check"))
        self.assertLess(job.index("name: Install WordPress, Theme Check"), job.index("name: Attest exact-HEAD distributable"))
        self.assertLess(job.index("name: Attest exact-HEAD distributable"), job.index("name: Upload exact-HEAD distributable"))
        self.assertIn("bin/build-theme-zip.sh /tmp/slateframe-theme-check-dist", job)
        self.assertIn("wp theme-check run slateframe --format=json", job)

    def test_head_provenance_is_verified_not_assumed(self):
        job = self.job
        self.assertIn("github.event.pull_request.head.sha || github.sha", job)
        self.assertIn('git -C "$GITHUB_WORKSPACE" rev-parse HEAD', job)
        self.assertIn('= "$SLATEFRAME_EXPECTED_SHA"', job)
        self.assertIn("HEAD_SHA.txt", job)
        self.assertIn("sha256sum slateframe.zip > SHA256SUMS", job)
        self.assertIn("sha256sum --check SHA256SUMS", job)

    def test_distributable_artifact_is_complete_and_non_optional(self):
        job = self.job
        self.assertIn("name: slateframe-distribution", job)
        self.assertIn("uses: actions/upload-artifact@v4", job)
        for name in ("slateframe.zip", "HEAD_SHA.txt", "SHA256SUMS"):
            self.assertIn("/tmp/slateframe-theme-check-dist/" + name, job)
        self.assertIn("if-no-files-found: error", job)
        self.assertIn("compression-level: 0", job)
        self.assertIn("retention-days: 7", job)
        self.assertNotIn("continue-on-error: true", job)

    def test_provenance_stays_outside_public_theme_zip(self):
        ignored = DISTIGNORE.read_text(encoding="utf-8").splitlines()
        for directory in ("docs/", "bin/", "tests/", ".github/"):
            self.assertIn(directory, ignored)
        self.assertNotIn("HEAD_SHA.txt", (ROOT / "bin/build-theme-zip.sh").read_text(encoding="utf-8"))
        self.assertNotIn("SHA256SUMS", (ROOT / "bin/build-theme-zip.sh").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
