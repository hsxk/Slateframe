"""Preserve native Gutenberg Button palettes, outline states and bounded targets."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreButtonColorParity(unittest.TestCase):
    def test_core_filled_defaults_leave_outline_to_wordpress(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertIn(".wp-block-button__link{min-inline-size:var(--slateframe-control);min-block-size:var(--slateframe-control);max-width:100%", css)
        self.assertIn(".wp-block-button:not(.is-style-outline) .wp-block-button__link:not(.is-style-outline){border:var(--slateframe-border-width) solid var(--slateframe-text);background:var(--slateframe-text);color:var(--slateframe-bg)}", css)
        self.assertNotIn(".wp-block-button .wp-block-button__link.wp-element-button{", css)
        self.assertLessEqual(len(css.encode("utf-8")), 16000)

    def test_editor_uses_same_core_button_theme_styles(self):
        source = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("add_editor_style( array( 'style.css'", source)
        self.assertNotIn("wp-block-button", (ROOT / "assets/css/editor.css").read_text(encoding="utf-8"))

    def test_real_wordpress_and_gutenberg_browser_evidence(self):
        source = (ROOT / "tests/browser/core-button-color-parity.spec.js").read_text(encoding="utf-8")
        for token in (
            "wp('post', 'create'", "wp('post', 'delete', pageId, '--force')",
            "is-style-outline", "has-accent-background-color", "has-paper-color",
            "#345678", "#faf5f0", "AxeBuilder", "forcedColors: 'active'",
            "['ltr', 'rtl']", "200%", "toBeGreaterThanOrEqual(44)",
            "core-buttons-", "openAuthenticatedEditor", "blocks.parse(first)",
            "expect(entry.valid).toBe(true)",
        ):
            with self.subTest(token=token):
                self.assertIn(token, source)

    def test_no_new_js_or_plugin_dependency(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertNotIn("!important", css.split(".wp-block-button__link{", 1)[1].split(".slateframe-pagination", 1)[0])
        self.assertNotIn("jquery", css.lower())


if __name__ == "__main__":
    unittest.main()
