"""Keep the previous ZIP intact when SOURCE_DATE_EPOCH is invalid.

Run the real release shell script against an isolated theme fixture. The
manifest/screenshot helpers are stubs; their own suites cover those contracts.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile

SCRIPT = Path(__file__).resolve().parents[1] / "bin" / "build-theme-zip.sh"


class ReleaseEpochPreflightTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "theme"
        (self.root / "bin").mkdir(parents=True)
        shutil.copy2(SCRIPT, self.root / "bin" / "build-theme-zip.sh")
        for name in ("style.css", "functions.php", "theme.json", "readme.txt", "LICENSE", "screenshot.png"):
            (self.root / name).write_bytes(name.encode())
        (self.root / ".distignore").write_text("/dist/\n")
        for name in ("check-package-manifest.py", "check-screenshot.py"):
            (self.root / "bin" / name).write_text("import sys\n")
        self.dist = self.root / "dist"
        self.dist.mkdir()

    def build(self, epoch=None):
        env = os.environ.copy()
        env.pop("SOURCE_DATE_EPOCH", None)
        if epoch is not None:
            env["SOURCE_DATE_EPOCH"] = str(epoch)
        return subprocess.run(
            ["bash", str(self.root / "bin" / "build-theme-zip.sh")],
            cwd=self.root, env=env, capture_output=True, text=True, timeout=30,
        )

    def assert_invalid_preserves_release(self, epoch, expected):
        old = self.dist / "slateframe.zip"
        old.write_bytes(b"previous-release-zip")
        staged = self.dist / "slateframe"
        staged.mkdir()
        (staged / "keep.txt").write_text("keep")
        result = self.build(epoch)
        self.assertNotEqual(0, result.returncode)
        self.assertIn(expected, result.stderr)
        self.assertEqual(b"previous-release-zip", old.read_bytes())
        self.assertEqual("keep", (staged / "keep.txt").read_text())

    def test_non_integer_preserves_prior_release(self):
        self.assert_invalid_preserves_release("nonsense", "must be an integer")

    def test_fractional_epoch_preserves_prior_release(self):
        self.assert_invalid_preserves_release("946684800.5", "must be an integer")

    def test_future_epoch_preserves_prior_release(self):
        self.assert_invalid_preserves_release("4354819200", "exceeds ZIP timestamp")

    def test_far_future_epoch_preserves_prior_release(self):
        self.assert_invalid_preserves_release("9999999999", "exceeds ZIP timestamp")

    def test_maximum_zip_timestamp(self):
        result = self.build("4354819199")
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.dist / "slateframe.zip") as z:
            self.assertEqual((2107, 12, 31, 23, 59, 58), z.getinfo("slateframe/style.css").date_time)

    def test_older_epoch_clamps_to_1980(self):
        result = self.build("-10")
        self.assertEqual(0, result.returncode, result.stderr)
        with zipfile.ZipFile(self.dist / "slateframe.zip") as z:
            self.assertEqual((1980, 1, 1, 0, 0, 0), z.getinfo("slateframe/style.css").date_time)

    def test_default_epoch_reproducible(self):
        first = self.build()
        self.assertEqual(0, first.returncode, first.stderr)
        before = hashlib.sha256((self.dist / "slateframe.zip").read_bytes()).hexdigest()
        second = self.build()
        self.assertEqual(0, second.returncode, second.stderr)
        after = hashlib.sha256((self.dist / "slateframe.zip").read_bytes()).hexdigest()
        self.assertEqual(before, after)
        with zipfile.ZipFile(self.dist / "slateframe.zip") as z:
            self.assertEqual((2000, 1, 1, 0, 0, 0), z.getinfo("slateframe/style.css").date_time)


if __name__ == "__main__":
    unittest.main()
