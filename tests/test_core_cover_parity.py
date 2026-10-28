"""Guard Core Cover layout without replacing Gutenberg media and overlay logic."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreCoverParity(unittest.TestCase):
    def test_shared_frontend_editor_containment(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        selector = ".wp-block-cover__inner-container{min-inline-size:0}"
        self.assertEqual(css.count(selector), 1)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertIn("overflow-wrap:anywhere", (ROOT / "assets/css/reading.css").read_text(encoding="utf-8"))
        self.assertIn("overflow-wrap: anywhere;", (ROOT / "assets/css/editor.css").read_text(encoding="utf-8"))
        self.assertNotIn(".wp-block-cover__image-background{", css)
        self.assertLessEqual((ROOT / "style.css").stat().st_size, 16000)

    def test_real_wordpress_and_gutenberg_contract(self):
        spec = (ROOT / "tests/browser/core-cover-parity.spec.js").read_text(encoding="utf-8")
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), spec)
        for required in ("'ltr', 'rtl'", "for (const font of [16, 32, 64])", "setRootTextScale(page, font, dir)",
                         "data.rootFont", "data.control", "forcedColors: 'active'",
                         "AxeBuilder", "openAuthenticatedEditor", "blocks.parse(serialized)",
                         "objectPosition", "core-cover-390-rtl-200-forced-colors.png",
                         "core-cover-390-rtl-400-forced-colors.png",
                         "wp('post', 'delete'", "getComputedStyle(inner).minInlineSize"):
            self.assertIn(required, spec)


if __name__ == "__main__":
    unittest.main()
