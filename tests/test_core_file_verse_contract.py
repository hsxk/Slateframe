"""Core File and Verse preserve WordPress native behavior and CSS budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NativeCorePublishing(unittest.TestCase):
    def test_file_button_geometry_in_frontend_and_editor(self):
        cases = (
            ("reading.css", ".slateframe-prose a.wp-block-file__button", "min-height:var(--slateframe-control)"),
            ("editor.css", ".editor-styles-wrapper .wp-block-file__button", "min-block-size:var(--slateframe-control)"),
        )
        for filename, selector, minimum in cases:
            with self.subTest(filename=filename):
                css = (ROOT / "assets/css" / filename).read_text(encoding="utf-8")
                self.assertEqual(css.count(selector + "{"), 1)
                rule = css.split(selector + "{", 1)[1].split("}", 1)[0]
                for property in (
                    "display:inline-flex", minimum, "max-inline-size:100%",
                    "border-radius:var(--slateframe-radius)", "white-space:normal",
                ):
                    with self.subTest(property=property):
                        self.assertIn(property, rule)
        # The bounded control token cannot fall below the 44px target.
        style = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn("--slateframe-control:44px", style)

    def test_verse_is_editorial_and_preformatted_remains_scrollable(self):
        reading = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        publishing = (ROOT / "assets/css/publishing.css").read_text(encoding="utf-8")
        editor = (ROOT / "assets/css/editor.css").read_text(encoding="utf-8")
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
