"""Ensure blank entity/Unicode titles do not create nameless discovery links."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DisplayTitleUnicode(unittest.TestCase):
    def test_real_php_output_for_blank_and_visible_titles(self):
        result = subprocess.run(
            ['php', str(ROOT / 'tests/fixtures/display-title-unicode.php.fixture')],
            cwd=ROOT, capture_output=True, text=True, timeout=20, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Display title Unicode: 32 cases passed', result.stdout)

    def test_core_title_is_preserved_and_fallback_translated(self):
        source = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        helper = source.split('function slateframe_has_readable_label(', 1)[1].split('\n}', 1)[0]
        title = source.split('function slateframe_get_display_title(', 1)[1].split('\n}', 1)[0]
        self.assertIn('html_entity_decode(', helper)
        self.assertIn(r'\p{M}', helper)
        self.assertIn(r'\x{2800}', helper)
        self.assertIn(r'\x{3164}', helper)
        self.assertIn('wp_strip_all_tags( $text )', helper)
        self.assertIn("'UTF-8'", helper)
        self.assertIn('1 === preg_match(', helper)
        self.assertIn('slateframe_has_readable_label( $title )', title)
        self.assertIn("__( 'Untitled', 'slateframe' )", title)
        self.assertIn('return $title;', title)
        self.assertNotIn('str_replace(', title)
        self.assertNotIn('dir="ltr"', title)


if __name__ == '__main__':
    unittest.main()
