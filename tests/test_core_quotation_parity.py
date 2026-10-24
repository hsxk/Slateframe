"""Protect native Core Quote/Pullquote presentation and real browser evidence."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreQuotationParity(unittest.TestCase):
    def test_core_first_presentation(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        reading = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        self.assertIn(".wp-block-quote.is-style-slateframe-note", css)
        self.assertIn("border-inline-start:3px solid var(--slateframe-accent)", css)
        self.assertIn(".wp-block-pullquote", reading)
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertLessEqual((ROOT / "style.css").stat().st_size, 16000)

    def test_native_translatable_editorial_pattern(self):
        pattern = (ROOT / 'patterns/editorial-pullquote.php').read_text(encoding='utf-8')
        self.assertIn('Slug: slateframe/editorial-pullquote', pattern)
        self.assertIn('<!-- wp:pullquote -->', pattern)
        self.assertIn('esc_html_x(', pattern)
        self.assertIn("'slateframe'", pattern)
        self.assertNotIn('<!-- wp:html', pattern.lower())
        self.assertNotIn('<img', pattern.lower())

    def test_wordpress_chromium_and_gutenberg_contract(self):
        spec = (ROOT / "tests/browser/core-quotation-parity.spec.js").read_text(encoding="utf-8")
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            self.assertIn(str(width), spec)
        for required in ("'ltr', 'rtl'", "fontSize = '200%'", "fontSize = '400%'", "forcedColors: 'active'",
                         "AxeBuilder", "keyboard.press('Tab')", "openAuthenticatedEditor", "blocks.parse(serialized)",
                         "core-quotations-390-rtl-200-forced-colors.png", "editorial-pullquote-", "core/quote",
                         "core/pullquote", "wp('post', 'delete'", "document.documentElement.scrollWidth"):
            self.assertIn(required, spec)
        self.assertIn("blocks.createBlock('core/quote', { value:", spec)
        self.assertNotIn("blocks.createBlock('core/quote', {}, [", spec)


if __name__ == "__main__":
    unittest.main()
