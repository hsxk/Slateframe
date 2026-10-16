"""Core File's filename and download controls share bounded interaction geometry."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreFileLinkContract(unittest.TestCase):
    def test_filename_link_is_bounded_in_frontend_and_editor(self):
        css = (ROOT / 'style.css').read_text()
        selector = ':is(.slateframe-prose,.editor-styles-wrapper) .wp-block-file>a:first-of-type'
        self.assertEqual(css.count(selector), 1)
        self.assertNotIn('.wp-block-file>a:first-child', css)
        rule = css.split(selector + '{', 1)[1].split('}', 1)[0]
        for property_value in (
            'display:inline-flex',
            'align-items:center',
            'min-block-size:var(--slateframe-control)',
            'max-inline-size:100%',
        ):
            with self.subTest(property_value=property_value):
                self.assertIn(property_value, rule)

    def test_inherited_filename_wrapping_is_checked_in_real_browser(self):
        css = (ROOT / 'style.css').read_text(encoding='utf-8')
        browser = (ROOT / 'tests/browser/core-file-verse.spec.js').read_text(encoding='utf-8')
        self.assertIn('overflow-wrap:anywhere;text-rendering:optimizeLegibility}', css)
        self.assertIn('filenameOverflowWrap', browser)
        self.assertIn("expect(m.filenameOverflowWrap).toBe('anywhere')", browser)

    def test_real_browser_regression_covers_widths_and_keyboard(self):
        source = (ROOT / 'tests/browser/core-file-verse.spec.js').read_text()
        for needle in (
            '[320, 375, 390, 412, 768, 1440, 1920]',
            "['ltr', 'rtl']",
            'page.keyboard.press',
            "forcedColors: 'active'",
            'filename.height',
            "toHaveAttribute('download', 'reference.pdf')",
            "page.addStyleTag({ path: 'rtl.css' })",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, source)


    def test_pdf_preview_regression_places_object_before_filename(self):
        source = (ROOT / 'tests/browser/core-file-preview.spec.js').read_text()
        for needle in (
            '[320, 375, 390, 412, 768, 1440, 1920]',
            "['ltr', 'rtl']", 'page.keyboard.press', "forcedColors: 'active'",
            "document.createElement('object')", 'file.append(preview, filename, download)',
            'filename.height', "toHaveAttribute('download', 'preview.pdf')",
            "page.addStyleTag({ path: 'rtl.css' })",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, source)


if __name__ == '__main__':
    unittest.main()
