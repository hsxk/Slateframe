"""Guard Core Media & Text parity without widening static asset budgets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreMediaTextParity(unittest.TestCase):
    def test_core_grid_shrink_is_shared_without_overriding_wordpress(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn(".wp-block-media-text>*{min-inline-size:0}", css)
        self.assertEqual(css.count(".wp-block-media-text>*{min-inline-size:0}"), 1)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertIn("*{box-sizing:border-box}", css)
        self.assertIn("scroll-behavior:auto !important", css)
        photo = (ROOT / "assets/css/photography.css").read_text(encoding="utf-8")
        self.assertNotIn("box-sizing:border-box", photo)
        self.assertNotIn("scroll-behavior:auto!important", photo)
        self.assertIn("img,svg,video{display:block;max-width:100%;height:auto}", css)
        self.assertIn("overflow-wrap: anywhere;", (ROOT / "assets/css/editor.css").read_text())
        self.assertIn(".slateframe-prose :is(figure,audio,iframe,embed,object,.wp-video,.mejs-container){max-width:100%}", (ROOT / "assets/css/reading.css").read_text())
        self.assertLessEqual((ROOT / "style.css").stat().st_size, 16000)

    def test_wordpress_browser_and_editor_evidence(self):
        spec = (ROOT / "tests/browser/core-media-text-parity.spec.js").read_text(encoding="utf-8")
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), spec)
        for needle in ("'ltr', 'rtl'", "fontSize = '200%'", "forcedColors: 'active'",
                       "AxeBuilder", "openAuthenticatedEditor", "blocks.parse(first)",
                       "core-media-text-390-rtl-200-forced-colors.png", "has-media-on-the-right",
                       "is-stacked-on-mobile", "wp('post', 'delete'"):
            self.assertIn(needle, spec)


if __name__ == "__main__":
    unittest.main()
