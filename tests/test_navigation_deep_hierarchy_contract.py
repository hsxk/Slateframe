"""Native WordPress menus must not silently discard third-level links."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DeepNavigationContract(unittest.TestCase):
    def test_configured_menu_keeps_all_core_walker_levels(self):
        header = (ROOT / 'header.php').read_text(encoding='utf-8')
        self.assertIn("'depth'          => 0,", header)
        self.assertNotIn("'depth'          => 2,", header)
        self.assertIn("'fallback_cb'    => 'slateframe_menu_fallback'", header)

    def test_desktop_nested_levels_have_logical_hierarchy_without_js(self):
        css = (ROOT / 'assets/css/navigation.css').read_text(encoding='utf-8')
        self.assertIn(':is(.sub-menu,.children) :is(.sub-menu,.children)', css)
        self.assertIn('padding-inline-start:var(--slateframe-component-gap)', css)
        self.assertIn('border-inline-start:var(--slateframe-rule)', css)
        self.assertLessEqual(len(css.encode('utf-8')), 4000)

    def test_real_browser_checks_keyboard_rtl_mobile_and_forced_colors(self):
        browser = (ROOT / 'tests/browser/navigation-deep-hierarchy.spec.js').read_text(encoding='utf-8')
        for token in ('320, 375, 390, 412, 768, 1440, 1920', "['ltr', 'rtl']",
                      "page.keyboard.press('Tab')", 'toBeFocused()',
                      'bounds.overflow', 'bounds.height',
                      "forcedColors: 'active'", 'navigation-deep-390-rtl-forced-colors.png'):
            with self.subTest(token=token):
                self.assertIn(token, browser)


if __name__ == '__main__':
    unittest.main()
