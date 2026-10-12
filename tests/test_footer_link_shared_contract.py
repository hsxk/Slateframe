"""Shared footer link targets retain geometry while avoiding duplicate CSS bytes."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FooterLinkSharedContract(unittest.TestCase):
    def test_widget_and_menu_targets_share_geometry_without_changing_display(self):
        css = (ROOT / 'assets/css/footer.css').read_text()
        shared = ':is(.slateframe-footer-widget,.slateframe-footer-menu) a{'
        self.assertEqual(css.count(shared), 1)
        common = css.split(shared, 1)[1].split('}', 1)[0]
        for declaration in (
            'align-items:center',
            'min-inline-size:var(--slateframe-control)',
            'min-block-size:var(--slateframe-control)',
            'max-inline-size:100%',
            'overflow-wrap:anywhere',
        ):
            with self.subTest(declaration=declaration):
                self.assertIn(declaration, common)
        self.assertIn('.slateframe-footer-widget a{display:inline-flex}', css)
        self.assertIn('.slateframe-footer-menu a{display:flex;color:var(--slateframe-text);text-decoration:none}', css)

    def test_existing_combined_runtime_budget_is_not_weakened(self):
        assets = (
            'style.css', 'assets/css/navigation.css', 'assets/css/footer.css',
            'assets/js/theme.js', 'assets/css/reading.css',
            'assets/css/publishing.css', 'assets/css/forms.css',
            'assets/css/comments.css', 'assets/css/form-content.css',
        )
        self.assertLessEqual(sum((ROOT / name).stat().st_size for name in assets), 38000)


if __name__ == '__main__':
    unittest.main()
