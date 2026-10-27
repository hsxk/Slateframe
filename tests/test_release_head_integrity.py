"""Independent Git-backed regression for the final Slateframe ZIP/HEAD boundary."""

import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


VERIFIER = Path(__file__).resolve().parents[1] / "bin" / "verify-package-head.py"


class ReleaseHeadIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="slateframe-zip-head-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        self.write("style.css", "Theme Name: Slateframe\n")
        self.write("assets/写真 中文.txt", "Public multilingual media\n")
        self.commit()
        self.archive = self.root / "release.zip"

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def commit(self):
        subprocess.run(["git", "-C", str(self.root), "add", "-A"], check=True)
        subprocess.run(["git", "-C", str(self.root), "-c", "user.name=Slateframe Tests",
                        "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture"], check=True)

    def make_zip(self, entries):
        with zipfile.ZipFile(self.archive, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name, content in entries:
                archive.writestr(name, content)

    def verify(self):
        return subprocess.run(["python3", str(VERIFIER), str(self.root), str(self.archive)],
                              capture_output=True, text=True, check=False)

    def test_exact_head_and_multilingual_names_are_accepted(self):
        self.make_zip([("slateframe/style.css", "Theme Name: Slateframe\n"),
                       ("slateframe/assets/写真 中文.txt", "Public multilingual media\n")])
        self.assertEqual(0, self.verify().returncode)

    def test_same_length_replacement_with_valid_crc_is_rejected(self):
        self.make_zip([("slateframe/style.css", "Theme Name: Slat3frame\n")])
        result = self.verify()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("ZIP bytes differing from HEAD: slateframe/style.css", result.stderr)

    def test_different_length_replacement_with_valid_crc_is_rejected(self):
        self.make_zip([("slateframe/style.css", "injected release content")])
        self.assertIn("ZIP bytes differing from HEAD", self.verify().stderr)

    def test_worktree_change_cannot_redefine_committed_bytes(self):
        self.write("style.css", "Uncommitted replacement\n")
        self.make_zip([("slateframe/style.css", "Uncommitted replacement\n")])
        self.assertIn("ZIP bytes differing from HEAD", self.verify().stderr)

    def test_committed_but_excluded_file_does_not_change_other_hashes(self):
        self.write("docs/release.md", "Development-only documentation\n")
        self.commit()
        self.make_zip([("slateframe/style.css", "Theme Name: Slateframe\n")])
        self.assertEqual(0, self.verify().returncode)

    def test_untracked_member_is_rejected_even_with_valid_zip_crc(self):
        self.make_zip([("slateframe/untracked.txt", "unexpected")])
        self.assertIn("ZIP member absent from HEAD", self.verify().stderr)

    def test_other_theme_root_is_rejected(self):
        self.make_zip([("other-theme/style.css", "Theme Name: Slateframe\n")])
        self.assertIn("outside theme root", self.verify().stderr)

    def test_corrupt_archive_fails_closed(self):
        self.archive.write_bytes(b"not a zip")
        self.assertNotEqual(0, self.verify().returncode)

    def test_git_sha256_object_format_when_supported(self):
        sha256_root = self.root / "sha256-repo"
        init = subprocess.run(["git", "init", "-q", "--object-format=sha256", str(sha256_root)],
                              capture_output=True, text=True, check=False)
        if init.returncode != 0:
            self.skipTest("Git SHA-256 repositories unsupported by installed Git")
        (sha256_root / "style.css").write_text("Theme Name: Slateframe\n")
        subprocess.run(["git", "-C", str(sha256_root), "add", "-A"], check=True)
        subprocess.run(["git", "-C", str(sha256_root), "-c", "user.name=Slateframe Tests",
                        "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture"], check=True)
        self.make_zip([("slateframe/style.css", "Theme Name: Slateframe\n")])
        result = subprocess.run(["python3", str(VERIFIER), str(sha256_root), str(self.archive)],
                                capture_output=True, text=True, check=False)
        self.assertEqual(0, result.returncode, result.stderr)


if __name__ == "__main__":
    unittest.main()
