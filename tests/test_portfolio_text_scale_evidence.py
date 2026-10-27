"""Guard real 200%/400% computed text-size evidence across Portfolio suites."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1] / 'tests' / 'browser'


class PortfolioTextScaleEvidence(unittest.TestCase):
    def source(self, filename):
        return (ROOT / filename).read_text(encoding='utf-8')

    def test_keyboard_uses_computed_200_percent_not_percentage_declaration(self):
        source = self.source('portfolio-keyboard.spec.js')
        self.assertIn("style.setProperty('font-size', '32px', 'important')", source)
        self.assertIn('Portfolio keyboard actual 200%', source)
        self.assertIn('toBe(32)', source)
        self.assertNotIn("style.fontSize = '200%'", source)

    def test_positive_core_query_loop_proves_200_percent_in_both_directions(self):
        source = self.source('portfolio-positive-results.spec.js')
        self.assertIn("node.style.setProperty('font-size', '32px', 'important')", source)
        self.assertIn('positive Query Loop actual 200%', source)
        self.assertIn("for (const direction of ['ltr', 'rtl'])", source)
        self.assertNotIn("node.style.fontSize = '200%'", source)

    def test_pagination_checks_every_computed_size_and_forced_colors(self):
        source = self.source('portfolio-pagination-controls.spec.js')
        self.assertIn("node.style.setProperty('font-size', value.font + 'px', 'important')", source)
        self.assertIn('actual computed text scale', source)
        self.assertIn('toBeCloseTo(font, 1)', source)
        self.assertIn('A declaration is not proof of a settled user-scale layout.', source)
        self.assertIn('toBe(font)', source)
        self.assertIn("font === 64", source)
        self.assertIn("forcedColors: 'active'", source)
        self.assertIn("node.style.removeProperty('font-size')", source)
        self.assertNotIn('node.style.fontSize =', source)


if __name__ == '__main__':
    unittest.main()
