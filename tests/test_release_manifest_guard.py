"""Integration tests for the Slateframe distributable archive boundary.

Run with: python3 -m unittest discover -s tests -p 'test_*.py'
The fixture uses a temporary Git repository and does not touch production.
"""

import hashlib
import os
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "bin" / "build-theme-zip.sh"


class ReleaseManifestGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="slateframe-release-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "theme"
        self.root.mkdir()
        (self.root / "bin").mkdir()
        (self.root / "bin" / "build-theme-zip.sh").write_bytes(SCRIPT.read_bytes())
        (self.root / "bin" / "check-package-manifest.py").write_bytes(
            (SCRIPT.parent / "check-package-manifest.py").read_bytes()
        )
        (self.root / "bin" / "check-screenshot.py").write_text(
            "from pathlib import Path\n"
            "import os\n"
            "import sys\n"
            "Path(os.environ['SLATEFRAME_TEST_CHECK_MARKER']).write_text('read')\n"
            "if os.environ.get('SLATEFRAME_TEST_INJECT_EMPTY_DIR') == '1':\n"
            "    (Path(sys.argv[1]).parent / 'injected-empty').mkdir()\n"
            "if os.environ.get('SLATEFRAME_TEST_INJECT_EXCLUDED_DIR'):\n"
            "    (Path(sys.argv[1]).parent / os.environ['SLATEFRAME_TEST_INJECT_EXCLUDED_DIR']).mkdir(parents=True)\n"
            "if os.environ.get('SLATEFRAME_TEST_INJECT') == '1':\n"
            "    Path(sys.argv[1] + '.injected').write_text('unexpected')\n"
            "if os.environ.get('SLATEFRAME_TEST_MUTATE_STYLE') == '1':\n"
            "    (Path(sys.argv[1]).parent / 'style.css').write_text('tampered\\n')\n"
            "if os.environ.get('SLATEFRAME_TEST_MUTATE_SCREENSHOT') == '1':\n"
            "    Path(sys.argv[1]).write_bytes(b'tampered-screenshot')\n"
        )
        (self.root / ".distignore").write_text(
            ".git/\nbin/\ndist/\n.distignore\n"
        )
        for name in ("style.css", "functions.php", "theme.json", "readme.txt", "LICENSE"):
            (self.root / name).write_text("fixture\n")
        (self.root / "screenshot.png").write_bytes(b"fixture-png")
        self.git("init", "-q")
        self.git("config", "user.name", "Slateframe Tests")
        self.git("config", "user.email", "test@example.invalid")
        self.commit()

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.root, check=True, capture_output=True)

    def commit(self):
        self.git("add", "-A")
        self.git("commit", "-qm", "test fixture")

    def build(self, output=None, extra_env=None):
        cmd = ["bash", str(self.root / "bin" / "build-theme-zip.sh")]
        if output is not None:
            cmd.append(str(output))
        env = dict(os.environ)
        env["SLATEFRAME_TEST_CHECK_MARKER"] = str(Path(self.temp.name) / "screenshot-checked")
        env.update(extra_env or {})
        return subprocess.run(cmd, cwd=self.root, text=True, capture_output=True, timeout=15, env=env)

    def test_clean_committed_theme_builds(self):
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.root / "dist" / "slateframe.zip") as archive:
            names = archive.namelist()
            self.assertIn("slateframe/style.css", names)
            self.assertIn("slateframe/screenshot.png", names)
            self.assertNotIn("slateframe/.distignore", names)

    def test_checker_cannot_change_staged_css_bytes(self):
        result = self.build(extra_env={"SLATEFRAME_TEST_MUTATE_STYLE": "1"})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("staged content differing from HEAD: style.css", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())
        self.assertEqual("fixture\n", (self.root / "style.css").read_text())

    def test_checker_cannot_change_staged_screenshot_bytes(self):
        result = self.build(extra_env={"SLATEFRAME_TEST_MUTATE_SCREENSHOT": "1"})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("staged content differing from HEAD: screenshot.png", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_committed_unicode_nested_filename_is_accepted(self):
        (self.root / "assets").mkdir()
        (self.root / "assets" / "写真 資料.txt").write_text("public asset\n")
        self.commit()
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.root / "dist" / "slateframe.zip") as archive:
            self.assertIn("slateframe/assets/写真 資料.txt", archive.namelist())

    def test_manifest_rejects_direct_staged_content_tampering(self):
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        staged = self.root / "dist" / "slateframe" / "functions.php"
        staged.write_text("tampered\n")
        guard = subprocess.run(
            ["python3", str(self.root / "bin" / "check-package-manifest.py"),
             str(self.root), str(staged.parent)],
            capture_output=True, text=True, check=False,
        )
        self.assertNotEqual(0, guard.returncode)
        self.assertIn("staged content differing from HEAD: functions.php", guard.stderr)

    def test_committed_same_size_stage_rewrite_is_rejected(self):
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        staged = self.root / "dist" / "slateframe" / "style.css"
        staged.write_text("changed\n")  # Same number of bytes as fixture.
        guard = subprocess.run(
            ["python3", str(self.root / "bin" / "check-package-manifest.py"),
             str(self.root), str(staged.parent)],
            capture_output=True, text=True, check=False,
        )
        self.assertNotEqual(0, guard.returncode)
        self.assertIn("staged content differing from HEAD: style.css", guard.stderr)

    def test_untracked_empty_directory_is_rejected(self):
        (self.root / "uncommitted-empty").mkdir()
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("uncommitted directory", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_untracked_nested_empty_directory_is_rejected(self):
        (self.root / "assets").mkdir()
        (self.root / "assets" / "asset.txt").write_text("tracked\n")
        self.commit()
        (self.root / "assets" / "empty").mkdir()
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("uncommitted directory", result.stderr)

    def test_screenshot_checker_cannot_inject_empty_directory(self):
        result = self.build(extra_env={"SLATEFRAME_TEST_INJECT_EMPTY_DIR": "1"})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("uncommitted directory", result.stderr)
        self.assertTrue((Path(self.temp.name) / "screenshot-checked").exists())
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_excluded_tracked_directory_cannot_reappear_empty(self):
        (self.root / "docs").mkdir()
        (self.root / "docs" / "guide.md").write_text("development only\n")
        (self.root / ".distignore").write_text(".git/\nbin/\ndist/\ndocs/\n.distignore\n")
        self.commit()
        result = self.build(extra_env={"SLATEFRAME_TEST_INJECT_EXCLUDED_DIR": "docs"})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("uncommitted directory", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_excluded_nested_directory_cannot_reappear_empty(self):
        (self.root / "docs" / "private").mkdir(parents=True)
        (self.root / "docs" / "private" / "guide.md").write_text("development only\n")
        (self.root / ".distignore").write_text(".git/\nbin/\ndist/\ndocs/\n.distignore\n")
        self.commit()
        result = self.build(extra_env={"SLATEFRAME_TEST_INJECT_EXCLUDED_DIR": "docs/private"})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("uncommitted directory", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_committed_backslash_filename_is_rejected(self):
        (self.root / "bad\\path.css").write_text("unsafe\n")
        self.commit()
        result = self.build()
        self.assertIn("nonportable package path", result.stderr)
        self.assertNotEqual(0, result.returncode)

    def test_committed_control_character_filename_is_rejected(self):
        (self.root / "bad\nname.css").write_text("unsafe\n")
        self.commit()
        self.assertIn("nonportable package path", self.build().stderr)

    def test_committed_colon_filename_is_rejected(self):
        (self.root / "C:asset.css").write_text("unsafe\n")
        self.commit()
        self.assertIn("nonportable package path", self.build().stderr)

    def test_committed_trailing_dot_filename_is_rejected(self):
        (self.root / "bad.").write_text("unsafe\n")
        self.commit()
        self.assertIn("nonportable package path", self.build().stderr)

    def test_committed_windows_device_filename_is_rejected(self):
        (self.root / "CON.txt").write_text("unsafe\n")
        self.commit()
        self.assertIn("nonportable package path", self.build().stderr)

    def test_casefold_colliding_committed_filenames_are_rejected(self):
        (self.root / "ReadMe.CSS").write_text("one\n")
        (self.root / "readme.css").write_text("two\n")
        self.commit()
        self.assertIn("colliding package paths", self.build().stderr)

    def test_unicode_normalization_colliding_filenames_are_rejected(self):
        (self.root / "caf\u00e9.css").write_text("one\n")
        (self.root / "cafe\u0301.css").write_text("two\n")
        self.commit()
        self.assertIn("colliding package paths", self.build().stderr)

    def test_untracked_file_is_rejected(self):
        (self.root / "notes-secret.txt").write_text("local token")
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("uncommitted file", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_staged_but_uncommitted_file_is_rejected(self):
        (self.root / "notes.txt").write_text("not committed")
        self.git("add", "notes.txt")
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("uncommitted file", result.stderr)

    def test_tracked_hidden_file_is_rejected(self):
        (self.root / ".env").write_text("SECRET=value")
        self.commit()
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("hidden path", result.stderr)

    def test_tracked_nested_hidden_file_is_rejected(self):
        (self.root / "assets").mkdir()
        (self.root / "assets" / ".private").write_text("secret")
        self.commit()
        self.assertIn("hidden path", self.build().stderr)

    def test_tracked_private_key_is_rejected(self):
        (self.root / "backup.pem").write_text("private")
        self.commit()
        self.assertIn("private or backup", self.build().stderr)

    def test_tracked_backup_is_rejected(self):
        (self.root / "functions.php.bak").write_text("backup")
        self.commit()
        self.assertIn("private or backup", self.build().stderr)

    def test_untracked_symlink_is_rejected(self):
        (self.root / "secret-link").symlink_to("/etc/hosts")
        result = self.build()
        self.assertIn("symbolic link", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_special_file_is_rejected_without_blocking_zip(self):
        os.mkfifo(self.root / "unexpected-pipe")
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("special file", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_directory_symlink_is_rejected(self):
        (self.root / "external-assets").symlink_to("/tmp", target_is_directory=True)
        result = self.build()
        self.assertIn("symbolic link", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_screenshot_symlink_is_rejected_before_checker(self):
        (self.root / "screenshot.png").unlink()
        (self.root / "screenshot.png").symlink_to("/etc/hosts")
        result = self.build()
        self.assertIn("symbolic link", result.stderr)
        self.assertFalse((Path(self.temp.name) / "screenshot-checked").exists())

    def test_dirty_tracked_content_is_rejected(self):
        (self.root / "style.css").write_text("changed without commit")
        self.assertIn("modified file", self.build().stderr)

    def test_checker_generated_file_is_rejected(self):
        old = os.environ.get("SLATEFRAME_TEST_INJECT")
        os.environ["SLATEFRAME_TEST_INJECT"] = "1"
        try:
            result = self.build()
        finally:
            if old is None:
                os.environ.pop("SLATEFRAME_TEST_INJECT", None)
            else:
                os.environ["SLATEFRAME_TEST_INJECT"] = old
        self.assertIn("uncommitted file", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_reproducible_with_different_source_mtimes(self):
        first = self.build()
        self.assertEqual(0, first.returncode, first.stderr)
        archive = self.root / "dist" / "slateframe.zip"
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        os.utime(self.root / "style.css", (1900000000, 1900000000))
        second = self.build()
        self.assertEqual(0, second.returncode, second.stderr)
        self.assertEqual(digest, hashlib.sha256(archive.read_bytes()).hexdigest())

    def test_default_dist_does_not_recurse(self):
        self.assertEqual(0, self.build().returncode)
        self.assertEqual(0, self.build().returncode)

    def test_filesystem_root_output_is_rejected_before_cleanup(self):
        result = self.build(Path("/"))
        self.assertNotEqual(0, result.returncode)
        self.assertIn("filesystem root", result.stderr)

    def test_symlinked_output_inside_repository_is_rejected(self):
        alias = Path(self.temp.name) / "inside-alias"
        alias.symlink_to(self.root / "custom-output", target_is_directory=True)
        result = self.build(alias)
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Output directory", result.stderr)
        self.assertFalse((self.root / "custom-output").exists())

    def test_custom_inside_repository_is_rejected(self):
        result = self.build(self.root / "releases")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Output directory", result.stderr)
        self.assertFalse((self.root / "releases").exists())

    def test_external_and_default_archives_match(self):
        self.assertEqual(0, self.build().returncode)
        expected = hashlib.sha256((self.root / "dist" / "slateframe.zip").read_bytes()).hexdigest()
        outside = Path(self.temp.name) / "outside"
        result = self.build(outside)
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertEqual(expected, hashlib.sha256((outside / "slateframe.zip").read_bytes()).hexdigest())

    def test_external_output_is_supported(self):
        result = self.build(Path(self.temp.name) / "outside")
        self.assertEqual(0, result.returncode, result.stderr)
        self.assertTrue((Path(self.temp.name) / "outside" / "slateframe.zip").is_file())


if __name__ == "__main__":
    unittest.main()
