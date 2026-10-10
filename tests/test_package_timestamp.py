"""Regression contracts for portable, deterministic, non-leaking release ZIPs."""
import hashlib
import os
import shlex
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "bin" / "build-theme-zip.sh"


class PackageTests(unittest.TestCase):
    def build(self, epoch=None, git_epoch=None):
        with tempfile.TemporaryDirectory() as temporary:
            out = Path(temporary) / "output"
            env = os.environ.copy()
            env.pop("SOURCE_DATE_EPOCH", None)
            if epoch is not None:
                env["SOURCE_DATE_EPOCH"] = str(epoch)
            if git_epoch is not None:
                fake_bin = Path(temporary) / "fake-bin"
                fake_bin.mkdir()
                fake_git = fake_bin / "git"
                real_git = shutil.which("git")
                fake_git.write_text(
                    "#!/bin/sh\n"
                    "if [ \"$1\" = \"log\" ]; then printf '%s\\n' '"
                    + str(git_epoch) + "'; exit 0; fi\n"
                    "exec " + shlex.quote(real_git) + " \"$@\"\n"
                )
                fake_git.chmod(0o755)
                env["PATH"] = str(fake_bin) + os.pathsep + env["PATH"]
            result = subprocess.run(["bash", str(BUILDER), str(out)], cwd=ROOT,
                                    env=env, text=True, capture_output=True)
            if result.returncode:
                return result, None, None
            archive_path = out / "slateframe.zip"
            with zipfile.ZipFile(archive_path) as archive:
                entries = [(i.filename, i.date_time, i.external_attr, i.is_dir())
                           for i in archive.infolist()]
                contents = {name: archive.read(name) for name, _, _, directory in entries
                            if not directory}
            digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
            return result, digest, (entries, contents)

    def successful(self, **kwargs):
        result, digest, package = self.build(**kwargs)
        self.assertEqual(result.returncode, 0, result.stderr)
        return digest, package

    def test_default_epoch(self):
        _, (entries, _) = self.successful()
        self.assertEqual({e[1] for e in entries}, {(2000, 1, 1, 0, 0, 0)})

    def test_pr_push_history_independence(self):
        first, _ = self.successful(git_epoch=1791487352)
        second, _ = self.successful(git_epoch=1791487360)
        self.assertEqual(first, second)

    def test_explicit_epoch(self):
        _, (entries, _) = self.successful(epoch=978307200)
        self.assertEqual({e[1] for e in entries}, {(2001, 1, 1, 0, 0, 0)})

    def test_explicit_epoch_ignores_git(self):
        first, _ = self.successful(epoch=978307200, git_epoch=1000000000)
        second, _ = self.successful(epoch=978307200, git_epoch=1800000000)
        self.assertEqual(first, second)

    def test_invalid_epoch_rejected(self):
        result, digest, _ = self.build(epoch="invalid")
        self.assertNotEqual(result.returncode, 0)
        self.assertIsNone(digest)

    def test_sorted_unique_namespaced_paths(self):
        _, (entries, _) = self.successful()
        names = [e[0] for e in entries]
        self.assertEqual(names, sorted(names))
        self.assertEqual(len(names), len(set(names)))
        self.assertTrue(all(n.startswith("slateframe/") for n in names))

    def test_required_runtime_files(self):
        _, (_, contents) = self.successful()
        for name in ("style.css", "functions.php", "theme.json",
                     "readme.txt", "LICENSE", "screenshot.png"):
            with self.subTest(name=name):
                self.assertTrue(contents["slateframe/" + name])

    def test_development_files_excluded(self):
        _, (entries, _) = self.successful()
        excluded = (".git/", ".github/", "docs/", "bin/", "tests/", "dist/",
                    "node_modules/", "test-artifacts/", "playwright-report/", "test-results/")
        excluded_files = (".distignore", "README.md", "CONTRIBUTING.md",
                          "SECURITY.md", "CHANGELOG.md", "package.json",
                          "package-lock.json", "playwright.config.js")
        for name, _, _, _ in entries:
            path = name[len("slateframe/"):]
            self.assertFalse(path.startswith(excluded), path)
            self.assertNotIn(path, excluded_files)

    def test_portable_permissions(self):
        _, (entries, _) = self.successful()
        for name, _, attrs, is_dir in entries:
            with self.subTest(name=name):
                self.assertEqual((attrs >> 16) & 0o777, 0o755 if is_dir else 0o644)

    def check_symlink(self, kind):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            fixture = base / "fixture"
            fixture.mkdir()
            (fixture / "bin").mkdir()
            for name in ("style.css", "functions.php", "theme.json",
                         "readme.txt", "LICENSE", "screenshot.png"):
                shutil.copy2(ROOT / name, fixture / name)
            shutil.copy2(BUILDER, fixture / "bin" / "build-theme-zip.sh")
            shutil.copy2(ROOT / "bin" / "check-package-manifest.py",
                         fixture / "bin" / "check-package-manifest.py")
            (fixture / "bin" / "check-screenshot.py").write_text(
                "import sys\nfrom pathlib import Path\n"
                "assert Path(sys.argv[1]).read_bytes().startswith(bytes.fromhex('89504e470d0a1a0a'))\n")
            (fixture / ".distignore").write_text(".git/\nbin/\n.distignore\n")
            subprocess.run(["git", "init", "-q"], cwd=fixture, check=True)
            subprocess.run(["git", "config", "user.name", "Slateframe Tests"],
                           cwd=fixture, check=True)
            subprocess.run(["git", "config", "user.email", "test@example.invalid"],
                           cwd=fixture, check=True)
            subprocess.run(["git", "add", "-A"], cwd=fixture, check=True)
            subprocess.run(["git", "commit", "-qm", "test fixture"],
                           cwd=fixture, check=True)
            if kind == "external":
                target = base / "private.txt"
                target.write_text("never include this in public archives")
            elif kind == "internal":
                target = fixture / "style.css"
            else:
                target = fixture / "missing.txt"
            (fixture / "linked-file.txt").symlink_to(target)
            output = base / "release"
            result = subprocess.run(["bash", str(fixture / "bin" / "build-theme-zip.sh"),
                                     str(output)], cwd=fixture, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("symbolic link", result.stderr)
            self.assertFalse((output / "slateframe.zip").exists())

    def test_external_symlink_rejected(self):
        self.check_symlink("external")

    def test_internal_symlink_rejected(self):
        self.check_symlink("internal")

    def test_dangling_symlink_rejected(self):
        self.check_symlink("dangling")

    def test_repeated_build_byte_identical(self):
        first, (_, content1) = self.successful()
        second, (_, content2) = self.successful()
        self.assertEqual(first, second)
        self.assertEqual(content1, content2)


if __name__ == "__main__":
    unittest.main()
