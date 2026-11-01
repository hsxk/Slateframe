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
        self.assertIn('Attachment media template: 105 assertions passed', result.stdout)

    def test_uses_core_media_without_business_or_remote_dependencies(self):
        source = (ROOT / 'attachment.php').read_text(encoding='utf-8')
        self.assertIn('wp_get_attachment_image(', source)
        self.assertIn('wp_video_shortcode(', source)
        self.assertIn('wp_audio_shortcode(', source)
        self.assertIn('slateframe_sanitize_media_shortcode(', source)
        self.assertIn("slateframe_media_has_source( $slateframe_video_html, 'video' )", source)
        self.assertIn("slateframe_media_has_source( $slateframe_audio_html, 'audio' )", source)
        self.assertIn('new WP_HTML_Tag_Processor(', source)
        self.assertIn('wp_kses_post( $slateframe_image_html )', source)
        self.assertIn("set_attribute( 'fetchpriority', 'high' )", source)
        self.assertIn("get_attribute( 'src' )", source)
        self.assertIn("get_attribute( 'srcset' )", source)
        media = (ROOT / 'inc/media-source.php').read_text(encoding='utf-8')
        self.assertIn('! is_string( $html )', media)
        self.assertIn("in_array( $tag, array( 'video', 'audio' ), true )", media)
        self.assertIn("next_tag( $tag )", media)
        self.assertIn("next_tag( 'source' )", media)
        self.assertIn("get_attribute( 'src' )", media)
        self.assertIn("wp_kses_allowed_html( 'post' )", media)
        self.assertIn("wp_kses( $html, $allowed )", media)
        self.assertIn("'src'   => true", media)
        self.assertIn("'type'  => true", media)
        self.assertIn("'media' => true", media)
        self.assertIn('is_string( $slateframe_raw_content )', source)
        self.assertIn('esc_url_raw( $slateframe_raw_url )', source)
        self.assertNotIn('time2log', source.lower())


if __name__ == '__main__':
    unittest.main()
