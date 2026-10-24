"""Full-page Photography screenshots must settle lazy Core media before capture."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1] / "tests/browser"

class PhotographyLazyScreenshotContract(unittest.TestCase):
    def test_raster_fullpage_settles_every_image(self):
        text = (ROOT / "photography-raster-lightbox.spec.js").read_text()
        self.assertIn("await settlePhotographyImagesForEvidence(page);", text)
        self.assertLess(text.index("await settlePhotographyImagesForEvidence(page);"), text.index("photography-page-${testInfo.project.name}.png"))

    def test_native_fullpage_settles_every_image(self):
        text = (ROOT / "photography-native-sequence.spec.js").read_text()
        self.assertIn("await settlePhotographyImagesForEvidence(page);", text)

    def test_class_only_and_zoom_settle_all_core_images(self):
        for name in ("photography-class-only.spec.js", "photography-zoom-caption.spec.js"):
            with self.subTest(name=name):
                self.assertIn("await settleImagesForEvidence(page, '#main-content .wp-block-image img', 2);", (ROOT / name).read_text())

    def test_shared_helper_keeps_real_decode_and_scroll_restore(self):
        text = (ROOT / "visual-evidence.js").read_text()
        self.assertIn("await image.scrollIntoViewIfNeeded()", text)
        self.assertIn("await image.evaluate((node) => node.decode())", text)
        self.assertIn("Math.max(Math.abs(window.scrollX), Math.abs(window.scrollY))", text)

if __name__ == '__main__':
    unittest.main()
