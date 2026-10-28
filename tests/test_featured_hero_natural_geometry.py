"""Guard uncropped Core editorial featured-media geometry and browser acceptance."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FeaturedHeroNaturalGeometry(unittest.TestCase):
    def test_intrinsic_geometry_and_runtime_budget(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn(
            ".slateframe-entry-hero-image{width:auto;max-height:78vh;margin:auto}",
            css,
        )
        self.assertIn("img,svg,video{display:block;max-width:100%;height:auto}", css)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertNotIn(
            ".slateframe-entry-hero-image{width:100%;max-height:78vh;object-fit:cover}",
            css,
        )
        self.assertLessEqual(len(css.encode("utf-8")), 15000)

    def test_real_wordpress_ratio_matrix_and_visual_evidence(self):
        browser = (ROOT / "tests/browser/core-post-featured-image-parity.spec.js").read_text(
            encoding="utf-8"
        )
        for token in (
            "const hero = page.locator('.slateframe-entry-hero-image')",
            "heroState.naturalRatio",
            "heroState.renderedRatio",
            "heroCaption.evaluate",
            "UnbrokenCaptionSegment",
            "entry-hero-natural-390-rtl-400-forced-colors.png",
            "entry-hero-natural-' + width + '-ltr.png",
            "320, 375, 390, 412, 768, 1440, 1920",
            "16, 32, 64",
        ):
            with self.subTest(token=token):
                self.assertIn(token, browser)
        self.assertNotIn("test.skip('hero", browser)


if __name__ == "__main__":
    unittest.main()
