"""Guard the native Query Loop chooser pattern and its Core-only structure."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT / "patterns/portfolio-query-loop.php"
EXISTING = ROOT / "patterns/portfolio-project-grid.php"
BROWSER = ROOT / "tests/browser/portfolio-positive-results.spec.js"


class PortfolioQueryChooserContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = PATTERN.read_text(encoding="utf-8")
        cls.original = EXISTING.read_text(encoding="utf-8")
        match = re.search(r'<!-- wp:query (\{[^\n]*\}) -->', cls.source)
        if not match:
            raise AssertionError("The chooser pattern must start with a Core Query block")
        cls.attributes = json.loads(match.group(1))

    def test_query_chooser_metadata_and_root(self):
        self.assertIn(" * Slug: slateframe/portfolio-query-loop\n", self.source)
        self.assertIn(" * Block Types: core/query\n", self.source)
        self.assertIn(" * Categories: slateframe-portfolio\n", self.source)
        body = self.source.split("?>", 1)[1].strip()
        self.assertTrue(body.startswith("<!-- wp:query "))
        self.assertTrue(body.endswith("<!-- /wp:query -->"))
        self.assertNotIn("<!-- wp:group ", body.split("<!-- wp:query ", 1)[0])

    def test_query_is_portable_and_keeps_core_behaviour(self):
        query = self.attributes["query"]
        self.assertEqual(query["postType"], "post")
        self.assertEqual(query["perPage"], 6)
        self.assertFalse(query["inherit"])
        self.assertEqual(query["search"], "")
        self.assertEqual(self.attributes["align"], "wide")
        self.assertEqual(self.attributes["className"], "slateframe-project-grid")
        self.assertNotIn("displayLayout", self.attributes)
        for block in ("post-template", "post-featured-image", "post-title",
                      "post-excerpt", "post-date", "query-pagination",
                      "query-no-results"):
            self.assertIn("<!-- wp:" + block, self.source)
        self.assertNotIn("time2log", self.source.lower())
        self.assertNotIn("https://", self.source)

    def test_existing_full_section_remains_separate(self):
        self.assertIn(" * Slug: slateframe/portfolio-project-grid", self.original)
        self.assertIn("<!-- wp:group ", self.original)
        self.assertNotIn(" * Block Types: core/query", self.original)

    def test_real_wordpress_registration_and_render_are_exercised(self):
        browser = BROWSER.read_text(encoding="utf-8")
        self.assertIn("slateframe/portfolio-query-loop", browser)
        self.assertIn("registered.blockTypes", browser)
        self.assertIn("await expect(cards).toHaveCount(1)", browser)
        self.assertIn("portfolio-query-chooser-", browser)


if __name__ == "__main__":
    unittest.main()
