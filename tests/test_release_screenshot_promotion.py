"""Exact-HEAD, non-destructive release screenshot promotion regressions."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('slateframe_release_promotion', ROOT / 'bin/promote-release-screenshot.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
HEAD = 'a' * 40


class ReleaseScreenshotPromotion(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.png = (ROOT / 'screenshot.png').read_bytes()

    def make_artifact(self, path, *, sha=HEAD, corrupt=False, extra=None):
        data = self.png
        record = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'width': 1200, 'height': 900}
        if corrupt:
            record['sha256'] = '0' * 64
        manifest = {'head_sha': sha, 'screenshots': {MODULE.SCREENSHOT: record}}
        with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('ci/screenshots/' + MODULE.SCREENSHOT, data)
            archive.writestr('ci/screenshots/' + MODULE.INVENTORY, json.dumps(manifest))
            if extra:
                archive.writestr(extra, b'bad')

    def test_dry_run_does_not_replace_target(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive, target = root / 'artifact.zip', root / 'screenshot.png'
            self.make_artifact(archive)
            target.write_bytes(b'unchanged')
            digest = MODULE.promote(archive, HEAD, target)
            self.assertEqual(digest, hashlib.sha256(self.png).hexdigest())
            self.assertEqual(target.read_bytes(), b'unchanged')

    def test_apply_preserves_exact_pixel_bytes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive, target = root / 'artifact.zip', root / 'screenshot.png'
            self.make_artifact(archive)
            MODULE.promote(archive, HEAD, target, apply=True)
            self.assertEqual(target.read_bytes(), self.png)

    def test_rejects_wrong_head(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder) / 'artifact.zip'
            self.make_artifact(archive)
            with self.assertRaisesRegex(ValueError, 'HEAD mismatch'):
                MODULE.promote(archive, 'b' * 40, Path(folder) / 'output.png')

    def test_rejects_corrupted_inventory_digest(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder) / 'artifact.zip'
            self.make_artifact(archive, corrupt=True)
            with self.assertRaisesRegex(ValueError, 'inventory'):
                MODULE.promote(archive, HEAD, Path(folder) / 'output.png')

    def test_rejects_unsafe_zip_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder) / 'artifact.zip'
            self.make_artifact(archive, extra='../escape.txt')
            with self.assertRaisesRegex(ValueError, 'unsafe artifact path'):
                MODULE.promote(archive, HEAD, Path(folder) / 'output.png')

    def test_rejects_duplicate_candidate(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder) / 'artifact.zip'
            self.make_artifact(archive, extra='other/' + MODULE.SCREENSHOT)
            with self.assertRaisesRegex(ValueError, 'expected one'):
                MODULE.promote(archive, HEAD, Path(folder) / 'output.png')

    def test_rejects_missing_inventory(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = Path(folder) / 'artifact.zip'
            with zipfile.ZipFile(archive, 'w') as zipped:
                zipped.writestr(MODULE.SCREENSHOT, self.png)
            with self.assertRaisesRegex(ValueError, 'expected one'):
                MODULE.promote(archive, HEAD, Path(folder) / 'output.png')

    def test_rejects_linked_artifact(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive, link = root / 'artifact.zip', root / 'linked.zip'
            self.make_artifact(archive)
            link.symlink_to(archive)
            with self.assertRaisesRegex(ValueError, 'linked'):
                MODULE.promote(link, HEAD, root / 'output.png')

    def test_rejects_linked_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive, target, original = root / 'artifact.zip', root / 'screenshot.png', root / 'original.png'
            self.make_artifact(archive)
            original.write_bytes(b'unchanged')
            target.symlink_to(original)
            with self.assertRaisesRegex(ValueError, 'linked'):
                MODULE.promote(archive, HEAD, target, apply=True)
            self.assertEqual(original.read_bytes(), b'unchanged')

    def test_rejects_hardlinked_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive, target, original = root / 'artifact.zip', root / 'screenshot.png', root / 'original.png'
            self.make_artifact(archive)
            original.write_bytes(b'unchanged')
            os.link(original, target)
            with self.assertRaisesRegex(ValueError, 'single-link'):
                MODULE.promote(archive, HEAD, target, apply=True)


if __name__ == '__main__':
    unittest.main()
