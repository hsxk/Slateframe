"""Native browser validation must remain a bounded, Core-first presentation state."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FormValidationPresentationTest(unittest.TestCase):
    def test_native_and_accessible_invalid_states_share_tokens(self):
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        for part in (":user-invalid", "[aria-invalid=true]", "border-color:var(--slateframe-danger)",
                     "border-width:2px", "@media(forced-colors:active)", "border-color:Highlight"):
            with self.subTest(part=part):
                self.assertIn(part, css)
        self.assertIn("input:not([type=checkbox],[type=radio])", css)
        self.assertLessEqual(len(css.encode("utf-8")), 16000)

    def test_real_wordpress_browser_evidence(self):
        source = (ROOT / "tests/browser/form-validation-states.spec.js").read_text(encoding="utf-8")
        for part in ("slateframe-forms-css", "aria-describedby", ":user-invalid",
                     "sf-untouched", "sf-explicit", "sf-typed", "sf-select", "sf-notes",
                     "forcedColors: 'active'", "outlineWidth", "form-validation-",
                     "['ltr', 'rtl']", "[320, 390, 1440]"):
            with self.subTest(part=part):
                self.assertIn(part, source)

    def test_no_plugin_or_script_validation_dependency(self):
        source = (ROOT / "tests/browser/form-validation-states.spec.js").read_text(encoding="utf-8")
        css = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertNotIn("jquery", css.lower())
        self.assertNotIn("time2log", css.lower())
        self.assertNotIn("setCustomValidity", source)


if __name__ == "__main__":
    unittest.main()
