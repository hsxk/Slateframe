"""Guard Core Lightbox presentation and executed CI evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / 'assets/css/photography.css').read_text()
TEST = (ROOT / 'tests/browser/lightbox-rtl-safe-area.spec.js').read_text()
WORKFLOW = (ROOT / '.github/workflows/photography.yml').read_text()
COVERAGE = (ROOT / 'tests/verify_gallery_ci_results.py').read_text()
EVIDENCE = (ROOT / 'tests/verify_gallery_screenshots.py').read_text()


class NativeLightboxContract(unittest.TestCase):
    def test_rtl_reanchors_without_double_counting_safe_area(self):
        self.assertIn('.wp-lightbox-overlay:dir(rtl) .wp-lightbox-close-button', CSS)
        self.assertIn('right:auto;left:calc(env(safe-area-inset-left,0px)', CSS)
        self.assertIn('margin-inline-end:0', CSS)
        self.assertIn('margin-block-start:var(--slateframe-component-gap)', CSS)
        self.assertNotIn('margin-block-start:max(', CSS)

    def test_mobile_navigation_preserves_core_desktop_breakpoint(self):
        self.assertIn('@media(max-width:959.98px)', CSS)
        self.assertIn('bottom:calc(var(--slateframe-space-4) + env(safe-area-inset-bottom,0px))', CSS)
        self.assertIn('page.setViewportSize({ width:w, height:800 })', TEST)
        self.assertIn("for (const direction of ['ltr', 'rtl'])", TEST)

    def test_gallery_rule_reuses_existing_selector_and_budget(self):
        self.assertIn('gap:var(--slateframe-media-gap);& .wp-block-image img{', CSS)
        self.assertLessEqual(len(CSS.encode('utf-8')), 6000)

    def test_keyboard_and_target_size_are_covered(self):
        self.assertIn('browser-raster-gallery', TEST)
        self.assertIn('toHaveCount(2)', TEST)
        self.assertIn('toBeGreaterThanOrEqual(44)', TEST)
        self.assertIn("page.keyboard.press('Escape')", TEST)
        self.assertIn('toBeFocused()', TEST)

    def test_ci_requires_real_tests_and_screenshots(self):
        self.assertIn('tests/browser/lightbox-rtl-safe-area.spec.js', WORKFLOW)
        self.assertIn('native Core navigation preserves its 959px/960px breakpoint', COVERAGE)
        self.assertIn('lightbox-navigation-breakpoint-', EVIDENCE)
        self.assertIn('lightbox-rtl-close-viewport-', EVIDENCE)


if __name__ == '__main__':
    unittest.main()
