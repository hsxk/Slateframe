"""Core Paragraph Drop Cap stays native and authorable in both surfaces."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CoreParagraphAuthoringContract(unittest.TestCase):
    def test_theme_exposes_native_drop_cap(self):
        theme = json.loads((ROOT / "theme.json").read_text(encoding="utf-8"))
        self.assertIs(theme["settings"]["typography"]["dropCap"], True)

    def test_native_first_letter_remains_bounded_without_replacing_core_float(self):
        css = (ROOT / "assets/css/core-paragraph.css").read_text(encoding="utf-8")
        self.assertIn("p.has-drop-cap:not(:focus)::first-letter", css)
        self.assertIn("font-size:min(8.4em,calc(50dvi", css)
        self.assertNotIn("float:", css)
        self.assertLessEqual(len(css.encode("utf-8")), 300)

    def test_editor_and_frontend_share_conditional_paragraph_asset(self):
        functions = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("'core/paragraph'", functions)
        self.assertIn("'handle' => 'slateframe-core-paragraph'", functions)
        self.assertGreaterEqual(functions.count("assets/css/core-paragraph.css"), 3)

    def test_400_percent_evidence_is_required_for_both_directions(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        self.assertIn('core-paragraph-390-${direction}-400.png', workflow)
        browser = (ROOT / "tests/browser/core-paragraph-parity.spec.js").read_text(encoding="utf-8")
        self.assertIn("width === 390 && font === 64", browser)
        self.assertIn("readable 400% drop cap", browser)
        self.assertIn("dropCap: true", browser)
        self.assertIn("blocks.getSaveContent('core/paragraph', attributes)", browser)
        self.assertIn("expect(result.first).toContain(result.nativeMarkup)", browser)
        self.assertIn("expect(result.first).toContain", browser)
        self.assertNotIn("expect(result.first).toContain('has-drop-cap')", browser)
        self.assertIn("toHaveClass(/has-drop-cap/)", browser)


if __name__ == "__main__":
    unittest.main()
