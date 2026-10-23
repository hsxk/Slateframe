"""Native Core Preformatted must retain the document writing direction."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RtlPreformattedContract(unittest.TestCase):
    def test_rtl_code_override_excludes_prose_blocks(self):
        css = (ROOT / 'rtl.css').read_text(encoding='utf-8')
        self.assertIn('pre:not(.wp-block-verse):not(.wp-block-preformatted)', css)
        self.assertIn('[dir="rtl"] .wp-block-code{direction:ltr;text-align:left}', css)
        self.assertNotIn('pre:not(.wp-block-verse),', css)

    def test_frontend_code_matches_editor_direction(self):
        reading = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        editor = (ROOT / 'assets/css/editor.css').read_text(encoding='utf-8')
        # Core Code is source text in either writing direction. Core Preformatted
        # and Verse remain authored prose, including in Arabic and CJK content.
        self.assertIn('.wp-block-code{direction:ltr;text-align:left}', reading)
        self.assertIn('.editor-styles-wrapper .wp-block-code{direction:ltr;text-align:left}', editor)
        self.assertNotIn('.wp-block-preformatted{direction:ltr', reading)
        self.assertNotIn('.wp-block-verse{direction:ltr', reading)
        self.assertNotIn('.wp-block-preformatted{direction:ltr', editor)
        self.assertNotIn('.wp-block-verse{direction:ltr', editor)

    def test_editor_does_not_force_preformatted_ltr(self):
        editor = (ROOT / 'assets/css/editor.css').read_text(encoding='utf-8')
        self.assertIn('.editor-styles-wrapper .wp-block-code{direction:ltr;text-align:left}', editor)
        self.assertNotIn('.editor-styles-wrapper .wp-block-preformatted{direction:ltr', editor)


if __name__ == '__main__':
    unittest.main()
