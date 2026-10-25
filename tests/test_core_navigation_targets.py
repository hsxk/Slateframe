"""Guard native WordPress Navigation touch targets without global CSS growth."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreNavigationTargets(unittest.TestCase):
    def test_conditional_core_block_asset_and_editor_parity(self):
        source = (ROOT / "functions.php").read_text()
        self.assertIn("'core/navigation',", source)
        self.assertIn("'handle' => 'slateframe-core-navigation'", source)
        self.assertIn("'assets/css/core-navigation.css'", source)
        self.assertIn("'assets/css/core-navigation.css',", source)
        self.assertIn("add_action( 'init', 'slateframe_register_core_navigation_styles', 20 );", source)

    def test_bounded_logical_targets_without_extra_runtime_js(self):
        css = (ROOT / "assets/css/core-navigation.css").read_text()
        for token in (".wp-block-navigation", ".wp-block-navigation-item__content",
                      ".wp-block-navigation__responsive-container-open",
                      ".wp-block-navigation__responsive-container-close",
                      ".wp-block-navigation-overlay-close",
                      ".wp-block-navigation-submenu__toggle",
                      "min-inline-size:var(--slateframe-control)",
                      "min-block-size:var(--slateframe-control)",
                      "overflow-wrap:anywhere", "min-inline-size:0"):
            with self.subTest(token=token):
                self.assertIn(token, css)
        self.assertIn(".wp-block-navigation__container{min-inline-size:0;max-inline-size:100%}", css)
        self.assertIn(".wp-block-navigation-item__label{overflow-wrap:anywhere}", css)
        self.assertIn("align-items:center;justify-content:center", css)
        self.assertNotIn("display:inline-grid", css)
        self.assertNotIn(".disable-default-overlay", css)
        self.assertLessEqual(len(css.encode("utf-8")), 850)
        self.assertNotIn(".slateframe-primary-nav", css)
        self.assertNotIn("javascript", css.lower())

    def test_real_wordpress_browser_coverage(self):
        browser = (ROOT / "tests/browser/core-navigation-targets.spec.js").read_text()
        for contract in ("getAnimations()", "overlaySurface.background", "animations: 'disabled'", "overlayBox"):
            self.assertIn(contract, browser)
        for contract in ('"overlayMenu":"mobile"', "mobileOpen", "toBeHidden()", "core-navigation-desktop-no-opener"):
            self.assertIn(contract, browser)
        for value in ("320", "375", "390", "412", "768", "1440", "1920",
                      "rtl", "ltr", "64", "AxeBuilder", "forcedColors", "overlay"):
            with self.subTest(value=value):
                self.assertIn(value, browser)


if __name__ == "__main__":
    unittest.main()
