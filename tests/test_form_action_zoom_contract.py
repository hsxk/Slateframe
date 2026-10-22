"""Guard Slateframe's Core-first form-action readability at extreme text zoom.

These are static checks only; real WordPress/Chromium acceptance remains required.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
FORMS = (ROOT / "assets/css/forms.css").read_text(encoding="utf-8")


class FormActionZoomContract(unittest.TestCase):
    def test_bounded_inline_padding_for_native_action_types(self):
        selector = "form :is(button,[type=submit],[type=button],[type=reset])"
        match = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", FORMS)
        self.assertIsNotNone(match, "All native form action types must share one rule")
        self.assertIn("padding-inline:min(var(--slateframe-control-padding-inline),12px)", match.group(1))
        self.assertNotIn("!important", match.group(1))

    def test_native_controls_and_44px_token_are_preserved(self):
        self.assertIn("min-block-size:var(--slateframe-control)", FORMS)
        self.assertIn("form :where(input:not(", FORMS)
        self.assertIn(".wp-block-search :where(input,button)", FORMS)
        self.assertIn("form .slateframe-form-actions>", FORMS)

    def test_no_old_theme_prefix_or_plugin_scope(self):
        for forbidden in ("time2log", "time2analyze", "license-key", "premium", "analytics"):
            self.assertNotIn(forbidden, FORMS.lower())


if __name__ == "__main__":
    unittest.main()
