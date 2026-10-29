"""Guard the Portfolio Query Loop's native serialized metadata."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT / "patterns/portfolio-project-grid.php"
BROWSER = ROOT / "tests/browser/portfolio-positive-results.spec.js"


class PortfolioQueryMetadataContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = PATTERN.read_text(encoding="utf-8")
        match = re.search(r'<!-- wp:query (\{[^\n]*\}) -->', cls.source)
        if not match:
            raise AssertionError("Native Query block opening delimiter is missing")
        cls.attributes = json.loads(match.group(1))

    def test_no_obsolete_query_display_layout(self):
        self.assertNotIn("displayLayout", self.attributes)
        self.assertNotIn('"displayLayout"', self.source)

    def test_query_retains_core_post_semantics(self):
        query = self.attributes["query"]
        self.assertEqual(query["postType"], "post")
        self.assertEqual(query["perPage"], 6)
        self.assertFalse(query["inherit"])
        self.assertEqual(query["search"], "")
        self.assertEqual(self.attributes["align"], "wide")
        self.assertIn("<!-- wp:post-template -->", self.source)
        self.assertIn("<!-- /wp:post-template -->", self.source)
        self.assertIn("<!-- wp:query-no-results -->", self.source)
        self.assertIn("<!-- wp:query-pagination", self.source)

    def test_browser_checks_registered_pattern(self):
        browser = BROWSER.read_text(encoding="utf-8")
        self.assertIn("const blocks = portfolioWithSearch(marker)", browser)
        self.assertIn("expect(blocks).not.toContain(", browser)
        self.assertIn('"displayLayout"', browser)
        self.assertIn("await expect(cards).toHaveCount(1)", browser)


if __name__ == "__main__":
    unittest.main()
