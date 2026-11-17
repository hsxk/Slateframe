"""Guard nested CSS declaration boundaries after a lightbox regression."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NestedCssContract(unittest.TestCase):
    def test_photography_nested_declarations_have_separator(self):
        css = (ROOT / "assets/css/photography.css").read_text(encoding="utf-8")
        # Missing `;` before `&` invalidates the nested rules in Chromium,
        # causing Core lightbox close targets to fall back from 44px to 40px.
        self.assertNotRegex(css, r"var\([^()]*\)&\s*(?::is\(|[.#])")
        self.assertIn('color:var(--slateframe-text);& :is(', css)
        self.assertIn('background:var(--slateframe-media-chrome);& img{', css)

    def test_editor_scrollable_code_focus_contract(self):
        css = (ROOT / "assets/css/editor.css").read_text(encoding="utf-8")
        # The table and scrollable code blocks share the same focus contract.
        selector = ':is(.wp-block-table,.wp-block-code,.wp-block-preformatted):focus-within'
        self.assertIn('& ' + selector + '{outline:var(--slateframe-focus-width) solid var(--slateframe-focus);outline-offset:var(--slateframe-focus-offset)}', css)
        self.assertIn('@media(forced-colors:active){& ' + selector + '{outline-color:Highlight}}', css)
        self.assertIn('scrollbar-gutter:stable;overscroll-behavior-inline:contain', css)

    def test_highest_combined_asset_budgets_remain_strict(self):
        size = lambda name: (ROOT / name).stat().st_size
        base = sum(size(name) for name in (
            'style.css', 'assets/css/navigation.css',
            'assets/css/footer.css', 'assets/js/theme.js',
        ))
        publishing = base + size('assets/css/reading.css') + size('assets/css/publishing.css')
        discussion = publishing + size('assets/css/forms.css') + size('assets/css/comments.css')
        self.assertLessEqual(discussion + size('assets/css/form-content.css'), 38000)
        self.assertLessEqual(discussion + size('assets/css/photography.css'), 43000)


if __name__ == '__main__':
    unittest.main()
