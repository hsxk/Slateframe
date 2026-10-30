"""Keep native Core Details markers visible at extreme RTL Gutenberg zoom."""

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CoreDetailsRTLMarker(unittest.TestCase):
    def test_editor_only_logical_inset_without_core_interactivity_override(self):
        css = (ROOT / "assets/css/core-details.css").read_text(encoding="utf-8")
        self.assertIn(
            ".editor-styles-wrapper &{padding-inline-start:min(.75em,24px)}", css
        )
        self.assertIn("min-block-size:var(--slateframe-control)", css)
        self.assertIn("cursor:pointer", css)
        self.assertIn("&:focus-visible{outline:2px solid currentColor;outline-offset:2px}", css)
        self.assertLessEqual(len(css.encode("utf-8")), 400)
        for forbidden in ("!important", "display:none", "list-style:none", "direction:rtl"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, css)

    def test_real_gutenberg_200_and_400_percent_evidence(self):
        browser = (ROOT / "tests/browser/knowledge-faq-editor.spec.js").read_text(encoding="utf-8")
        for expected in (
            "gutenberg-knowledge-faq-390-rtl-200-forced-colors.png",
            "node.style.fontSize = '200%'",
            "node.style.fontSize = '400%'",
            "summaryPadding",
            "RTL native disclosure marker inset at 200%",
            "RTL native marker inset at 400%",
            "extreme.overflow",
            "expect(zoomBounds.clipped).toEqual([])",
        ):
            with self.subTest(expected=expected):
                self.assertIn(expected, browser)
        self.assertIn("core/details", browser)
        self.assertIn("openAuthenticatedEditor", browser)


if __name__ == "__main__":
    unittest.main()
