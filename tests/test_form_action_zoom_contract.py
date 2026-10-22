"""Guard Slateframe's bounded Core-first form controls at 400% text.

Static checks supplement, but do not replace, WordPress/Chromium acceptance.
"""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
FORMS = (ROOT / "assets/css/forms.css").read_text(encoding="utf-8")


class FormActionZoomContract(unittest.TestCase):
    def test_shared_control_padding_is_bounded_without_duplicate_action_rule(self):
        self.assertIn(
            "padding:var(--slateframe-control-padding-block) "
            "min(var(--slateframe-control-padding-inline),12px)", FORMS
        )
        self.assertIn("form :where(input:not(", FORMS)
        self.assertIn(".wp-block-search :where(input,button)", FORMS)
        self.assertIn("form :where(button,[type=submit],[type=button],[type=reset])", FORMS)
        self.assertNotIn("!important", FORMS)

    def test_control_height_and_existing_layout_contracts_survive(self):
        self.assertIn("min-block-size:var(--slateframe-control)", FORMS)
        self.assertIn(".wp-block-search__inside-wrapper{min-width:0}", FORMS)
        self.assertIn("form .slateframe-form-actions>", FORMS)
        self.assertIn("overflow-wrap:anywhere", FORMS)
        self.assertIn(".wp-block-search__button-outside button{margin-inline-start:0}", FORMS)
        self.assertIn("flex:1 12rem", FORMS)

    def test_no_budget_increase_or_old_theme_prefix(self):
        self.assertLessEqual(len(FORMS.encode("utf-8")), 1300)
        for forbidden in ("time2log", "time2analyze", "license-key", "premium", "analytics"):
            self.assertNotIn(forbidden, FORMS.lower())


if __name__ == "__main__":
    unittest.main()
