"""WordPress.org theme screenshots must not contain APNG animation frames."""
import tempfile
import unittest
from pathlib import Path
from test_screenshot_metadata import CHECKER, sample_png


class ScreenshotAnimationTests(unittest.TestCase):
    def check(self, data):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'screenshot.png'
            path.write_bytes(data)
            CHECKER.validate(path)

    def test_rejects_animation_control_chunk(self):
        with self.assertRaisesRegex(ValueError, 'static PNG'):
            self.check(sample_png(before=((b'acTL', b'\x00' * 8),)))

    def test_rejects_frame_control_chunk(self):
        with self.assertRaisesRegex(ValueError, 'static PNG'):
            self.check(sample_png(before=((b'fcTL', b'\x00' * 26),)))

    def test_rejects_frame_data_after_image(self):
        with self.assertRaisesRegex(ValueError, 'static PNG'):
            self.check(sample_png(after=((b'fdAT', b'\x00' * 12),)))

    def test_static_png_remains_accepted(self):
        self.check(sample_png())


if __name__ == '__main__':
    unittest.main()
