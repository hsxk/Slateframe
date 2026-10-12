"""Protect Core Calendar legibility and bounded CSS budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class CoreCalendarLegibilityContract(unittest.TestCase):
    def test_calendar_frontend_editor_and_native_table(self):
        front = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        editor = (ROOT / 'assets/css/editor.css').read_text(encoding='utf-8')
        self.assertIn('.wp-block-calendar{max-inline-size:100%;overflow-x:auto;& th{white-space:nowrap}}', front)
        self.assertIn('.editor-styles-wrapper .wp-block-calendar th{white-space:nowrap}', editor)
        self.assertNotIn('.wp-block-calendar table{display:grid', front)

    def test_native_media_deduplication_and_strict_budgets(self):
        front = (ROOT / 'assets/css/reading.css').read_text(encoding='utf-8')
        self.assertIn(':is(figure,audio,iframe,embed,object){max-width:100%}', front)
        self.assertLessEqual((ROOT / 'assets/css/reading.css').stat().st_size, 7000)
        self.assertLessEqual((ROOT / 'assets/css/editor.css').stat().st_size, 5000)
        p = ['style.css','assets/css/navigation.css','assets/css/footer.css','assets/js/theme.js','assets/css/reading.css','assets/css/publishing.css','assets/css/forms.css','assets/css/comments.css','assets/css/form-content.css']
        self.assertLessEqual(sum((ROOT / f).stat().st_size for f in p), 38000)

if __name__ == '__main__':
    unittest.main()
