"""Core media recovery URLs and filtered image alts remain accessible."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AttachmentSourceAccessibility(unittest.TestCase):
    def run_fixture(self, name, expected):
        result = subprocess.run(
            ['php', str(ROOT / 'tests/fixtures' / name)],
            cwd=ROOT, capture_output=True, text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(expected, result.stdout)

    def test_recovery_url_cases(self):
        self.run_fixture('attachment-file-url.php.fixture',
                         'Attachment recovery URL: 22 cases passed')

    def test_filtered_image_alt_cases(self):
        self.run_fixture('image-alt-visibility.php.fixture',
                         'Image alt normalization: 14 cases passed')

    def test_percent_encoded_invisible_media_urls(self):
        self.run_fixture('media-url-percent-encoding.php.fixture',
                         'Media percent-encoded URLs: 18 cases passed')

    def test_shared_helpers_are_wired_into_both_core_media_templates(self):
        media = (ROOT / 'inc/media-source.php').read_text(encoding='utf-8')
        featured = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        attachment = (ROOT / 'attachment.php').read_text(encoding='utf-8')
        self.assertIn('function slateframe_attachment_file_url( $url )', media)
        self.assertIn('slateframe_has_readable_media_url( $url )', media)
        self.assertIn('slateframe_attachment_file_url( $slateframe_raw_url )', attachment)
        self.assertIn('function slateframe_normalize_image_alt( $processor )', media)
        self.assertIn('slateframe_normalize_image_alt( $image_processor )', featured)
        self.assertIn('slateframe_normalize_image_alt( $slateframe_image_processor )', attachment)
        self.assertNotIn('time2log', media.lower())


if __name__ == '__main__':
    unittest.main()
