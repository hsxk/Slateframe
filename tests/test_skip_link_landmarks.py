"""All classic templates must share one keyboard-reachable main landmark."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ("404.php", "archive.php", "attachment.php", "author.php", "index.php", "page.php", "search.php", "single.php")

class SkipLinkContract(unittest.TestCase):
    def test_all_main_targets_are_focusable(self):
        for path in TEMPLATES:
            with self.subTest(path=path):
                html = (ROOT / path).read_text(encoding="utf-8")
                mains = re.findall(r'<main\b[^>]*\bid="main-content"[^>]*>', html)
                self.assertEqual(len(mains), 1, path)
                self.assertIn('tabindex="-1"', mains[0], path)

    def test_skip_link_uses_core_translations(self):
        header = (ROOT / "header.php").read_text(encoding="utf-8")
        self.assertIn('href="#main-content"', header)
        self.assertIn("esc_html_e( 'Skip to content', 'slateframe' )", header)

if __name__ == "__main__":
    unittest.main()
