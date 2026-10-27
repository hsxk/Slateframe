"""Integration tests for the Slateframe distributable archive boundary.

Run with: python3 -m unittest discover -s tests -p 'test_*.py'
The fixture uses a temporary Git repository and does not touch production.
"""

import hashlib
import os
import shlex
import shutil
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
        (self.root / "bin" / "verify-package-head.py").write_bytes(
            (SCRIPT.parent / "verify-package-head.py").read_bytes()
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

    def assert_rejected_portable_path(self, name):
        """Exercise the real ZIP builder with a committed unsafe filename."""
        (self.root / name).write_text("unsafe\n", encoding="utf-8")
        self.commit()
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("nonportable package path", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_windows_less_than_filename_is_rejected(self):
        self.assert_rejected_portable_path("unsafe<file.css")

    def test_windows_greater_than_filename_is_rejected(self):
        self.assert_rejected_portable_path("unsafe>file.css")

    def test_windows_double_quote_filename_is_rejected(self):
        self.assert_rejected_portable_path('unsafe"file.css')

    def test_windows_pipe_filename_is_rejected(self):
        self.assert_rejected_portable_path("unsafe|file.css")

    def test_windows_question_mark_filename_is_rejected(self):
        self.assert_rejected_portable_path("unsafe?file.css")

    def test_windows_asterisk_filename_is_rejected(self):
        self.assert_rejected_portable_path("unsafe*file.css")

    def test_windows_console_input_device_name_is_rejected(self):
        self.assert_rejected_portable_path("CONIN$.txt")

    def test_windows_console_output_device_name_is_rejected(self):
        self.assert_rejected_portable_path("CONOUT$.txt")

    def test_windows_clock_device_name_is_rejected(self):
        self.assert_rejected_portable_path("CLOCK$.txt")

    def test_windows_spaced_console_device_alias_is_rejected(self):
        self.assert_rejected_portable_path("CON .txt")

    def test_windows_spaced_serial_device_alias_is_rejected(self):
        self.assert_rejected_portable_path("COM¹ .data")

    def test_windows_spaced_parallel_device_alias_is_rejected(self):
        self.assert_rejected_portable_path("LPT9 .txt")

    def test_nonreserved_space_before_extension_remains_valid(self):
        (self.root / "icon .txt").write_text("public\n")
        self.commit()
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.root / "dist" / "slateframe.zip") as archive:
            self.assertIn("slateframe/icon .txt", archive.namelist())

    def test_fullwidth_windows_device_name_is_rejected(self):
        self.assert_rejected_portable_path("ＣＯＮ.txt")

    def test_superscript_windows_device_name_is_rejected(self):
        self.assert_rejected_portable_path("COM¹.txt")

    def test_compatibility_hidden_filename_is_rejected(self):
        self.assert_rejected_portable_path("．env")

    def test_compatibility_traversal_filename_is_rejected(self):
        self.assert_rejected_portable_path("．．")

    def test_fullwidth_separator_filename_is_rejected(self):
        self.assert_rejected_portable_path("asset／name.css")

    def test_fullwidth_backslash_filename_is_rejected(self):
        self.assert_rejected_portable_path("asset＼name.css")

    def test_unicode_trailing_space_filename_is_rejected(self):
        self.assert_rejected_portable_path("unsafe　")

    def test_nonbreaking_trailing_space_filename_is_rejected(self):
        self.assert_rejected_portable_path("unsafe ")

    def test_nfkc_colliding_filenames_are_rejected(self):
        (self.root / "readme2.css").write_text("one\n")
        (self.root / "ｒｅａｄｍｅ２.css").write_text("two\n")
        self.commit()
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("colliding package paths", result.stderr)

    def test_ordinary_cjk_arabic_emoji_filenames_remain_valid(self):
        (self.root / "assets").mkdir()
        names = ("写真 資料.txt", "العربية.txt", "作品📷.txt")
        for name in names:
            (self.root / "assets" / name).write_text("public asset\n", encoding="utf-8")
        self.commit()
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.root / "dist" / "slateframe.zip") as archive:
            for name in names:
                self.assertIn("slateframe/assets/" + name, archive.namelist())

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

    def test_fullwidth_private_extension_is_rejected(self):
        (self.root / "secret．pem").write_text("private\n")
        self.commit()
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("private or backup", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_fullwidth_credentials_name_is_rejected(self):
        (self.root / "ｃｒｅｄｅｎｔｉａｌｓ．ｊｓｏｎ").write_text("private\n")
        self.commit()
        self.assertIn("private or backup", self.build().stderr)

    def test_compatibility_ssh_key_name_is_rejected(self):
        (self.root / "ｉｄ＿ｒｓａ").write_text("private\n")
        self.commit()
        self.assertIn("private or backup", self.build().stderr)

    def test_nested_compatibility_backup_extension_is_rejected(self):
        (self.root / "assets").mkdir()
        (self.root / "assets" / "backup．bak").write_text("private\n")
        self.commit()
        self.assertIn("private or backup", self.build().stderr)

    def test_safe_fullwidth_document_extension_is_preserved(self):
        (self.root / "assets").mkdir()
        (self.root / "assets" / "資料．txt").write_text("public\n")
        self.commit()
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.root / "dist" / "slateframe.zip") as archive:
            self.assertIn("slateframe/assets/資料．txt", archive.namelist())

    def assert_rejected_private_path(self, name):
        """Reject a committed secret-like asset before writing the ZIP."""
        (self.root / name).write_text("private\n", encoding="utf-8")
        self.commit()
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("private or backup", result.stderr)
        self.assertFalse((self.root / "dist" / "slateframe.zip").exists())

    def test_compressed_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("backup.sql.gz")

    def test_zstd_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("backup.sql.zst")

    def test_sqlite3_database_is_rejected(self):
        self.assert_rejected_private_path("database.sqlite3")

    def test_database_file_is_rejected(self):
        self.assert_rejected_private_path("snapshot.db")

    def test_sqlite_wal_is_rejected(self):
        self.assert_rejected_private_path("database.sqlite-wal")

    def test_environment_local_is_rejected(self):
        self.assert_rejected_private_path("secrets.env.local")

    def test_wp_config_is_rejected(self):
        self.assert_rejected_private_path("wp-config.php")

    def test_composer_auth_is_rejected(self):
        self.assert_rejected_private_path("auth.json")

    def test_legacy_ssh_private_key_is_rejected(self):
        self.assert_rejected_private_path("id_ecdsa")

    def test_fullwidth_compressed_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("backup．sql．gz")

    def test_gzip_database_is_rejected(self):
        self.assert_rejected_private_path("snapshot.db.gz")

    def test_xz_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("dump.sql.xz")

    def test_bzip2_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("dump.sql.bz2")

    def test_sqlite3_zip_is_rejected(self):
        self.assert_rejected_private_path("snapshot.sqlite3.zip")

    def test_sqlite3_write_ahead_log_is_rejected(self):
        self.assert_rejected_private_path("snapshot.sqlite3-wal")

    def test_database_rollback_journal_is_rejected(self):
        self.assert_rejected_private_path("snapshot.db-journal")

    def test_compressed_pem_is_rejected(self):
        self.assert_rejected_private_path("secret.pem.gz")

    def test_compressed_credentials_is_rejected(self):
        self.assert_rejected_private_path("credentials.json.gz")

    def test_compressed_composer_auth_is_rejected(self):
        self.assert_rejected_private_path("auth.json.zip")

    def test_compressed_wp_config_is_rejected(self):
        self.assert_rejected_private_path("wp-config.php.zst")

    def test_compressed_backup_is_rejected(self):
        self.assert_rejected_private_path("backup.bak.xz")

    def test_compressed_ssh_private_key_is_rejected(self):
        self.assert_rejected_private_path("id_rsa.gz")


    def test_tar_gzip_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("backup.sql.tar.gz")

    def test_tar_gzip_credentials_is_rejected(self):
        self.assert_rejected_private_path("credentials.json.tar.gz")

    def test_tar_zstd_ssh_key_is_rejected(self):
        self.assert_rejected_private_path("id_ed25519.tar.zst")

    def test_tar_xz_pem_is_rejected(self):
        self.assert_rejected_private_path("secret.pem.tar.xz")

    def test_tar_bzip2_database_is_rejected(self):
        self.assert_rejected_private_path("snapshot.sqlite3.tar.bz2")

    def test_double_wrapped_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("dump.sql.gz.zip")

    def test_seven_zip_sql_dump_is_rejected(self):
        self.assert_rejected_private_path("dump.sql.7z")

    def test_rar_credentials_is_rejected(self):
        self.assert_rejected_private_path("credentials.json.rar")

    def test_unicode_wrapped_private_extension_is_rejected(self):
        self.assert_rejected_private_path("secret．pem．tar．gz")

    def test_brotli_wrapped_private_key_is_rejected(self):
        self.assert_rejected_private_path("secret.pem.br")

    def test_apple_private_key_is_rejected(self):
        self.assert_rejected_private_path("private.p8")

    def test_java_keystore_is_rejected(self):
        self.assert_rejected_private_path("android.jks")

    def test_password_vault_is_rejected(self):
        self.assert_rejected_private_path("passwords.kdbx")

    def test_generic_keystore_is_rejected(self):
        self.assert_rejected_private_path("settings.keystore")

    def test_editor_old_backup_is_rejected(self):
        self.assert_rejected_private_path("functions.php.old")

    def test_editor_tilde_backup_is_rejected(self):
        self.assert_rejected_private_path("functions.php~")

    def test_compressed_editor_backup_is_rejected(self):
        self.assert_rejected_private_path("functions.php.backup.gz")

    def test_safe_public_archive_wrappers_remain_distributable(self):
        names = ("photo.tar.gz", "icons.7z", "sample.zip", "写真.tgz")
        for name in names:
            (self.root / name).write_text("public archive fixture\\n", encoding="utf-8")
        self.commit()
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.root / "dist" / "slateframe.zip") as archive:
            for name in names:
                self.assertIn("slateframe/" + name, archive.namelist())

    def test_public_json_and_svg_remain_distributable(self):
        (self.root / "public-data.json").write_text("{}\n")
        (self.root / "database.svg").write_text("<svg/>\n")
        self.commit()
        result = self.build()
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.root / "dist" / "slateframe.zip") as archive:
            self.assertIn("slateframe/public-data.json", archive.namelist())
            self.assertIn("slateframe/database.svg", archive.namelist())

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

    def test_default_dist_symlink_preserves_external_files(self):
        outside = Path(self.temp.name) / "external-default"
        target = outside / "slateframe"
        target.mkdir(parents=True)
        marker = target / "do-not-delete.txt"
        marker.write_text("keep")
        (self.root / "dist").symlink_to(outside, target_is_directory=True)
        result = self.build()
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Output directory must not traverse symbolic links", result.stderr)
        self.assertEqual("keep", marker.read_text())

    def test_custom_output_symlink_preserves_external_files(self):
        outside = Path(self.temp.name) / "external-custom"
        target = outside / "slateframe"
        target.mkdir(parents=True)
        marker = target / "do-not-delete.txt"
        marker.write_text("keep")
        alias = self.root / "custom-out"
        alias.symlink_to(outside, target_is_directory=True)
        result = self.build(alias)
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Output directory must not traverse symbolic links", result.stderr)
        self.assertEqual("keep", marker.read_text())

    def test_nested_symlinked_output_parent_preserves_external_files(self):
        outside = Path(self.temp.name) / "external-parent"
        target = outside / "build" / "slateframe"
        target.mkdir(parents=True)
        marker = target / "do-not-delete.txt"
        marker.write_text("keep")
        alias = self.root / "alias"
        alias.symlink_to(outside, target_is_directory=True)
        result = self.build(alias / "build")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Output directory must not traverse symbolic links", result.stderr)
        self.assertEqual("keep", marker.read_text())

    def test_symlink_then_parent_traversal_preserves_external_files(self):
        outside = Path(self.temp.name) / "external-traversal"
        target = outside / "slateframe"
        target.mkdir(parents=True)
        marker = target / "do-not-delete.txt"
        marker.write_text("keep")
        nested = outside / "nested"
        nested.mkdir()
        alias = self.root / "alias"
        alias.symlink_to(nested, target_is_directory=True)
        result = self.build(str(alias) + "/../")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("Output directory must not traverse symbolic links", result.stderr)
        self.assertEqual("keep", marker.read_text())

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


    def test_zip_writer_stage_mutation_cannot_replace_last_good_release(self):
        first = self.build()
        self.assertEqual(0, first.returncode, first.stderr)
        release = self.root / "dist" / "slateframe.zip"
        original = release.read_bytes()
        wrapper_dir = Path(self.temp.name) / "python-wrapper"
        wrapper_dir.mkdir()
        wrapper = wrapper_dir / "python3"
        wrapper.write_text(
            "#!/bin/sh\n"
            "if [ \"$1\" = \"-\" ] && [ \"$4\" != \"\" ]; then\n"
            "  printf 'post-check tampering\\n' > \"$3/style.css\"\n"
            "fi\n"
            "exec " + shlex.quote(shutil.which("python3")) + " \"$@\"\n"
        )
        wrapper.chmod(0o755)
        result = self.build(extra_env={"PATH": str(wrapper_dir) + os.pathsep + os.environ["PATH"]})
        self.assertNotEqual(0, result.returncode)
        self.assertIn("ZIP bytes differing from HEAD: slateframe/style.css", result.stderr)
        self.assertEqual(original, release.read_bytes())

if __name__ == "__main__":
    unittest.main()
