"""Guard Core Calendar containment and table semantics."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreCalendarContract(unittest.TestCase):
    def test_frontend_and_editor_share_scroll_container(self):
        front = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        editor = (ROOT / "assets/css/editor.css").read_text(encoding="utf-8")
        self.assertIn(".slateframe-prose .wp-block-calendar{max-inline-size:100%;overflow-x:auto;", front)
        self.assertIn("& th{white-space:nowrap}}", front)
        self.assertIn(".editor-styles-wrapper .wp-block-calendar{max-inline-size:100%;overflow-x:auto}", editor)
        self.assertIn(".editor-styles-wrapper .wp-block-calendar th{white-space:nowrap}", editor)

    def test_no_table_semantics_replacement(self):
        front = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        self.assertNotIn(".wp-block-calendar table{display:block", front)
        self.assertNotIn(".wp-block-calendar table{display:grid", front)


if __name__ == "__main__":
    unittest.main()
