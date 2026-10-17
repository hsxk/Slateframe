"""Require decoded Core images before every full-page visual evidence capture."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / 'tests/browser/theme.spec.js'
APPEARANCE = ROOT / 'tests/browser/appearance.spec.js'
HELPER = ROOT / 'tests/browser/visual-evidence.js'


class PortfolioLazyVisualContract(unittest.TestCase):
    def test_portfolio_image_decode_gate(self):
        source = HELPER.read_text(encoding='utf-8')
        self.assertIn('async function settlePortfolioImagesForEvidence(page)', source)
        self.assertIn('.slateframe-project-grid .wp-block-post-featured-image img', source)
        self.assertIn('node.complete && node.naturalWidth > 0 && node.naturalHeight > 0', source)
        self.assertIn('await image.evaluate((node) => node.decode())', source)
        self.assertIn('await image.scrollIntoViewIfNeeded()', source)
        self.assertIn('await expect(image).toBeVisible()', source)
        self.assertIn("behavior: 'instant'", source)

    def test_capture_waits_before_full_page_screenshot(self):
        source = SPEC.read_text(encoding='utf-8')
        self.assertIn("require('./visual-evidence')", source)
        capture = source.index('viewport-320-text-resize-${name}.png')
        gate = source.rfind('await settlePortfolioImagesForEvidence(page)', 0, capture)
        self.assertGreaterEqual(gate, 0)
        self.assertLess(gate, capture)
        self.assertIn("if (name === 'portfolio')", source[gate - 90:gate])

    def test_appearance_portfolio_waits_before_full_page_screenshot(self):
        source = APPEARANCE.read_text(encoding='utf-8')
        capture = source.index('appearance-${profileName}-${testInfo.project.name}-${name}.png')
        gate = source.rfind('await settlePortfolioImagesForEvidence(page)', 0, capture)
        self.assertGreaterEqual(gate, 0)
        self.assertLess(gate, capture)
        self.assertIn("if (name === 'portfolio')", source[gate - 90:gate])

    def test_appearance_photography_waits_for_core_images(self):
        source = APPEARANCE.read_text(encoding='utf-8')
        helper = HELPER.read_text(encoding='utf-8')
        capture = source.index('appearance-${profileName}-${testInfo.project.name}-${name}.png')
        gate = source.rfind('await settlePhotographyImagesForEvidence(page)', 0, capture)
        self.assertGreaterEqual(gate, 0)
        self.assertIn("if (name === 'photography')", source[gate - 90:gate])
        self.assertIn("'#main-content .wp-block-image img', 5", helper)

    def test_lightbox_image_is_decoded_before_geometry_acceptance(self):
        source = APPEARANCE.read_text(encoding='utf-8')
        self.assertIn('await settleLightboxImageForEvidence(image);', source)
        gate = source.index('await settleLightboxImageForEvidence(image);')
        geometry = source.index('native lightbox animations must finish before visual evidence')
        self.assertLess(gate, geometry)


if __name__ == '__main__':
    unittest.main()
