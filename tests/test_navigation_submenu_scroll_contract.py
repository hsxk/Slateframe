"""Contract for bounded native desktop submenus without new runtime JS."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
NAV = ROOT / 'assets/css/navigation.css'
STYLE = ROOT / 'style.css'

class NavigationSubmenuScrollContract(unittest.TestCase):
    def test_desktop_submenu_is_bounded_and_scrollable(self):
        css = NAV.read_text()
        self.assertIn('max-block-size:70dvh;overflow:auto;', css)
        self.assertIn('inset-inline-end:0;', css)
        self.assertIn('menu-item-has-children', css)
        self.assertIn(':focus-within', css)

    def test_compact_menu_retains_independent_scroll(self):
        css = NAV.read_text()
        self.assertIn('max-block-size:min(70dvh,calc(100dvh', css)
        self.assertIn('overscroll-behavior:contain', css)

    def test_no_new_runtime_script_or_asset_budget_increase(self):
        css = NAV.read_bytes()
        self.assertLessEqual(len(css), 4000)
        self.assertLessEqual(len(STYLE.read_bytes()), 16000)
        required = ['style.css', 'assets/css/navigation.css', 'assets/css/footer.css',
                    'assets/js/theme.js', 'assets/css/reading.css', 'assets/css/publishing.css',
                    'assets/css/photography.css', 'assets/css/forms.css', 'assets/css/comments.css']
        total = sum((ROOT / path).stat().st_size for path in required)
        self.assertLessEqual(total, 43000)

if __name__ == '__main__':
    unittest.main()
