"""Core Social Links retain 44px controls and Gutenberg semantics."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreSocialLinksContract(unittest.TestCase):
    def test_conditional_registration_and_editor_parity(self):
        php = (ROOT / "functions.php").read_text()
        self.assertIn("function slateframe_register_core_social_links_styles()", php)
        self.assertIn("'core/social-links'", php)
        self.assertIn("'assets/css/core-social-links.css'", php)
        self.assertIn("add_action( 'init', 'slateframe_register_core_social_links_styles', 20 );", php)

    def test_scoped_css_and_budget(self):
        css = (ROOT / "assets/css/core-social-links.css").read_text()
        self.assertLessEqual(len(css.encode()), 550)
        for term in ("min-inline-size:44px", "min-block-size:44px", "flex-wrap:wrap",
                     ":focus-visible", "forced-colors:active", "outline-color:Highlight"):
            self.assertIn(term, css)
        for forbidden in ("!important", "@import", "display:none", "svg{", "grid-template"):
            self.assertNotIn(forbidden, css)

    def test_browser_contract(self):
        js = (ROOT / "tests/browser/core-social-links-parity.spec.js").read_text()
        for term in ("[320, 375, 390, 412, 768, 1440, 1920]",
                     "['ltr', 'rtl']", "[16, 32, 64]", "setRootTextScale",
                     "forcedColors: 'active'", "AxeBuilder", "openAuthenticatedEditor",
                     "core-social-links-390-rtl-400-forced-colors.png",
                     "core/social-links", "core/social-link", "wp('post', 'delete'"):
            with self.subTest(term=term):
                self.assertIn(term, js)


if __name__ == "__main__":
    unittest.main()
