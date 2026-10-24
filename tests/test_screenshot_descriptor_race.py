"""Keep release screenshot checks bound to the file descriptor actually opened."""
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from test_screenshot_metadata import sample_png

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('slateframe_screenshot_fd', ROOT / 'bin/check-screenshot.py')
CHECKER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CHECKER)


class ScreenshotDescriptorRaceTests(unittest.TestCase):
    def test_regular_file_is_accepted(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'screenshot.png'
            path.write_bytes(sample_png())
            CHECKER.validate(path)

    def check_swap(self, kind):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            path = root / 'screenshot.png'
            target = root / 'outside.png'
            path.write_bytes(sample_png())
            target.write_bytes(sample_png())
            real_open = os.open
            real_is_symlink = Path.is_symlink
            last_parent = tuple(path.parents)[-1]
            calls = []
            swapped = []

            def swap_after_preflight(candidate):
                result = real_is_symlink(candidate)
                if candidate == last_parent and not swapped:
                    swapped.append(True)
                    path.unlink()
                    if kind == 'symlink':
                        path.symlink_to(target)
                    elif kind == 'hardlink':
                        os.link(target, path)
                    else:
                        os.mkfifo(path)
                return result

            def record_open(name, flags, *args, **kwargs):
                calls.append(flags)
                return real_open(name, flags, *args, **kwargs)

            with mock.patch.object(Path, 'is_symlink', autospec=True,
                                   side_effect=swap_after_preflight), \
                 mock.patch.object(os, 'open', side_effect=record_open):
                with self.assertRaisesRegex(ValueError, 'symlink|non-regular|hardlinked|unreadable'):
                    CHECKER.validate(path)
            self.assertTrue(swapped, 'fixture must replace file after the path preflight')
            self.assertGreaterEqual(len(calls), 2)
            self.assertTrue(calls[-1] & getattr(os, 'O_NONBLOCK', 0))
            self.assertTrue(all(flags & os.O_NOFOLLOW for flags in calls))
            self.assertTrue(all(flags & os.O_DIRECTORY for flags in calls[:-1]))

    def test_rejects_symlink_swapped_after_path_preflight(self):
        self.check_swap('symlink')

    def test_rejects_hardlink_swapped_after_path_preflight(self):
        self.check_swap('hardlink')

    @unittest.skipUnless(hasattr(os, 'mkfifo'), 'requires POSIX FIFO')
    def test_rejects_fifo_swapped_after_path_preflight(self):
        self.check_swap('fifo')


if __name__ == '__main__':
    unittest.main()
