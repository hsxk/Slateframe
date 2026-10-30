"""Guard native Core Checklist marker size and logical text gutter at 400%."""

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class KnowledgeChecklistMarkerBounds(unittest.TestCase):
    def test_bounded_core_list_presentation_and_original_budgets(self):
        css = (ROOT / "assets/css/content-modes.css").read_text(encoding="utf-8")
        self.assertIn(".wp-block-list.is-style-slateframe-checklist>li,.is-style-slateframe-checklist>li{", css)
        self.assertIn("padding-inline-start:min(1.65rem,36px);margin-block:.65rem", css)
        self.assertIn('content:"✓";font-size:min(1em,24px);color:var(--slateframe-accent)', css)
        self.assertIn("inset-inline-start:0", css)
        self.assertNotIn("padding-inline-start:1.65rem;margin-block:.65rem", css)
        self.assertNotIn('content:"✓";color:var(--slateframe-accent)', css)
        self.assertLessEqual(len(css.encode("utf-8")), 7000)
        self.assertLessEqual((ROOT / "assets/css/editor.css").stat().st_size, 5000)

    def test_no_custom_blocks_or_core_list_marker_regression(self):
        css = (ROOT / "assets/css/core-list.css").read_text(encoding="utf-8")
        reading = (ROOT / "assets/css/reading.css").read_text(encoding="utf-8")
        bootstrap = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("overflow-wrap:anywhere", css)
        self.assertIn(":not(:where(.is-style-slateframe-steps,.is-style-slateframe-checklist))", reading)
        self.assertIn("'assets/css/content-modes.css'", bootstrap)
        self.assertIn("'assets/css/core-list.css'", bootstrap)
        self.assertNotIn("register_block_type(", bootstrap)

    def test_real_wordpress_matrix_editor_and_visual_evidence(self):
        spec = (ROOT / "tests/browser/knowledge-nested-lists.spec.js").read_text(encoding="utf-8")
        editor = (ROOT / "tests/browser/knowledge-checkpoint-spatial.spec.js").read_text(encoding="utf-8")
        for required in (
            "for (const width of [320, 375, 390, 412, 768, 1440, 1920])",
            "for (const dir of ['ltr', 'rtl'])",
            "for (const font of [16, 32, 64])",
            "Math.min(font * 1.65, 36)",
            "Math.min(state.itemFont, 24)",
            "nested bullet",
            "new AxeBuilder",
            "forcedColors: 'active'",
            "knowledge-checklist-marker-390-",
            "knowledge-checklist-marker-1440-ltr.png",
            "knowledge-checklist-marker-390-rtl-400-forced-colors.png",
        ):
            with self.subTest(required=required):
                self.assertIn(required, spec)
        self.assertIn("geometry.padding).toBeLessThanOrEqual(36)", editor)
        self.assertIn("geometry.font).toBeLessThanOrEqual(24)", editor)


if __name__ == "__main__":
    unittest.main()
