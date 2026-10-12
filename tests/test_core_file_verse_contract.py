"""Core File and Verse preserve WordPress native behavior and CSS budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeCorePublishing(unittest.TestCase):
    def test_file_button_geometry_in_frontend_and_editor(self):
        for file, scope in (("reading.css", ".slateframe-prose"), ("editor.css", ".editor-styles-wrapper")):
            css = (ROOT / "assets/css" / file).read_text()
            self.assertIn(scope + " .wp-block-file__button{display:inline-flex", css)
            self.assertIn("min-block-size:var(--slateframe-control)", css)
            self.assertIn("max-inline-size:100%", css)
            self.assertIn("border-radius:var(--slateframe-radius)", css)
            self.assertIn("white-space:normal", css)

    def test_verse_is_editorial_and_preformatted_remains_scrollable(self):
        reading = (ROOT / "assets/css/reading.css").read_text()
        publishing = (ROOT / "assets/css/publishing.css").read_text()
        editor = (ROOT / "assets/css/editor.css").read_text()
        self.assertIn(".slateframe-prose pre:not(.wp-block-verse),.wp-block-code{", reading)
        for css, scope in ((publishing, ".slateframe-prose"), (editor, ".editor-styles-wrapper")):
            self.assertIn(scope + " .wp-block-verse{font-family:inherit;white-space:pre-wrap;overflow-wrap:anywhere", css)
        self.assertIn("overscroll-behavior-inline:contain", reading)

    def test_existing_static_budgets(self):
        for name, limit in (("reading.css", 7000), ("publishing.css", 4500), ("editor.css", 5000)):
            with self.subTest(name=name):
                self.assertLessEqual((ROOT / "assets/css" / name).stat().st_size, limit)


if __name__ == "__main__":
    unittest.main()
