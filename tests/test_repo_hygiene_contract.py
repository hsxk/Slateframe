"""Keep generated Python files out of Git history and WordPress.org ZIPs."""

from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIRS = {"__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}
CACHE_SUFFIXES = (".pyc", ".pyo", ".pyd")


def is_python_cache(path):
    """Recognize generated Python artifacts anywhere in a repository path."""
    parts = Path(path).parts
    return any(part in CACHE_DIRS for part in parts) or path.endswith(CACHE_SUFFIXES)


def git_paths(*args):
    """Read NUL-delimited names so CJK, spaces and newlines stay intact."""
    output = subprocess.check_output(["git", "-C", str(ROOT), *args])
    if args[:2] == ("ls-tree", "-r"):
        return [entry.split(b"\t", 1)[1].decode("utf-8", "surrogateescape")
                for entry in output.split(b"\0") if entry]
    return [entry.decode("utf-8", "surrogateescape")
            for entry in output.split(b"\0") if entry]


class RepositoryHygieneContract(unittest.TestCase):
    def test_git_ignores_python_generated_files(self):
        for path in (
            "tests/__pycache__/sample.cpython-313.pyc",
            "inc/__pycache__/sample.pyc",
            "assets/example.pyo",
            "tests/.pytest_cache/v/cache/nodeids",
            "tests/.mypy_cache/3.13/meta.json",
            "tests/.ruff_cache/index",
        ):
            with self.subTest(path=path):
                result = subprocess.run(
                    ["git", "-C", str(ROOT), "check-ignore", "--no-index", "-q", "--", path],
                    check=False,
                )
                self.assertEqual(result.returncode, 0, f"Not ignored: {path}")

    def test_no_generated_python_files_are_tracked(self):
        for source, names in (
            ("index", git_paths("ls-files", "--cached", "-z")),
            ("HEAD", git_paths("ls-tree", "-r", "-z", "HEAD")),
        ):
            with self.subTest(source=source):
                self.assertEqual([name for name in names if is_python_cache(name)], [])

    def test_release_excludes_python_generated_files(self):
        if not shutil.which("rsync"):
            self.skipTest("rsync is unavailable")
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "src"
            target = Path(tmp) / "dist"
            for name in (
                "inc/valid.php", "inc/__pycache__/invalid.pyc", "assets/invalid.pyo",
                "inc/.pytest_cache/state", "inc/.mypy_cache/state",
                "inc/.ruff_cache/state", "assets/valid.css",
            ):
                path = source / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("fixture", encoding="utf-8")
            target.mkdir()
            subprocess.run(
                ["rsync", "-a", "--exclude-from", str(ROOT / ".distignore"),
                 str(source) + "/", str(target) + "/"],
                check=True, stdout=subprocess.DEVNULL,
            )
            self.assertTrue((target / "inc/valid.php").is_file())
            self.assertTrue((target / "assets/valid.css").is_file())
            self.assertEqual([str(p.relative_to(target)) for p in target.rglob("*")
                              if p.is_file() and is_python_cache(str(p.relative_to(target)))], [])

    def test_ignore_rules_preserve_normal_python_sources(self):
        for path in ("bin/check-package-manifest.py", "tests/test_repo_hygiene_contract.py"):
            result = subprocess.run(
                ["git", "-C", str(ROOT), "check-ignore", "--no-index", "-q", "--", path],
                check=False,
            )
            self.assertEqual(result.returncode, 1, f"Source unexpectedly ignored: {path}")


if __name__ == "__main__":
    unittest.main()
