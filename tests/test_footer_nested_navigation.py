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
        self.assertIn(".slateframe-footer-menu .sub-menu{list-style:none;margin:0;padding-inline-start:1em}", css)
        self.assertIn(".slateframe-footer-menu li{min-inline-size:0}", css)
        self.assertNotIn(".slateframe-footer-menu .sub-menu{display:none", css)
        self.assertLessEqual(len(css.encode()), 2000)

if __name__ == "__main__":
    unittest.main()
