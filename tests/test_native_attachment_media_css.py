"""Core player wrapper containment must fit existing frontend/editor budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeAttachmentMediaCSS(unittest.TestCase):
    def test_frontend_editor_parity_and_budgets(self):
        reading = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        editor = (ROOT / 'assets/css/editor.css').read_text(encoding='utf-8')
        self.assertIn('.slateframe-prose :is(figure,audio,iframe,embed,object,.wp-video,.mejs-container){max-width:100%}', reading)
        self.assertIn('.editor-styles-wrapper :is(audio,iframe,embed,object,.wp-video,.mejs-container){max-inline-size:100%}', editor)
        self.assertLessEqual(len(reading.encode('utf-8')), 7000)
        self.assertLessEqual(len(editor.encode('utf-8')), 5000)
        browser = (ROOT / 'tests/browser/attachment-native-media.spec.js').read_text(encoding='utf-8')
        self.assertNotIn('test.skip(', browser)
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), browser)


if __name__ == '__main__':
    unittest.main()
