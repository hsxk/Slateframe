"""Guard against stale contracts when FAQ evidence patches are integrated together."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
EDITOR = ROOT / 'tests/browser/knowledge-faq-editor.spec.js'
FINAL = ROOT / 'tests/test_faq_final_paragraph_evidence.py'
LOCALIZED = ROOT / 'tests/test_faq_editor_localized_copy.py'
INVENTORY = ROOT / 'tests/verify_browser_inventory.py'
AXE = ROOT / 'tests/browser/knowledge-faq-axe.spec.js'


class FaqPatchChainConsistency(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.editor = EDITOR.read_text(encoding='utf-8')
        cls.final = FINAL.read_text(encoding='utf-8')
        cls.localized = LOCALIZED.read_text(encoding='utf-8')
        cls.inventory = INVENTORY.read_text(encoding='utf-8')
        cls.axe = AXE.read_text(encoding='utf-8')

    def test_editor_and_both_contracts_agree_on_localized_copy(self):
        marker = 'await expect(closingParagraph).toHaveText(expectedClosingText)'
        for source in (self.editor, self.final, self.localized):
            self.assertIn(marker, source)
        self.assertNotIn("toContainText('Keep answers specific')", self.editor)
        self.assertNotIn('self.assertIn("toContainText(', self.final)

    def test_final_evidence_retains_scroll_geometry_and_screenshot(self):
        for marker in ('await closingParagraph.scrollIntoViewIfNeeded()',
                       'expect(closingGeometry.outsideFrame).toBe(false)',
                       'expect(closingGeometry.clippedByAncestor).toEqual([])',
                       'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png'):
            self.assertIn(marker, self.editor)
            self.assertIn(marker, self.final)

    def test_inventory_matches_actual_evidence_producers(self):
        for name in ('gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png',
                     'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png'):
            self.assertIn(name, self.inventory)
        self.assertIn('await details.nth(1).screenshot({', self.axe)
        self.assertIn('FAQ_MIN_CROP_HEIGHT', self.inventory)

    def test_original_core_and_accessibility_checks_remain(self):
        self.assertIn("parsed.querySelector('.slateframe-knowledge-faq > p:last-child')", self.editor)
        self.assertIn("node.matches(':focus-visible')", self.axe)
        self.assertIn("style.outlineWidth", self.axe)
        self.assertIn('REQUIRED_APPEARANCE | REQUIRED_RESPONSIVE | REQUIRED_FAQ', self.inventory)


if __name__ == '__main__':
    unittest.main()
