"""Require decoded Portfolio images before full-page visual evidence capture."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "tests/browser/theme.spec.js"


class PortfolioLazyVisualContract(unittest.TestCase):
    def test_portfolio_image_decode_gate(self):
        source = SPEC.read_text(encoding="utf-8")
        self.assertIn("async function settlePortfolioImagesForEvidence(page)", source)
        self.assertIn(".slateframe-project-grid .wp-block-post-featured-image img", source)
        self.assertIn("node.complete && node.naturalWidth > 0", source)
        self.assertIn("await image.evaluate((node) => node.decode())", source)
        self.assertIn("await image.scrollIntoViewIfNeeded()", source)

    def test_capture_waits_before_full_page_screenshot(self):
        source = SPEC.read_text(encoding="utf-8")
        capture = source.index("viewport-320-text-resize-${name}.png")
        gate = source.rfind("await settlePortfolioImagesForEvidence(page)", 0, capture)
        self.assertGreaterEqual(gate, 0)
        self.assertLess(gate, capture)
        self.assertIn("if (name === 'portfolio')", source[gate - 90:gate])


if __name__ == "__main__":
    unittest.main()
