"""Preserve readable Core attachment metadata and captions without empty rows."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MediaReadableMetadata(unittest.TestCase):
    def test_real_php_metadata_boundaries(self):
        fixture = ROOT / 'tests/fixtures/media-readable-metadata.php.fixture'
        result = subprocess.run(['php', str(fixture)], cwd=ROOT,
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('Media metadata readability: 23 assertions passed', result.stdout)

    def test_runtime_reuses_readability_for_details_and_captions(self):
        tags = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        attachment = (ROOT / 'attachment.php').read_text(encoding='utf-8')
        self.assertIn('! slateframe_has_readable_label( $label )', tags)
        self.assertIn('$filtered = $details;', tags)
        self.assertIn('! slateframe_has_readable_label( $value )', tags)
        self.assertIn('if ( slateframe_has_readable_label( $caption ) )', tags)
        self.assertEqual(attachment.count('if ( slateframe_has_readable_label( $slateframe_caption ) )'), 3)
        self.assertIn('wp_kses_post( $slateframe_caption )', attachment)
        self.assertIn('wp_kses_post( $caption )', tags)
        self.assertNotIn('time2log', attachment.lower())

    def test_real_wordpress_visual_and_cleanup_contract(self):
        path = ROOT / 'tests/browser/media-readable-caption.spec.js'
        source = path.read_text(encoding='utf-8')
        for marker in ("wp('media', 'import'", "wp('post', 'meta', 'update'",
                       'finally {', 'fs.rm(plugin', "flag: 'wx'", 'wp_delete_attachment(',
                       "wp('post', 'delete'", 'for (const width of widths)',
                       "['ltr', 'rtl']", '[16, 64]', 'AxeBuilder', 'forcedColors',
                       'media-readable-attachment-390-rtl-400-forced-colors.png',
                       'media-readable-hero-390-rtl-400-forced-colors.png'):
            with self.subTest(marker=marker):
                self.assertIn(marker, source)
        result = subprocess.run(['node', '--check', str(path)], cwd=ROOT,
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)


if __name__ == '__main__':
    unittest.main()
