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

    def test_editor_does_not_force_preformatted_ltr(self):
        editor = (ROOT / 'assets/css/editor.css').read_text(encoding='utf-8')
        self.assertIn('.editor-styles-wrapper .wp-block-code{direction:ltr;text-align:left}', editor)
        self.assertNotIn('.editor-styles-wrapper .wp-block-preformatted{direction:ltr', editor)


if __name__ == '__main__':
    unittest.main()
