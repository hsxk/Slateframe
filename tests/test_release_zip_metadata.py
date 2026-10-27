"""Standalone final ZIP/HEAD verifier rejects malformed archive metadata."""

import stat
import subprocess
import tempfile
import unittest
import warnings
import zipfile
from pathlib import Path


VERIFIER = Path(__file__).resolve().parents[1] / "bin" / "verify-package-head.py"


class ReleaseZipMetadataTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="slateframe-zip-metadata-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        (self.root / "style.css").write_text("Theme Name: Slateframe\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.root), "add", "style.css"], check=True)
        subprocess.run(["git", "-C", str(self.root), "-c", "user.name=Slateframe Tests",
                        "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture"], check=True)
        self.archive = self.root / "release.zip"

    def verify(self):
        return subprocess.run(["python3", str(VERIFIER), str(self.root), str(self.archive)],
                              capture_output=True, text=True, check=False)

    def build(self, members, comment=b""):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(self.archive, "w") as archive:
                for member in members:
                    if isinstance(member, str):
                        archive.writestr(member, "Theme Name: Slateframe\n")
                    else:
                        info, data = member
                        archive.writestr(info, data)
                archive.comment = comment
        return self.verify()

    def test_normal_archive_remains_accepted(self):
        self.assertEqual(0, self.build(["slateframe/style.css"]).returncode)

    def test_normal_directory_entry_remains_accepted(self):
        self.assertEqual(0, self.build([("slateframe/", ""), "slateframe/style.css"]).returncode)

    def test_directory_symlink_metadata_rejected(self):
        info = zipfile.ZipInfo("slateframe/")
        info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        self.assertIn("non-regular ZIP member", self.build([(info, ""), "slateframe/style.css"]).stderr)

    def test_empty_archive_rejected(self):
        self.assertIn("without theme files", self.build([]).stderr)

    def test_duplicate_member_rejected_even_if_bytes_match(self):
        result = self.build(["slateframe/style.css", "slateframe/style.css"])
        self.assertIn("duplicate ZIP member", result.stderr)

    def test_dot_segment_rejected(self):
        self.assertIn("unsafe ZIP member path", self.build(["slateframe/./style.css"]).stderr)

    def test_parent_segment_rejected(self):
        self.assertIn("unsafe ZIP member path", self.build(["slateframe/../style.css"]).stderr)

    def test_empty_path_segment_rejected(self):
        self.assertIn("unsafe ZIP member path", self.build(["slateframe//style.css"]).stderr)

    def test_backslash_rejected(self):
        self.assertIn("unsafe ZIP member path", self.build(["slateframe/dir\\style.css"]).stderr)

    def test_absolute_path_rejected(self):
        self.assertIn("outside theme root", self.build(["/slateframe/style.css"]).stderr)

    def test_zip_comment_rejected(self):
        self.assertIn("commented ZIP archive", self.build(["slateframe/style.css"], b"surprise").stderr)

    def test_member_comment_rejected(self):
        info = zipfile.ZipInfo("slateframe/style.css")
        info.comment = b"hidden"
        self.assertIn("commented ZIP member", self.build([(info, "Theme Name: Slateframe\n")]).stderr)

    def test_symlink_metadata_rejected_even_if_bytes_match(self):
        info = zipfile.ZipInfo("slateframe/style.css")
        info.create_system = 3
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        self.assertIn("non-regular ZIP member", self.build([(info, "Theme Name: Slateframe\n")]).stderr)

    def test_fifo_metadata_rejected_even_if_bytes_match(self):
        info = zipfile.ZipInfo("slateframe/style.css")
        info.create_system = 3
        info.external_attr = (stat.S_IFIFO | 0o600) << 16
        self.assertIn("non-regular ZIP member", self.build([(info, "Theme Name: Slateframe\n")]).stderr)

    def test_casefold_collision_rejected_even_if_both_files_are_committed(self):
        (self.root / "STYLE.CSS").write_text("Theme Name: Slateframe\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.root), "add", "STYLE.CSS"], check=True)
        subprocess.run(["git", "-C", str(self.root), "-c", "user.name=Slateframe Tests",
                        "-c", "user.email=test@example.invalid", "commit", "-qm", "second file"], check=True)
        self.assertIn("colliding ZIP paths", self.build(["slateframe/style.css", "slateframe/STYLE.CSS"]).stderr)

    def test_nfkc_collision_rejected_even_if_both_files_are_committed(self):
        (self.root / "ｓｔｙｌｅ.css").write_text("Theme Name: Slateframe\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(self.root), "add", "ｓｔｙｌｅ.css"], check=True)
        subprocess.run(["git", "-C", str(self.root), "-c", "user.name=Slateframe Tests",
                        "-c", "user.email=test@example.invalid", "commit", "-qm", "second file"], check=True)
        self.assertIn("colliding ZIP paths", self.build(["slateframe/style.css", "slateframe/ｓｔｙｌｅ.css"]).stderr)

    def test_nonempty_directory_entry_rejected(self):
        self.assertIn("invalid ZIP directory", self.build([("slateframe/", "unexpected")]).stderr)

    def test_empty_theme_root_directory_is_not_a_release(self):
        self.assertIn("without theme files", self.build([("slateframe/", "")]).stderr)


if __name__ == "__main__":
    unittest.main()
