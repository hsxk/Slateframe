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
        self.assertIn('.current-menu-ancestor,.current_page_ancestor', css)
        self.assertIn('.slateframe-primary-nav ul{margin:0;padding:0;list-style:none}', css)
        self.assertNotIn('.slateframe-primary-nav ul,.slateframe-menu-fallback{', css)
        self.assertIn('&>ul{display:grid}', css)
        self.assertNotIn('&>ul,& .slateframe-menu-fallback{display:grid}', css)

    def test_real_browser_checks_keyboard_rtl_mobile_and_forced_colors(self):
        browser = (ROOT / 'tests/browser/navigation-deep-hierarchy.spec.js').read_text(encoding='utf-8')
        for token in ('320, 375, 390, 412, 768, 1440, 1920', "['ltr', 'rtl']",
                      "page.keyboard.press('Tab')", 'toBeFocused()',
                      'bounds.overflow', 'bounds.height',
                      "forcedColors: 'active'", 'navigation-deep-390-rtl-forced-colors.png'):
            with self.subTest(token=token):
                self.assertIn(token, browser)


    def test_real_core_walker_fixture_is_disposable_and_accessible(self):
        browser = (ROOT / 'tests/browser/navigation-deep-hierarchy.spec.js').read_text(encoding='utf-8')
        for token in ("execFileSync('wp'", "'--path=/tmp/wp-browser'",
                      "wp('menu', 'create'", "wp('menu', 'item', 'add-custom'",
                      "'--parent-id=' + research", "'--parent-id=' + archive",
                      "wp('eval', 'echo wp_nav_menu(", '"depth" => 0',
                      "wp('menu', 'delete', menuId)", 'new AxeBuilder({ page })',
                      "expect(a11y.violations).toEqual([])",
                      "classList.add('current-menu-ancestor')",
                      "classList.add('current_page_ancestor')",
                      "toHaveCSS('text-decoration-line', /underline/)"):
            with self.subTest(token=token):
                self.assertIn(token, browser)
        self.assertNotIn('node.innerHTML = '+ '\x60<ul', browser)
        self.assertIn("One isolated Core menu fixture covers all widths.", browser)


if __name__ == '__main__':
    unittest.main()
