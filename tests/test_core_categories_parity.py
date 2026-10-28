"""Native Core Categories list, hierarchy and dropdown contract."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreCategoriesParity(unittest.TestCase):
    def test_conditional_style_editor_and_budget(self):
        php = (ROOT / 'functions.php').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/core-categories.css').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for needle in ("function slateframe_register_core_categories_styles()",
                       "'core/categories',", "'handle' => 'slateframe-core-categories'",
                       "'assets/css/core-categories.css'",
                       "add_action( 'init', 'slateframe_register_core_categories_styles', 20 );"):
            self.assertIn(needle, php)
        for needle in ('.wp-block-categories', '.wp-block-categories-dropdown select',
                       'min-inline-size:0', 'max-inline-size:100%',
                       'min-inline-size:min(100%,var(--slateframe-control))',
                       'min-block-size:var(--slateframe-control)', 'overflow-wrap:anywhere'):
            self.assertIn(needle, css)
        self.assertIn('assets/css/core-categories.css', workflow)
        self.assertIn('test $(wc -c < assets/css/core-categories.css) -le 550', workflow)
        self.assertLessEqual(len(css.encode('utf-8')), 550)
        for forbidden in ('!important', 'javascript', 'time2log_', 'wpcode_', 'direction:ltr'):
            self.assertNotIn(forbidden, css)
        self.assertNotIn('render_block_core/categories', php)

    def test_real_wordpress_editor_and_visual_evidence(self):
        js = (ROOT / 'tests/browser/core-categories-parity.spec.js').read_text(encoding='utf-8')
        for needle in ("wp('term', 'create'", "wp('term', 'delete'", "wp('post', 'create'",
                       "wp('post', 'delete'", 'finally', 'showHierarchy', 'showPostCounts',
                       'displayAsDropdown', 'get_category_link', 'ul.children',
                       "const assignedSlug = index === 0 ? slug : slug + '-child'",
                       'expect(actual.filter(url => expected.includes(url))).toHaveLength(2)',
                       "'category_name'", "select.selectOption(slug + '-child')",
                       '320, 375, 390, 412, 768, 1440, 1920', "'ltr', 'rtl'",
                       "setRootTextScale(page, font, dir)", "setRootTextScale(page, 64, 'rtl')",
                       "for (const font of [16, 32, 64])", "state.rootFont",
                       "forcedColors: 'active'", 'new AxeBuilder', "page.keyboard.press('Tab')",
                       'core-categories-390-rtl-200-forced-colors.png',
                       'core-categories-390-rtl-400-forced-colors.png',
                       'await select.scrollIntoViewIfNeeded()', 'toBeInViewport()',
                       "'sidebars_widgets'", "'footer-content'", 'originalSidebars',
                       'page.reload',
                       'openAuthenticatedEditor', 'blocks.serialize', 'blocks.parse',
                       'fullPage: true', "page.goto('/?p=999999999'"):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)


if __name__ == '__main__':
    unittest.main()
