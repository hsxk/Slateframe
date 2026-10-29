"""Exact-HEAD cross-page visual review must not silently omit release domains."""
import importlib.util
from pathlib import Path
import unittest

MODULE = Path(__file__).resolve().parents[1] / "bin/visual-review-index.py"
SPEC = importlib.util.spec_from_file_location("slateframe_cross_page_review", MODULE)
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)
HEAD = "a" * 40


class CrossPageReview(unittest.TestCase):
    def setUp(self):
        self.names = [name for _, names in review.CROSS_PAGE_CASES for name in names]
        self.entries = [{"name": name, "width": 390, "height": 900, "required": False}
                        for name in self.names]

    def test_26_unique_captures_cover_11_domains(self):
        self.assertEqual(len(review.CROSS_PAGE_CASES), 11)
        self.assertEqual(len(self.names), 26)
        self.assertEqual(len(set(self.names)), 26)
        self.assertTrue(all(name.endswith(".png") for name in self.names))
        self.assertTrue(all(len(names) >= 2 for _, names in review.CROSS_PAGE_CASES))
        knowledge = dict(review.CROSS_PAGE_CASES)['Knowledge']
        self.assertEqual(len(knowledge), 6)
        for column in ('claim', 'source', 'limits'):
            self.assertIn(f'knowledge-evidence-390-rtl-400-{column}-column.png', knowledge)

    def test_appearance_mobile_desktop_and_rtl_zoom_evidence(self):
        names = set(self.names)
        for mode in ("compact", "default", "spacious"):
            for width in (390, 1440):
                self.assertIn(f"appearance-{mode}-viewport-{width}-knowledge.png", names)
        self.assertTrue(any("-390-" in name and "-400" in name for name in names))
        self.assertTrue(any("-rtl-" in name and "forced-colors" in name for name in names))
        self.assertTrue(any("gutenberg" in name for name in names))

    def test_complete_matrix_preserves_order_and_domain(self):
        chosen = review.cross_page_entries(self.entries, strict=True)
        self.assertEqual([entry["name"] for entry in chosen], self.names)
        self.assertEqual(len({entry["review_domain"] for entry in chosen}), 11)

    def test_missing_capture_fails_closed_in_ci(self):
        with self.assertRaisesRegex(ValueError, "missing cross-page visual evidence"):
            review.cross_page_entries(self.entries[:-1], strict=True)

    def test_partial_fixture_stays_compatible_without_ci_flag(self):
        chosen = review.cross_page_entries(self.entries[:2], strict=False)
        self.assertEqual(len(chosen), 2)

    def test_duplicate_inventory_entry_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "duplicate cross-page screenshot inventory"):
            review.cross_page_entries(self.entries + [self.entries[0]], strict=True)

    def test_dedicated_gallery_is_visible_before_optional_groups(self):
        html = review.render(HEAD, self.entries, limit=1, asset_prefix="screenshots/")
        self.assertIn('id="cross-page-visual-review"', html)
        self.assertIn('href="#cross-page-visual-review"', html)
        gallery = html.split('<section id="cross-page-visual-review">', 1)[1].split("</section>", 1)[0]
        self.assertEqual(gallery.count("<figure>"), 26)
        self.assertLess(html.index('id="cross-page-visual-review"'),
                        html.index('id="review-appearance-compact"'))
        self.assertNotIn("<script", html)
        for name in self.names:
            self.assertIn('href="screenshots/' + name + '"', gallery)

    def test_no_cross_page_gallery_when_no_matches(self):
        html = review.render(HEAD, [{"name": "other-core.png", "width": 390, "height": 900}], limit=1)
        self.assertNotIn('id="cross-page-visual-review"', html)

    def test_ci_requires_exact_head_matrix_without_weakening_footnotes(self):
        workflow = (MODULE.parents[1] / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        step = workflow[workflow.index("      - name: Generate exact-HEAD browser visual review"):]
        self.assertIn("--require-cross-page", step.split("      - name: Upload browser artifacts")[0])
        self.assertIn("python3 tests/verify_footnotes_screenshots.py", workflow)
        self.assertIn("python3 tests/verify_browser_inventory.py verify", workflow)


if __name__ == "__main__":
    unittest.main()
