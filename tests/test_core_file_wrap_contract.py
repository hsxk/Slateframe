"""Guard Core File filename wrapping against late WordPress block CSS."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
STYLE = (ROOT / "style.css").read_text(encoding="utf-8")
READING = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")


class CoreFileWrapContract(unittest.TestCase):
    def test_filename_and_download_wrap_under_core_styles(self):
        self.assertIn(
            ".wp-block-file>a{display:inline-flex;"
            "align-items:center;min-block-size:var(--slateframe-control);"
            "max-inline-size:100%;overflow-wrap:anywhere}", STYLE
        )

    def test_download_label_wraps_inside_bounded_control(self):
        rules = re.findall(r"\.slateframe-prose a\.wp-block-file__button\{([^}]*)\}", READING)
        self.assertEqual(len(rules), 1)
        declarations = dict(
            part.split(":", 1) for part in rules[0].split(";") if ":" in part
        )
        self.assertNotIn("overflow-wrap", declarations)
        self.assertEqual(declarations.get("white-space"), "normal")
        self.assertEqual(declarations.get("max-inline-size"), "100%")
        self.assertEqual(declarations.get("min-height"), "var(--slateframe-control)")

    def test_existing_runtime_budgets_are_preserved(self):
        size = lambda path: (ROOT / path).stat().st_size
        self.assertLessEqual(size("style.css"), 16000)
        self.assertLessEqual(size("assets/css/reading.css"), 7000)
        shared = sum(size(name) for name in (
            "style.css", "assets/css/navigation.css", "assets/css/footer.css",
            "assets/js/theme.js", "assets/css/reading.css", "assets/css/publishing.css",
            "assets/css/forms.css", "assets/css/comments.css", "assets/css/form-content.css",
        ))
        self.assertLessEqual(shared, 38000)
        photography_discussion = shared - size("assets/css/form-content.css") + size("assets/css/photography.css")
        self.assertLessEqual(photography_discussion, 43000)


if __name__ == "__main__":
    unittest.main()
