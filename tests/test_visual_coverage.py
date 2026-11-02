"""Adversarial tests for mandatory exact-SHA WordPress visual coverage."""
import importlib.util
import json
import tempfile
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

    def test_complete_132_state_contract(self):
        self.assertEqual(AUDIT.audit_browser_coverage(self.records), 136)

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

    def test_gutenberg_400_glyph_screenshots_cannot_be_skipped(self):
        for width in (390, 1440):
            for direction in ('ltr', 'rtl'):
                with self.subTest(width=width, direction=direction):
                    self.reject_missing(f"gutenberg-knowledge-400-{width}-{direction}-forced-colors.png")

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

    def test_unreadable_taxonomy_footer_states_cannot_be_skipped(self):
        for name in ("taxonomy-readable-390-rtl-400-forced-colors.png",
                     "taxonomy-readable-1440-ltr.png",
                     "taxonomy-readable-category-390-rtl-400-forced-colors.png"):
            with self.subTest(name=name):
                self.reject_missing(name)

    def test_media_readability_states_cannot_be_skipped(self):
        for name in ("media-readable-attachment-390-rtl-400-forced-colors.png",
                     "media-readable-attachment-1440-ltr.png",
                     "media-readable-hero-390-rtl-400-forced-colors.png"):
            with self.subTest(name=name):
                self.reject_missing(name)

    def test_invisible_image_media_evidence_cannot_be_skipped(self):
        self.reject_missing("media-invisible-image-390-rtl-400-forced-colors.png")

    def test_invisible_file_recovery_evidence_cannot_be_skipped(self):
        self.reject_missing("media-invisible-file-url-390-rtl-400-forced-colors.png")

    def test_non_web_file_recovery_evidence_cannot_be_skipped(self):
        self.reject_missing("media-non-http-file-url-390-rtl-400-forced-colors.png")

    def test_fragment_file_recovery_evidence_cannot_be_skipped(self):
        self.reject_missing("media-fragment-file-url-390-rtl-400-forced-colors.png")

    def test_filtered_card_thumbnail_evidence_cannot_be_skipped(self):
        self.reject_missing("card-filtered-thumbnail-390-rtl-400-forced-colors.png")
        self.reject_missing("card-interactive-thumbnail-390-rtl-400-forced-colors.png")
        self.reject_missing("card-aria-role-thumbnail-390-rtl-400-forced-colors.png")
        self.reject_missing("card-aria-composite-thumbnail-390-rtl-400-forced-colors.png")

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
        self.assertEqual(AUDIT.audit_browser_coverage(self.records), 136)

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
        self.assertEqual(AUDIT.audit_browser_coverage(self.records), 136)
        self.reject_missing("appearance-default-viewport-390-portfolio.png")


class Gutenberg400MetricsContract(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.base = {
            "editorShellBaseline": 267,
            "rootFont": "64px",
            "direction": "ltr",
            "viewport": 390,
            "region": {"left": 0, "right": 390},
            "overflow": 267,
            "procedureOverflow": 0,
            "measured": 140,
            "escaped": [],
        }
        for width in (390, 1440):
            for direction in ("ltr", "rtl"):
                data = {**self.base, "viewport": width, "direction": direction,
                        "region": {"left": 0, "right": width}}
                self.write(width, direction, data)

    def tearDown(self):
        self.directory.cleanup()

    def file(self, width=390, direction="ltr"):
        return self.root / f"gutenberg-knowledge-400-{width}-{direction}-metrics.json"

    def write(self, width, direction, data):
        self.file(width, direction).write_text(json.dumps(data), encoding="utf-8")

    def reject(self, field, value, message, width=390, direction="ltr"):
        data = json.loads(self.file(width, direction).read_text(encoding="utf-8"))
        data[field] = value
        self.write(width, direction, data)
        with self.assertRaisesRegex(ValueError, message):
            AUDIT.audit_knowledge_400_metrics(self.root)

    def test_four_real_direction_and_width_states(self):
        self.assertEqual(AUDIT.audit_knowledge_400_metrics(self.root), 4)

    def test_missing_state_rejected(self):
        self.file(1440, "rtl").unlink()
        with self.assertRaisesRegex(ValueError, "missing Gutenberg 400% metrics"):
            AUDIT.audit_knowledge_400_metrics(self.root)

    def test_wrong_font_size_rejected(self):
        self.reject("rootFont", "16px", "wrong Gutenberg 400% state")

    def test_wrong_direction_rejected(self):
        self.reject("direction", "rtl", "wrong Gutenberg 400% state")

    def test_wrong_viewport_rejected(self):
        self.reject("viewport", 375, "wrong Gutenberg 400% state")

    def test_unmeasured_glyphs_rejected(self):
        self.reject("measured", 0, "clipped or unmeasured")

    def test_clipped_glyphs_rejected(self):
        self.reject("escaped", [{"text": "clipped"}], "clipped or unmeasured")

    def test_outside_viewport_rejected(self):
        self.reject("region", {"left": -4, "right": 390}, "region outside viewport")

    def test_procedure_overflow_rejected(self):
        self.reject("procedureOverflow", 2, "overflow regression")

    def test_editor_shell_regression_rejected(self):
        self.reject("overflow", 269, "overflow regression")

    def test_negative_or_nonfinite_overflow_rejected(self):
        for value in (-1, float("nan"), True):
            with self.subTest(value=value):
                self.write(390, "ltr", {**self.base, "overflow": value})
                with self.assertRaisesRegex(ValueError, "overflow regression"):
                    AUDIT.audit_knowledge_400_metrics(self.root)

    def test_corrupt_json_rejected(self):
        self.file().write_text("{", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "invalid Gutenberg 400% metrics"):
            AUDIT.audit_knowledge_400_metrics(self.root)

    def test_symlink_evidence_rejected(self):
        target = self.file(390, "ltr")
        other = self.file(1440, "ltr")
        target.unlink()
        target.symlink_to(other)
        with self.assertRaisesRegex(ValueError, "missing Gutenberg 400% metrics"):
            AUDIT.audit_knowledge_400_metrics(self.root)


if __name__ == "__main__":
    unittest.main()
