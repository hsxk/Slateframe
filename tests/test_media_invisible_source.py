"""Ensure invisible Unicode cannot turn an empty Core player into a preview."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MediaInvisibleSource(unittest.TestCase):
    def test_real_php_media_source_guard(self):
        fixture = ROOT / 'tests/fixtures/media-invisible-source.php.fixture'
        result = subprocess.run(
            ['php', str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn('Media invisible sources: 18 assertions passed', result.stdout)

    def test_reuses_shared_readable_label_contract(self):
        media = (ROOT / 'inc/media-source.php').read_text(encoding='utf-8')
        self.assertEqual(media.count('slateframe_has_readable_label( $src )'), 2)
        self.assertIn("'SOURCE' !== $current_tag", media)
        self.assertIn("strtoupper( $tag ) === $current_tag", media)


if __name__ == '__main__':
    unittest.main()
