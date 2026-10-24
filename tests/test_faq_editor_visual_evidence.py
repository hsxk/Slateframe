"""Prevent Gutenberg onboarding from silently invalidating visual evidence."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "tests/browser/knowledge-faq-editor.spec.js"


class KnowledgeFaqEditorEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SPEC.read_text(encoding="utf-8")

    def test_real_registered_pattern_is_used(self):
        self.assertIn("WP_Block_Patterns_Registry::get_instance()->get_registered('slateframe/knowledge-faq')", self.source)
        self.assertIn("const faq = root.locator('.slateframe-knowledge-faq').first()", self.source)

    def test_first_use_onboarding_is_dismissed_before_editor_assertions(self):
        self.assertIn("await dismissEditorWelcomeGuide(page)", self.source)
        self.assertLess(
            self.source.index("await dismissEditorWelcomeGuide(page)"),
            self.source.index("const framed = await page.locator"),
        )
        self.assertIn("await guide.waitFor({ state: 'visible', timeout: 2_000 })", self.source)
        self.assertIn("if (await guide.isVisible().catch(() => false)) throw error", self.source)

    def test_screenshots_require_modal_hidden(self):
        self.assertGreaterEqual(self.source.count("toBeHidden()"), 3)
        for screenshot in (
            "gutenberg-knowledge-faq-390-rtl-200-forced-colors.png",
            "gutenberg-knowledge-faq-1440-ltr.png",
        ):
            self.assertIn(screenshot, self.source)
        self.assertLess(
            self.source.index("await expect(guide).toBeHidden()"),
            self.source.index("gutenberg-knowledge-faq-390-rtl-200-forced-colors.png"),
        )
        self.assertLess(
            self.source.rindex("await expect(page.locator('[role=\"dialog\"]')"),
            self.source.index("gutenberg-knowledge-faq-1440-ltr.png"),
        )

    def test_rtl_zoom_geometry_is_asserted_not_only_captured(self):
        self.assertIn("node.querySelectorAll('h2, p, summary')", self.source)
        self.assertIn("if (!child.getClientRects().length) return []", self.source)
        self.assertIn("expect(zoomBounds.overflow).toBeLessThanOrEqual(1)", self.source)
        self.assertIn("expect(zoomBounds.clipped).toEqual([])", self.source)
        self.assertLess(
            self.source.index("expect(zoomBounds.clipped).toEqual([])"),
            self.source.index("gutenberg-knowledge-faq-390-rtl-200-forced-colors.png"),
        )


if __name__ == "__main__":
    unittest.main()
