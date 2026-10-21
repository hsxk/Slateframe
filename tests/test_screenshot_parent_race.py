"""Reject screenshot reads that escape through a swapped parent directory."""
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from test_screenshot_metadata import sample_png

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('slateframe_parent_race', ROOT / 'bin/check-screenshot.py')
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)


@unittest.skipUnless(CHECKER.SECURE_OPENAT_AVAILABLE, 'secure openat requires POSIX')
class ScreenshotParentRaceTests(unittest.TestCase):
    def test_nested_regular_directories_are_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'first' / 'second' / 'screenshot.png'
            path.parent.mkdir(parents=True)
            path.write_bytes(sample_png())
            CHECKER.validate(path)

    def check_parent_swap(self, nested):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            safe = root / 'safe'
            safe.mkdir()
            if nested:
                (safe / 'nested').mkdir()
                parent = safe / 'nested'
            else:
                parent = safe
            original = parent / 'screenshot.png'
            original.write_bytes(sample_png())
            external = root / 'external'
            external.mkdir()
            (external / 'screenshot.png').write_bytes(sample_png())
            old_parent = root / 'renamed-original'
            last_parent = tuple(original.parents)[-1]
            real_is_symlink = Path.is_symlink
            swapped = []

            def swap_after_preflight(candidate):
                result = real_is_symlink(candidate)
                if candidate == last_parent and not swapped:
                    swapped.append(True)
                    parent.rename(old_parent)
                    parent.symlink_to(external, target_is_directory=True)
                return result

            with mock.patch.object(Path, 'is_symlink', autospec=True,
                                   side_effect=swap_after_preflight):
                with self.assertRaisesRegex(ValueError, 'unreadable|symlink'):
                    CHECKER.validate(original)
            self.assertTrue(swapped, 'fixture must swap the parent after preflight')
            self.assertTrue((external / 'screenshot.png').is_file())

    def test_rejects_parent_swapped_for_symlink_after_preflight(self):
        self.check_parent_swap(False)

    def test_rejects_nested_parent_swapped_for_symlink_after_preflight(self):
        self.check_parent_swap(True)

    def test_directory_descriptors_are_anchored_and_nofollow(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'a' / 'screenshot.png'
            path.parent.mkdir()
            path.write_bytes(sample_png())
            real_open = os.open
            calls = []

            def record_open(name, flags, *args, **kwargs):
                calls.append((name, flags, kwargs.get('dir_fd')))
                return real_open(name, flags, *args, **kwargs)

            with mock.patch.object(os, 'open', side_effect=record_open):
                CHECKER.validate(path)
            self.assertGreaterEqual(len(calls), 3)
            self.assertEqual(calls[0][0], os.path.sep)
            self.assertIsNone(calls[0][2])
            self.assertTrue(all(fd is not None for _, _, fd in calls[1:]))
            self.assertTrue(all(flags & os.O_NOFOLLOW for _, flags, _ in calls))
            self.assertTrue(all(flags & os.O_DIRECTORY for _, flags, _ in calls[:-1]))
            self.assertTrue(calls[-1][1] & os.O_NONBLOCK)

    def test_rejects_existing_symlinked_parent(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            actual = root / 'actual'
            actual.mkdir()
            (actual / 'screenshot.png').write_bytes(sample_png())
            alias = root / 'alias'
            alias.symlink_to(actual, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'symlinked'):
                CHECKER.validate(alias / 'screenshot.png')

    def test_relative_path_is_supported_without_symlink_traversal(self):
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as folder:
            path = Path(folder) / 'screenshot.png'
            path.write_bytes(sample_png())
            CHECKER.validate(path.relative_to(Path.cwd()))

    def test_invalid_png_closes_all_opened_descriptors(self):
        fd_directory = Path('/proc/self/fd')
        if not fd_directory.exists():
            self.skipTest('requires Linux /proc/self/fd')
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'screenshot.png'
            path.write_bytes(b'invalid')
            before = len(list(fd_directory.iterdir()))
            for _ in range(5):
                with self.assertRaisesRegex(ValueError, 'signature'):
                    CHECKER.validate(path)
            self.assertEqual(before, len(list(fd_directory.iterdir())))

    def test_directory_open_failure_closes_parent_descriptor(self):
        fd_directory = Path('/proc/self/fd')
        if not fd_directory.exists():
            self.skipTest('requires Linux /proc/self/fd')
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'nested' / 'screenshot.png'
            path.parent.mkdir()
            path.write_bytes(sample_png())
            real_open = os.open

            def fail_nested_open(name, flags, *args, **kwargs):
                if name == 'nested':
                    raise PermissionError('synthetic traversal denial')
                return real_open(name, flags, *args, **kwargs)

            before = len(list(fd_directory.iterdir()))
            with mock.patch.object(os, 'open', side_effect=fail_nested_open):
                with self.assertRaisesRegex(ValueError, 'unreadable screenshot PNG'):
                    CHECKER.validate(path)
            self.assertEqual(before, len(list(fd_directory.iterdir())))

    def test_fails_closed_if_secure_openat_is_unavailable(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'screenshot.png'
            path.write_bytes(sample_png())
            with mock.patch.object(CHECKER, 'SECURE_OPENAT_AVAILABLE', False):
                with self.assertRaisesRegex(ValueError, 'secure screenshot path open unsupported'):
                    CHECKER.validate(path)


if __name__ == '__main__':
    unittest.main()
