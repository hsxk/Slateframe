"""Guard Core Details summary geometry without changing native disclosure behavior."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreDetailsSummaryGeometry(unittest.TestCase):
    def test_bounded_native_summary(self):
        css = (ROOT / "assets/css/core-details.css").read_text(encoding="utf-8")
        summary = css.split(".wp-block-details>summary{", 1)[1].split("}", 1)[0]
        for declaration in (
            "min-inline-size:0",
            "max-inline-size:100%",
            "min-block-size:var(--slateframe-control)",
            "cursor:pointer",
        ):
            with self.subTest(declaration=declaration):
                self.assertIn(declaration, summary)
        self.assertNotIn("display:", summary)
        self.assertNotIn("list-style:", summary)

    def test_editor_padding_remains_logical(self):
        css = (ROOT / "assets/css/core-details.css").read_text(encoding="utf-8")
        self.assertIn(".editor-styles-wrapper &{padding-inline-start:", css)
        self.assertNotIn("padding-left:", css)
        self.assertNotIn("padding-right:", css)
        self.assertLessEqual(len(css.encode("utf-8")), 400)


if __name__ == "__main__":
    unittest.main()
