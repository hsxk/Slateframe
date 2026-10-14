"""Reject CSS custom-property arithmetic that fails at computed-value time."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS_FILES = (ROOT / "style.css", *(ROOT / "assets/css").glob("*.css"))


class SpatialCalcContract(unittest.TestCase):
    def test_custom_property_arithmetic_has_required_whitespace(self):
        for path in CSS_FILES:
            css = path.read_text(encoding="utf-8")
            for match in re.finditer(r"var\(--[\w-]+\)\s*[+-]\s*var\(--[\w-]+\)", css):
                with self.subTest(file=path.name, expression=match.group()):
                    self.assertRegex(match.group(), r"\) [+-] var\(")

    def test_hero_and_pagination_use_valid_spatial_sums(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        doubled = "calc(var(--slateframe-stack-gap)*2)"
        self.assertIn(".slateframe-entry-hero{margin-block-end:clamp(" + doubled + ",5vw,", css)
        self.assertIn(".slateframe-pagination{margin-block:" + doubled + " var(--slateframe-section)", css)

    def test_heading_anchor_offset_uses_valid_spatial_sum(self):
        css = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        self.assertIn("scroll-margin-block-start:calc(var(--slateframe-header-height) + var(--slateframe-stack-gap))", css)


if __name__ == "__main__":
    unittest.main()
