"""Keep native Core Tabs 400% Gutenberg parity evidence from silently regressing."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreTabsEditorReflow(unittest.TestCase):
    def setUp(self):
        self.browser = (ROOT / "tests/browser/core-tabs-editor-reflow.spec.js").read_text(
            encoding="utf-8"
        )
        self.workflow = (ROOT / ".github/workflows/quality.yml").read_text(
            encoding="utf-8"
        )

    def test_uses_real_authenticated_editor_and_core_blocks(self):
        for token in (
            "openAuthenticatedEditor(page, postId)",
            "createBlock('core/tabs'",
            "createBlock('core/tab-list')",
            "createBlock('core/tab-panels'",
            "createBlock('core/tab-panel'",
            "insertBlocks(tabs)",
            "setRootTextScale(canvas, 64, 'rtl')",
            "UnbrokenNativeTabLabel",
            "日本語 中文 العربية",
        ):
            with self.subTest(token=token):
                self.assertIn(token, self.browser)

    def test_uses_real_geometry_not_just_stylesheet_text(self):
        for token in (
            "getBoundingClientRect()",
            "getComputedStyle(button)",
            "baselineOverflow",
            "measurements.overflow",
            "measurements.blockWidth",
            "measurements.viewport + 1",
            "control.height",
            "control.width",
            "control.wrap",
        ):
            with self.subTest(token=token):
                self.assertIn(token, self.browser)

    def test_restores_editor_content_and_block_identity(self):
        for token in (
            "const baseline",
            "window.wp.blocks.serialize(editor.getBlocks())",
            "editor.getBlocks().map(block => block.clientId)",
            "finally {",
            "dispatch('core/editor').undo()",
            "toEqual(baseline)",
            "isEditedPostDirty()",
            "getBlock(id)",
        ):
            with self.subTest(token=token):
                self.assertIn(token, self.browser)
        self.assertEqual(self.browser.count("dispatch('core/editor').undo()"), 1)
        self.assertNotIn("__unstableMarkNextChangeAsNotPersistent()", self.browser)
        self.assertNotIn("removeBlocks(id)", self.browser)
        self.assertEqual(self.browser.count("isEditedPostDirty()"), 2)
        for forbidden in ("savePost(", "wp('post', 'update'", "test.only", "test.fixme"):
            self.assertNotIn(forbidden, self.browser)

    def test_two_actual_viewport_screenshots_are_required_by_ci(self):
        self.assertIn("[390, 1440]", self.browser)
        self.assertIn("core-tabs-editor-' + width + '-rtl-400.png", self.browser)
        self.assertIn("for width in 390 1440; do", self.workflow)
        self.assertIn('core-tabs-editor-${width}-rtl-400.png', self.workflow)
        self.assertIn("core-tabs-editor-390-rtl-400-forced-colors.png", self.browser)
        self.assertIn("core-tabs-editor-390-rtl-400-forced-colors.png", self.workflow)
        self.assertIn("test -s", self.workflow)

    def test_complete_label_evidence_is_not_lost_to_editor_scroll_position(self):
        # A 400% control may be taller than the visible Gutenberg canvas. The
        # whole-control screenshot must complement, not replace, viewport proof.
        self.assertIn("toContainText('UnbrokenNativeTabLabel'.repeat(4))", self.browser)
        self.assertIn("toContainText('Second / 次へ / التالي')", self.browser)
        self.assertIn("const captureCompleteLabel = async path =>", self.browser)
        self.assertEqual(self.browser.count("controls.first().screenshot({"), 1)
        self.assertEqual(self.browser.count("await captureCompleteLabel("), 2)
        self.assertIn("height: Math.max(originalViewport.height, tabHeight + 480)", self.browser)
        self.assertIn("await page.setViewportSize(originalViewport)", self.browser)
        self.assertIn("visible.top", self.browser)
        self.assertIn("visible.bottom", self.browser)
        self.assertIn("visible.viewport + 1", self.browser)
        self.assertIn("core-tabs-editor-' + width + '-rtl-400-complete-label.png", self.browser)
        self.assertIn("core-tabs-editor-390-rtl-400-complete-label-forced-colors.png", self.browser)
        self.assertIn('core-tabs-editor-${width}-rtl-400-complete-label.png', self.workflow)
        self.assertIn("core-tabs-editor-390-rtl-400-complete-label-forced-colors.png", self.workflow)
        self.assertIn("page.screenshot({", self.browser)


if __name__ == "__main__":
    unittest.main()
