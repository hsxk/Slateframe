"""Protect the Core Search 400% text layout without overriding Core behavior."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "style.css").read_text(encoding="utf-8")


class CoreSearchCascadeContract(unittest.TestCase):
    def test_semantic_search_variants_use_bounded_control_padding(self):
        self.assertIn("/* Core-first Search:", CSS)
        self.assertIn("padding-inline:min(var(--slateframe-control-padding-inline),12px)", CSS)
        self.assertIn(".wp-block-search__button-only", CSS)

    def test_mobile_input_and_action_stack_preserve_editable_width(self):
        self.assertIn("grid-template-columns:minmax(0,1fr)", CSS)
        self.assertIn(".wp-block-search__button-inside", CSS)
        self.assertIn(".wp-block-search__button-outside", CSS)
        self.assertIn(".wp-block-search__input{inline-size:100%;min-inline-size:0}", CSS)
        self.assertIn(".wp-block-search__button{inline-size:100%;margin:0}", CSS)

    def test_theme_boundaries_and_static_budget(self):
        self.assertLessEqual(len(CSS.encode("utf-8")), 16000)
        for forbidden in ("time2log", "license-key", "premium-only", "analytics"):
            self.assertNotIn(forbidden, CSS.lower())


if __name__ == "__main__":
    unittest.main()
