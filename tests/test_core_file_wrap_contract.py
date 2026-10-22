"""Guard Core File filename wrapping against late WordPress block CSS."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
STYLE = (ROOT / "style.css").read_text(encoding="utf-8")


class CoreFileWrapContract(unittest.TestCase):
    def test_filename_explicitly_wraps_under_core_styles(self):
        self.assertIn(
            ".wp-block-file>a:first-of-type{display:inline-flex;"
            "align-items:center;min-block-size:var(--slateframe-control);"
            "max-inline-size:100%;overflow-wrap:anywhere}", STYLE
        )

    def test_existing_runtime_budgets_are_preserved(self):
        size = lambda path: (ROOT / path).stat().st_size
        self.assertLessEqual(size("style.css"), 16000)
        shared = sum(size(name) for name in (
            "style.css", "assets/css/navigation.css", "assets/css/footer.css",
            "assets/js/theme.js", "assets/css/reading.css", "assets/css/publishing.css",
            "assets/css/forms.css", "assets/css/comments.css", "assets/css/form-content.css",
        ))
        self.assertLessEqual(shared, 38000)


if __name__ == "__main__":
    unittest.main()
