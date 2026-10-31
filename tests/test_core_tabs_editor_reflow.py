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
            "removeBlocks(id)",
            "toEqual(baseline)",
        ):
            with self.subTest(token=token):
                self.assertIn(token, self.browser)
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


if __name__ == "__main__":
    unittest.main()
