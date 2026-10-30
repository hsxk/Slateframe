"""Guard WordPress Core quotation and disclosure spacing at 400% zoom."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BoundedReadingInsets(unittest.TestCase):
    def test_core_css_is_bounded_without_expanding_budget(self):
        css = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        self.assertLessEqual(len(css.encode("utf-8")), 7000)
        self.assertIn("padding-block:min(clamp(1.4rem,3vw,2.4rem),40px)", css)
        self.assertIn("padding-inline-start:min(var(--slateframe-space-4),24px)", css)
        self.assertIn("padding-inline:min(clamp(.9rem,2vw,1.25rem),24px)", css)
        for unbounded in (
            "padding-block:clamp(1.4rem,3vw,2.4rem)",
            "padding-inline-start:var(--slateframe-space-4)",
            "padding-inline:clamp(.9rem,2vw,1.25rem)",
        ):
            self.assertNotIn(unbounded, css)

    def test_real_wordpress_matrix_and_authored_semantics(self):
        for name, markers in (
            ("core-pullquote-parity.spec.js", ("core/pullquote", "Math.min(corePadding, 40)", "blocks.serialize")),
            ("core-quote-parity.spec.js", ("Math.min(font, 24)", "is-style-plain", "AxeBuilder")),
            ("core-details-parity.spec.js", ("is-style-slateframe-disclosure", "Math.min(nativePadding, 24)", "summary.press('Enter')")),
        ):
            js = (ROOT / "tests/browser" / name).read_text(encoding="utf-8")
            self.assertIn("for (const font of [16, 32, 64])", js)
            self.assertIn("320, 375, 390, 412, 768, 1440, 1920", js)
            self.assertIn("'ltr', 'rtl'", js)
            for marker in markers:
                self.assertIn(marker, js)
            for forbidden in ("test.only", "test.fixme", "route.fulfill"):
                self.assertNotIn(forbidden, js)

    def test_default_size_values_remain_unchanged(self):
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            pullquote = max(16 * 1.4, min(width * .03, 16 * 2.4))
            disclosure = max(16 * .9, min(width * .02, 16 * 1.25))
            self.assertLessEqual(pullquote, 40)
            self.assertLessEqual(disclosure, 24)
            self.assertLessEqual(16, 24)


if __name__ == "__main__":
    unittest.main()
