"""Adversarial tests for mandatory exact-SHA WordPress visual coverage."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "slateframe_visual_coverage", ROOT / "bin" / "check-visual-coverage.py"
)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


class VisualCoverageContract(unittest.TestCase):
    def setUp(self):
        self.records = {
            name: {"width": width if width is not None else 358, "height": 900}
            for name, width in AUDIT.required_browser_screenshots().items()
        }

    def reject_missing(self, name):
        with self.assertRaisesRegex(ValueError, "missing mandatory browser coverage"):
            AUDIT.audit_browser_coverage({k: v for k, v in self.records.items() if k != name})

    def test_complete_118_state_contract(self):
        self.assertEqual(AUDIT.audit_browser_coverage(self.records), 118)

    def test_all_seven_responsive_widths(self):
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            with self.subTest(width=width):
                self.reject_missing(f"appearance-breakpoints-default-{width}-ltr.png")

    def test_each_appearance_profile(self):
        for mode in ("compact", "default", "spacious"):
            with self.subTest(mode=mode):
                self.reject_missing(f"appearance-{mode}-viewport-390-knowledge.png")

    def test_rtl_forced_colors(self):
        self.reject_missing("appearance-breakpoints-spacious-390-rtl-200-forced-colors.png")

    def test_portfolio_photography_lightbox_search_knowledge(self):
        for page in ("portfolio", "photography", "photography-lightbox",
                     "search-controls", "empty-search", "knowledge", "editorial-pathways"):
            with self.subTest(page=page):
                self.reject_missing(f"appearance-default-viewport-1440-{page}.png")

    def test_gutenberg_article_header_forms_footer(self):
        for name in ("gutenberg-viewport-390-top.png",
                     "print-article-viewport-1440.png",
                     "mobile-header-inline-viewport-320.png",
                     "core-post-comments-form-390-ltr.png",
                     "authored-form-ltr-400-forced-colors-1440.png",
                     "footer-presentation-390.png"):
            with self.subTest(name=name):
                self.reject_missing(name)

    def test_cjk_rtl_gutenberg_and_footer(self):
        self.reject_missing("gutenberg-knowledge-faq-390-rtl-200-forced-colors.png")
        self.reject_missing("footer-footnotes-viewport-390-rtl-200-forced-colors.png")

    def test_bidi_header_states_cannot_be_skipped(self):
        self.reject_missing("header-bidi-390-rtl-400-forced-colors.png")
        self.reject_missing("header-bidi-1440-ltr.png")

    def test_readable_listing_states_cannot_be_skipped(self):
        for name in ("index-readable-fallback-390-rtl-400-forced-colors.png",
                     "index-readable-fallback-1440-ltr.png",
                     "search-readable-fallback-390-rtl-400-forced-colors.png",
                     "search-readable-fallback-1440-ltr.png"):
            with self.subTest(name=name):
                self.reject_missing(name)

    def test_archive_fallback_states_cannot_be_skipped(self):
        self.reject_missing("archive-readable-fallback-390-rtl-400-forced-colors.png")
        self.reject_missing("archive-readable-fallback-1440-ltr.png")

    def test_filtered_front_page_menu_states_cannot_be_skipped(self):
        self.reject_missing("menu-front-recovery-390-rtl-400-forced-colors.png")
        self.reject_missing("menu-front-recovery-1440-ltr.png")

    def test_post_navigation_bidi_states_cannot_be_skipped(self):
        self.reject_missing("post-navigation-bidi-390-rtl-400-forced-colors.png")
        self.reject_missing("post-navigation-bidi-1440-ltr.png")

    def test_blank_author_states_cannot_be_skipped(self):
        self.reject_missing("author-blank-identity-390-rtl-400-forced-colors.png")
        self.reject_missing("author-blank-identity-1440-ltr.png")

    def test_blank_brand_states_cannot_be_skipped(self):
        self.reject_missing("header-blank-brand-390-rtl-400-forced-colors.png")
        self.reject_missing("header-blank-brand-1440-ltr.png")

    def test_blank_footer_states_cannot_be_skipped(self):
        self.reject_missing("footer-blank-identity-390-rtl-400-forced-colors.png")
        self.reject_missing("footer-blank-identity-1440-ltr.png")

    def test_bidi_footer_states_cannot_be_skipped(self):
        self.reject_missing("footer-bidi-390-rtl-400-forced-colors.png")
        self.reject_missing("footer-bidi-1440-ltr.png")

    def test_wrong_responsive_viewport(self):
        self.records["appearance-breakpoints-default-390-ltr.png"]["width"] = 375
        with self.assertRaisesRegex(ValueError, "wrong required browser viewport"):
            AUDIT.audit_browser_coverage(self.records)

    def test_wrong_appearance_viewport(self):
        self.records["appearance-spacious-viewport-1440-portfolio.png"]["width"] = 390
        with self.assertRaisesRegex(ValueError, "wrong required browser viewport"):
            AUDIT.audit_browser_coverage(self.records)

    def test_element_screenshots_may_be_narrower(self):
        self.records["core-post-comments-form-1440-ltr.png"]["width"] = 736
        self.records["authored-form-ltr-400-forced-colors-390.png"]["width"] = 358
        self.assertEqual(AUDIT.audit_browser_coverage(self.records), 118)

    def test_missing_inventory(self):
        with self.assertRaisesRegex(ValueError, "browser screenshot inventory"):
            AUDIT.audit_browser_coverage(None)

    def test_missing_height(self):
        self.records["appearance-default-viewport-390-portfolio.png"].pop("height")
        with self.assertRaisesRegex(ValueError, "wrong required browser viewport"):
            AUDIT.audit_browser_coverage(self.records)

    def test_zero_height(self):
        self.records["appearance-default-viewport-1440-knowledge.png"]["height"] = 0
        with self.assertRaisesRegex(ValueError, "wrong required browser viewport"):
            AUDIT.audit_browser_coverage(self.records)

    def test_extra_screenshots_cannot_replace_required_ones(self):
        self.records["extra-fixture.png"] = {"width": 320, "height": 900}
        self.assertEqual(AUDIT.audit_browser_coverage(self.records), 118)
        self.reject_missing("appearance-default-viewport-390-portfolio.png")


if __name__ == "__main__":
    unittest.main()
