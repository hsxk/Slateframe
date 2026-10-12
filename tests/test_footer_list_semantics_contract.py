"""Preserve authored Core List semantics in footer widgets without losing menu targets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FooterListSemanticsContract(unittest.TestCase):
    def test_core_lists_and_nested_items_are_exempt_from_widget_reset(self):
        css = (ROOT / 'assets/css/footer.css').read_text(encoding='utf-8')
        self.assertIn('.slateframe-footer-widget :where(ul,ol):not(.wp-block-list,.wp-block-list *){margin:0;padding:0;list-style:none}', css)
        self.assertNotIn('.slateframe-footer-widget :where(ul,ol){margin:0;padding:0;list-style:none}', css)
        self.assertIn('.slateframe-footer-menu{display:flex', css)

    def test_footer_grid_alignment_has_no_redundant_item_overrides(self):
        css = (ROOT / 'assets/css/footer.css').read_text(encoding='utf-8')
        self.assertIn('.slateframe-footer-inner{display:grid;', css)
        self.assertIn('align-items:end;', css)
        self.assertIn('.slateframe-footer-inner{grid-template-columns:1fr;align-items:start}', css)
        self.assertNotIn('.slateframe-footer-nav{align-self:end}', css)
        self.assertNotIn('.slateframe-copyright{align-self:end', css)
        self.assertNotIn('.slateframe-footer-nav,.slateframe-copyright{align-self:start}', css)

    def test_no_runtime_budget_increase_beyond_existing_contract(self):
        assets = ('style.css', 'assets/css/navigation.css', 'assets/css/footer.css',
                  'assets/js/theme.js', 'assets/css/reading.css',
                  'assets/css/publishing.css', 'assets/css/forms.css',
                  'assets/css/comments.css', 'assets/css/form-content.css')
        self.assertLessEqual(sum((ROOT / name).stat().st_size for name in assets), 38000)

    def test_browser_covers_semantics_rtl_zoom_and_focus(self):
        spec = (ROOT / 'tests/browser/footer-list-semantics.spec.js').read_text(encoding='utf-8')
        for token in ('wp-block-list', 'wp-block-navigation__container', 'sub-menu', 'widget_archive', 'widget_categories',
                      '320', '375', '390', '412', '768', '1440', '1920',
                      'rtl', '200%', 'forcedColors', 'toBeFocused', 'scrollWidth', 'do_blocks'):
            self.assertIn(token, spec)


if __name__ == '__main__':
    unittest.main()
