"""Require real computed 400% WordPress Search fallback evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreSearchExtraZoomContract(unittest.TestCase):
    def test_real_computed_scale_and_keyboard_targets(self):
        js = (ROOT / "tests/browser/core-search-additional-variants.spec.js").read_text(encoding="utf-8")
        for token in ("setRootTextScale(page, font, direction)",
                      "setRootTextScale(page, 64, 'rtl')",
                      "core-search-extra-390-' + direction + '-400.png",
                      "forcedColors: 'active'", "toBeFocused()",
                      "toHaveAccessibleName('Search articles')",
                      "metrics.height", "metrics.overflow"):
            with self.subTest(token=token):
                self.assertIn(token, js)
        self.assertNotIn("node.style.fontSize", js)
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for name in ("core-query-no-results-390-ltr-400.png",
                     "core-query-no-results-390-rtl-400.png",
                     "core-query-no-results-390-rtl-400-forced-colors.png",
                     "core-search-extra-390-ltr-400.png",
                     "core-search-extra-390-rtl-400.png"):
            self.assertIn(name, ci)


if __name__ == "__main__":
    unittest.main()
