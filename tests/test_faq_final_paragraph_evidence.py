"""Protect full-text evidence when Gutenberg's inner canvas clips an element screenshot."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tests/browser/knowledge-faq-editor.spec.js'


class FaqFinalParagraphEvidence(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.read_text(encoding='utf-8')

    def test_real_last_paragraph_is_scrolled_into_view(self):
        self.assertIn("faq.locator('p').last()", self.source)
        self.assertIn('await expect(closingParagraph).toHaveText(expectedClosingText)', self.source)
        self.assertIn("parsed.querySelector('.slateframe-knowledge-faq > p:last-child')", self.source)
        self.assertNotIn("toContainText('Keep answers specific')", self.source)
        self.assertIn('await closingParagraph.scrollIntoViewIfNeeded()', self.source)
        self.assertIn('gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png', self.source)

    def test_text_fragments_and_clipping_ancestors_are_checked(self):
        for needle in ('range.selectNodeContents(node)', 'range.getClientRects()',
                       'style.overflowY', 'expect(closingGeometry.outside).toBe(false)',
                       'expect(closingGeometry.outsideFrame).toBe(false)',
                       'expect(closingGeometry.clippedByAncestor).toEqual([])'):
            with self.subTest(needle=needle):
                self.assertIn(needle, self.source)

    def test_no_weakened_existing_checks(self):
        self.assertIn(' expect(zoomBounds.clipped).toEqual([]);', self.source)
        self.assertIn(" await faq.screenshot({ path: 'test-artifacts/screenshots/gutenberg-knowledge-faq-390-rtl-200-forced-colors.png' });", self.source)
        self.assertIn("test.skip(info.project.use.viewport?.width !== 390", self.source)


if __name__ == '__main__':
    unittest.main()
