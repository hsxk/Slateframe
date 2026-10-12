"""Core Verse must follow RTL writing direction while code remains LTR."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RtlVerseContract(unittest.TestCase):
    def test_verse_excluded_from_code_direction_override(self):
        css = (ROOT / 'rtl.css').read_text()
        self.assertNotIn('[dir="rtl"] .slateframe-prose pre,', css)
        self.assertIn('pre:not(.wp-block-verse)', css)
        self.assertIn('[dir="rtl"] .wp-block-code{direction:ltr;text-align:left}', css)

    def test_editor_code_parity(self):
        css = (ROOT / 'assets/css/editor.css').read_text()
        self.assertIn('.editor-styles-wrapper .wp-block-code{direction:ltr;text-align:left}', css)
        self.assertIn('.editor-styles-wrapper .wp-block-verse{font-family:inherit', css)

    def test_browser_regression_inspects_direction(self):
        source = (ROOT / 'tests/browser/core-file-verse.spec.js').read_text()
        self.assertIn('verseDirection', source)
        self.assertIn('codeDirection', source)
        self.assertIn('toBe(dir)', source)


if __name__ == '__main__':
    unittest.main()
