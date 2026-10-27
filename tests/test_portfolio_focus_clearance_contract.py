"""Keep Portfolio keyboard targets clear of the responsive sticky header."""

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "style.css"
BROWSER = ROOT / "tests/browser/portfolio-focus-scroll.spec.js"
WORKFLOW = ROOT / ".github/workflows/quality.yml"


class PortfolioFocusClearanceContract(unittest.TestCase):
    def test_scroll_clearance_is_scoped_and_budgeted(self):
        css = BASE.read_text(encoding="utf-8")
        self.assertLessEqual(len(css.encode("utf-8")), 16000)
        self.assertIn(
            "@media(min-width:481px){.slateframe-project-grid a{"
            "scroll-margin-block-start:calc(var(--slateframe-header-height) + "
            "var(--slateframe-stack-gap))}}", css,
        )
        self.assertNotIn("scroll-margin-block-start:0!important", css)

    def test_real_wordpress_checks_actual_focus_geometry(self):
        source = BROWSER.read_text(encoding="utf-8")
        for token in (
            "SLATEFRAME_PROJECT_PATH",
            ".slateframe-site-header",
            ".slateframe-project-grid .wp-block-post-template",
            ".wp-block-post-title a",
            "scrollIntoView({ block: 'start', behavior: 'instant' })",
            "result.targetTop",
            "result.headerBottom",
            "result.scrollMargin",
            "result.headerHeight",
            "result.headerPosition",
            "afterFocus.headerBottom",
            "afterFocus.top",
            "result.overflow",
            "toBeFocused()",
            "getComputedStyle(node).outlineWidth",
            "for (const font of [16, 32, 64])",
            "for (const direction of ['ltr', 'rtl'])",
            "for (const viewport of [320, 375, 390, 412])",
            "forcedColors: 'active'",
            "reducedMotion: 'reduce'",
        ):
            with self.subTest(token=token):
                self.assertIn(token, source)
        self.assertNotIn("test.fixme(", source)
        self.assertNotIn("test.only(", source)

    def test_required_screenshots_are_bound_to_actions(self):
        browser = BROWSER.read_text(encoding="utf-8")
        workflow = WORKFLOW.read_text(encoding="utf-8")
        for name in (
            "portfolio-focus-scroll-390-rtl-400.png",
            "portfolio-focus-scroll-768-rtl-200-forced-colors.png",
            "portfolio-focus-scroll-1440-ltr-400.png",
        ):
            with self.subTest(name=name):
                self.assertIn(name, browser)
                self.assertIn(name, workflow)


if __name__ == "__main__":
    unittest.main()
