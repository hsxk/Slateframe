"""Exact-HEAD visual review must make mandatory evidence discoverable."""
import importlib.util
from pathlib import Path
import re
import unittest

MODULE = Path(__file__).resolve().parents[1] / "bin/visual-review-index.py"
SPEC = importlib.util.spec_from_file_location("slateframe_visual_navigation", MODULE)
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)
HEAD = "a" * 40


class RequiredVisualNavigation(unittest.TestCase):
    def setUp(self):
        self.entries = [
            {"name": "appearance-default-viewport-390-footnotes.png",
             "width": 390, "height": 900, "required": True},
            {"name": "appearance-default-viewport-1440-footnotes.png",
             "width": 1440, "height": 900, "required": True},
            {"name": "portfolio-390.png", "width": 390, "height": 900, "required": False},
            {"name": "knowledge-1440.png", "width": 1440, "height": 900, "required": False},
        ]

    def test_mandatory_gallery_precedes_optional_sections(self):
        html = review.render(HEAD, self.entries, limit=1, asset_prefix="screenshots/")
        self.assertIn('id="required-visual-evidence"', html)
        self.assertLess(html.index('id="required-visual-evidence"'),
                        html.index('id="review-appearance-default"'))
        gallery = html.split('id="required-visual-evidence"', 1)[1].split("</section>", 1)[0]
        self.assertIn("appearance-default-viewport-390-footnotes.png", gallery)
        self.assertIn("appearance-default-viewport-1440-footnotes.png", gallery)
        self.assertIn("Required visual evidence (2)", html)

    def test_keyboard_navigation_and_unique_targets(self):
        html = review.render(HEAD, self.entries, limit=1)
        self.assertIn('<nav aria-label="Screenshot review sections">', html)
        targets = re.findall(r'<section id="([^"]+)"', html)
        self.assertEqual(len(targets), len(set(targets)))
        for target in targets:
            self.assertIn('href="#' + target + '"', html)
        self.assertIn("min-height:44px", html)
        self.assertNotIn("<script", html)

    def test_no_mandatory_gallery_without_mandatory_evidence(self):
        html = review.render(HEAD, [self.entries[2]], limit=1)
        self.assertNotIn('id="required-visual-evidence"', html)
        self.assertIn('id="review-portfolio"', html)

    def test_all_optional_screenshots_remain_reachable(self):
        html = review.render(HEAD, self.entries, limit=1)
        for entry in self.entries:
            self.assertIn(entry["name"], html)
        self.assertIn("Browse remaining", html)

    def test_escaped_filename_cannot_inject_markup(self):
        entries = [{"name": 'portfolio-<unsafe>.png', "width": 390, "height": 900,
                    "required": True}]
        html = review.render(HEAD, entries, limit=1)
        self.assertNotIn("<unsafe>", html)
        self.assertIn("&lt;unsafe&gt;", html)


if __name__ == "__main__":
    unittest.main()
