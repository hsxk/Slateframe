"""The Gutenberg FAQ visual assertion must use localized registered pattern text."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
EDITOR = ROOT / 'tests/browser/knowledge-faq-editor.spec.js'
PATTERN = ROOT / 'patterns/knowledge-faq.php'


class FaqEditorLocalizedCopy(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.editor = EDITOR.read_text(encoding='utf-8')
        cls.pattern = PATTERN.read_text(encoding='utf-8')

    def test_source_is_registered_localized_pattern(self):
        self.assertIn("WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')", self.editor)
        self.assertIn("new DOMParser().parseFromString(markup, 'text/html')", self.editor)
        self.assertIn("parsed.querySelector('.slateframe-knowledge-faq > p:last-child')", self.editor)
        self.assertIn('}, blocks)', self.editor)

    def test_actual_editor_copy_must_equal_registered_copy(self):
        self.assertIn("expect(expectedClosingText).not.toBe('')", self.editor)
        self.assertIn('await expect(closingParagraph).toHaveText(expectedClosingText)', self.editor)
        self.assertNotIn("toContainText('Keep answers specific')", self.editor)

    def test_translation_remains_core_first(self):
        self.assertIn("esc_html_x( 'Keep answers specific", self.pattern)
        self.assertIn("'Pattern content', 'slateframe'", self.pattern)
        self.assertNotIn('wp_set_script_translations', self.editor)

    def test_geometry_and_screenshot_gates_are_not_weakened(self):
        for marker in ('await closingParagraph.scrollIntoViewIfNeeded()',
                       'expect(closingGeometry.lines).toBeGreaterThan(1)',
                       'expect(closingGeometry.outsideFrame).toBe(false)',
                       'expect(closingGeometry.clippedByAncestor).toEqual([])',
                       'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png'):
            with self.subTest(marker=marker):
                self.assertIn(marker, self.editor)


if __name__ == '__main__':
    unittest.main()
