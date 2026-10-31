"""Footer menu retains native Core hierarchy and logical RTL spacing."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class FooterNestedNavigation(unittest.TestCase):
    def test_core_menu_walker_is_not_limited_to_top_level(self):
        footer = (ROOT / "footer.php").read_text()
        self.assertIn("'theme_location' => 'footer'", footer)
        self.assertIn("'depth'          => 0", footer)
        self.assertIn("'fallback_cb'    => false", footer)
        self.assertIn("wp_nav_menu(", footer)
        self.assertNotIn("Walker_", footer)

    def test_nested_lists_remain_visible_and_use_logical_spacing(self):
        css = (ROOT / "assets/css/footer.css").read_text()
        self.assertIn(".slateframe-footer-menu{display:flex", css)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertIn("min-block-size:var(--slateframe-control)", css)
        self.assertNotIn(".slateframe-footer-menu .sub-menu{display:none", css)
        # No added runtime CSS: preserve the pre-existing 1,865-byte footer budget.
        self.assertLessEqual(len(css.encode()), 1865)

    def test_browser_and_workflow_require_exact_visual_evidence(self):
        browser = (ROOT / "tests/browser/footer-nested-core-menu.spec.js").read_text()
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        for name in ("footer-nested-390-rtl-400.png",
                     "footer-nested-390-rtl-400-forced-colors.png",
                     "footer-nested-1440-ltr.png"):
            self.assertIn(name, browser)
            self.assertIn(name, workflow)
        self.assertIn("new AxeBuilder", browser)
        self.assertIn("wp('menu', 'create'", browser)
        self.assertIn("wp('menu', 'delete'", browser)
        # Browser evidence must come from the actual footer template, not a
        # separately hand-configured wp_nav_menu() call that can mask a bug.
        self.assertIn('theme_mod_nav_menu_locations', browser)
        self.assertIn('include get_stylesheet_directory() . "/footer.php"', browser)
        self.assertIn('new DOMParser()', browser)
        self.assertNotIn('echo wp_nav_menu(array(', browser)

if __name__ == "__main__":
    unittest.main()
