"""Guard native Core Social Links geometry, palette ownership and real browser evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreSocialLinksParity(unittest.TestCase):
    def test_only_geometry_not_native_colors_or_shapes(self):
        css = (ROOT / "assets/css/footer.css").read_text(encoding="utf-8")
        selector = ":is(.slateframe-footer-widget,.slateframe-footer-menu,.wp-social-link) a{"
        self.assertEqual(css.count(selector), 1)
        rule = css.split(selector, 1)[1].split("}", 1)[0]
        for token in ("min-inline-size:var(--slateframe-control)",
                      "min-block-size:var(--slateframe-control)",
                      "max-inline-size:100%", "overflow-wrap:anywhere"):
            self.assertIn(token, rule)
        for forbidden in ("background:", "color:", "!important", "width:44px"):
            self.assertNotIn(forbidden, rule)
        self.assertLessEqual(len(css.encode("utf-8")), 2000)
        self.assertLessEqual((ROOT / "style.css").stat().st_size, 16000)

    def test_editor_reuses_global_core_rules(self):
        source = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("add_editor_style( array( 'style.css', 'assets/css/footer.css'", source)
        self.assertNotIn("wp-block-social-links",
                         (ROOT / "assets/css/editor.css").read_text(encoding="utf-8"))

    def test_wordpress_chromium_a11y_and_gutenberg_contract(self):
        source = (ROOT / "tests/browser/core-social-links-parity.spec.js").read_text(encoding="utf-8")
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), source)
        for token in ("wp('post', 'create'", "wp('post','delete',id,'--force')",
                      "core/social-links", "core/social-link", "is-style-logos-only",
                      "has-icon-background-color", "toHaveAccessibleName",
                      "toBeGreaterThanOrEqual(44)", "['ltr','rtl']",
                      "fontSize='200%'", "fontSize='400%'",
                      "core-social-links-390-rtl-400-forced-colors.png",
                      "core-social-links-390-ltr-400.png", "largeAxe",
                      "keyboard.press('Tab')", "forcedColors:'active'",
                      "AxeBuilder", "core-social-links-390-rtl-200-forced-colors.png",
                      "openAuthenticatedEditor", "blocks.parse(first)",
                      "expect(c.valid).toBe(true)"):
            with self.subTest(token=token):
                self.assertIn(token, source)


if __name__ == "__main__":
    unittest.main()
