"""Core Details remains native and bounded across Appearance and languages."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]

class CoreDetailsContract(unittest.TestCase):
    def test_css(self):
        css = (ROOT / "assets/css/reading.css").read_text()
        self.assertIn("& .wp-block-details summary{display:list-item;min-block-size:var(--slateframe-control)", css)
        self.assertIn("overflow-wrap:anywhere;cursor:pointer", css)
        self.assertIn("border-block:var(--slateframe-rule)", css)
        self.assertNotIn(".wp-block-details summary::marker{", css)
        self.assertLessEqual(len(css.encode()), 7000)
        self.assertIn(".wp-block-details[open]>summary+*{margin-block-start:0}", (ROOT / "style.css").read_text())

    def test_browser_coverage(self):
        js = (ROOT / "tests/browser/core-details-accessibility.spec.js").read_text()
        for needle in ("[320, 375, 390, 412, 768, 1440, 1920]", "[44, 48, 56]",
                       "['ltr', 'rtl']", "forcedColors: 'active'", "summary.press('Enter')",
                       "summary.press('Space')", "media: 'print'", "core-details-390-rtl-200-forced-colors.png"):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)
if __name__ == "__main__":
    unittest.main()
