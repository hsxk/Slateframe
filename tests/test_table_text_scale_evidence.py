"""Real WordPress text-scale acceptance must verify computed 16/32/64px, not CSS declarations."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TableTextScaleEvidence(unittest.TestCase):
    def test_shared_browser_helper_waits_for_actual_root_style(self):
        helper = (ROOT / "tests/browser/support/root-text-scale.js").read_text(encoding="utf-8")
        for token in ("requestAnimationFrame", "expect.poll", "getComputedStyle(root).fontSize",
                      "getPropertyPriority('font-size')", "setProperty('font-size'",
                      "'important'", "computed: pixels", "direction"):
            self.assertIn(token, helper)
        for bad in ("waitForTimeout", "test.skip", "test.fixme"):
            self.assertNotIn(bad, helper)

    def test_all_three_table_suites_assert_real_zoom(self):
        paths = (
            "tests/browser/core-table-parity.spec.js",
            "tests/browser/data-table-numeric-parity.spec.js",
            "tests/browser/plain-table-keyboard.spec.js",
        )
        for path in paths:
            with self.subTest(path=path):
                js = (ROOT / path).read_text(encoding="utf-8")
                self.assertIn("require('./support/root-text-scale')", js)
                self.assertIn("setRootTextScale(page, 32", js)
                self.assertIn("setRootTextScale(page, 64", js)
                self.assertNotIn("style.fontSize = '200%'", js)
                self.assertNotIn("style.fontSize = '400%'", js)
        core = (ROOT / paths[0]).read_text(encoding="utf-8")
        self.assertIn("setRootTextScale(page, font, dir)", core)
        self.assertIn("core-table-390-rtl-400-forced-colors.png", core)
        data = (ROOT / paths[1]).read_text(encoding="utf-8")
        self.assertIn("core-data-table-390-rtl-400-forced-colors.png", data)
        plain = (ROOT / paths[2]).read_text(encoding="utf-8")
        self.assertIn("plain-table-320-rtl-400-forced-colors.png", plain)

    def test_exact_visual_inventory_is_a_required_ci_gate(self):
        ci = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in ("core-table-390-${direction}-400.png",
                      "core-data-table-390-${direction}-400.png",
                      "core-table-390-rtl-400-forced-colors.png",
                      "core-data-table-390-rtl-400-forced-colors.png",
                      "plain-table-320-rtl-400-forced-colors.png"):
            self.assertIn(token, ci)
        self.assertIn("test -s", ci)
        self.assertIn("setRootTextScale(page, pixels, dir)",
                      (ROOT / "tests/browser/data-table-numeric-parity.spec.js").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
