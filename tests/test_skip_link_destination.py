"""Keep skip-link destinations keyboard-focusable on every public template."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = (
    "index.php", "single.php", "page.php", "archive.php",
    "search.php", "404.php", "attachment.php",
)


class SkipLinkDestinationTest(unittest.TestCase):
    def test_public_templates_have_a_single_programmatic_focus_target(self):
        target = '<main id="main-content" class="slateframe-main" tabindex="-1">'
        for template in TEMPLATES:
            with self.subTest(template=template):
                markup = (ROOT / template).read_text(encoding="utf-8")
                self.assertEqual(markup.count(target), 1)
                self.assertEqual(markup.count('id="main-content"'), 1)

    def test_skip_link_points_to_focusable_landmark(self):
        header = (ROOT / "header.php").read_text(encoding="utf-8")
        self.assertIn('class="screen-reader-text skip-link" href="#main-content"', header)
        browser = (ROOT / "tests/browser/theme.spec.js").read_text(encoding="utf-8")
        self.assertIn("toBeFocused();", browser)
        self.assertIn("document.activeElement.closest('#main-content')", browser)


if __name__ == "__main__":
    unittest.main()
