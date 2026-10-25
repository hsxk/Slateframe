"""Contract for native Core Post Navigation links and conditional CSS."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CorePostNavigationTargets(unittest.TestCase):
    def test_native_registration_and_editor_parity(self):
        php = (ROOT / "functions.php").read_text()
        self.assertIn("'core/post-navigation-link',", php)
        self.assertIn("'handle' => 'slateframe-core-post-navigation'", php)
        self.assertIn("'assets/css/core-post-navigation.css'", php)
        self.assertIn("add_action( 'init', 'slateframe_register_core_post_navigation_styles', 20 );", php)
        self.assertIn("add_editor_style( array(", php)
        self.assertNotIn("render_block_core/post-navigation-link", php)

    def test_logical_targets_and_no_script_or_content_ownership(self):
        css = (ROOT / "assets/css/core-post-navigation.css").read_text()
        for token in (".wp-block-post-navigation-link", "min-inline-size:0",
                      "max-inline-size:100%", "min-inline-size:var(--slateframe-control)",
                      "min-block-size:var(--slateframe-control)",
                      "padding-block:var(--slateframe-control-padding-block)",
                      "overflow-wrap:anywhere", ".post-navigation-link__label",
                      ".post-navigation-link__title"):
            with self.subTest(token=token):
                self.assertIn(token, css)
        self.assertLessEqual(len(css.encode("utf-8")), 550)
        self.assertNotIn("!important", css)
        self.assertNotIn("javascript", css.lower())
        self.assertNotIn("direction:ltr", css)

    def test_real_wordpress_browser_contract(self):
        js = (ROOT / "tests/browser/core-post-navigation-targets.spec.js").read_text()
        for token in ("wp('post', 'create'", "wp('post', 'delete'", "finally",
                      "320, 375, 390, 412, 768, 1440, 1920", "'ltr', 'rtl'",
                      "16, 32, 64", "new AxeBuilder", "forcedColors",
                      "toBeFocused()", "core-post-navigation-", "await link.click()"):
            with self.subTest(token=token):
                self.assertIn(token, js)


if __name__ == "__main__":
    unittest.main()
