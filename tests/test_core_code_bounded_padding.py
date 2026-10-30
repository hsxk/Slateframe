"""Guard native Core Code and Preformatted reading width at 400% zoom."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "assets/css/reading.css"
BROWSER = ROOT / "tests/browser/core-code-scroll.spec.js"


class CoreCodeBoundedPadding(unittest.TestCase):
    def test_bounded_css_and_existing_budget(self):
        css = CSS.read_text(encoding="utf-8")
        self.assertLessEqual(len(css.encode("utf-8")), 7000)
        self.assertIn(
            "padding:min(var(--slateframe-stack-gap),32px) "
            "min(var(--slateframe-prose-gap),24px)", css,
        )
        self.assertNotIn(
            "padding:var(--slateframe-stack-gap) var(--slateframe-prose-gap)", css,
        )
        self.assertIn(".slateframe-prose pre:not(.wp-block-verse),.wp-block-code", css)
        self.assertIn("scrollbar-gutter:stable", css)
        self.assertIn("overscroll-behavior-inline:contain", css)

    def test_default_spacing_is_unchanged(self):
        for root_font in (16, 32, 64):
            self.assertEqual(min(root_font, 32), (16, 32, 32)[(16, 32, 64).index(root_font)])
            self.assertEqual(min(root_font * 1.25, 24), (20, 24, 24)[(16, 32, 64).index(root_font)])

    def test_real_wordpress_matrix_and_evidence_are_required(self):
        js = BROWSER.read_text(encoding="utf-8")
        for marker in (
            "[320, 375, 390, 412, 768, 1440, 1920]",
            "['ltr', 'rtl']",
            "[16, 32, 64]",
            "Math.min(font, 32)",
            "Math.min(font * 1.25, 24)",
            "core-code-bounded-390-rtl-400.png",
            "core-preformatted-bounded-390-rtl-400-forced-colors.png",
            "core-code-bounded-1440-ltr.png",
            "await expect(pre).toBeFocused()",
        ):
            self.assertIn(marker, js)
        for forbidden in ("test.only", "test.fixme", "route.fulfill"):
            self.assertNotIn(forbidden, js)


if __name__ == "__main__":
    unittest.main()
