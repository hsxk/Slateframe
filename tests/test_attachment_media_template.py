"""Run the actual attachment template against malformed media filter outputs."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AttachmentMediaTemplate(unittest.TestCase):
    def test_php_runtime_media_boundaries(self):
        fixture = ROOT / 'tests/fixtures/attachment-media-template.php.fixture'
        result = subprocess.run(
            ['php', str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('Attachment media template: 32 assertions passed', result.stdout)

    def test_uses_core_media_without_business_or_remote_dependencies(self):
        source = (ROOT / 'attachment.php').read_text(encoding='utf-8')
        self.assertIn('wp_get_attachment_image(', source)
        self.assertIn('wp_video_shortcode(', source)
        self.assertIn('wp_audio_shortcode(', source)
        self.assertIn('new WP_HTML_Tag_Processor(', source)
        self.assertIn('esc_url_raw( $slateframe_raw_url )', source)
        self.assertNotIn('time2log', source.lower())


if __name__ == '__main__':
    unittest.main()
