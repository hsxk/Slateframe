"""Protect the native knowledge Query Loop chooser and its portable Core structure."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT / "patterns/knowledge-query-loop.php"
BROWSER = ROOT / "tests/browser/knowledge-query-chooser.spec.js"


class KnowledgeQueryChooserContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = PATTERN.read_text(encoding="utf-8")
        match = re.search(r'<!-- wp:query (\{[^\n]*\}) -->', cls.source)
        if not match:
            raise AssertionError("Knowledge chooser must have a native Query root")
        cls.attributes = json.loads(match.group(1))

    def test_native_chooser_metadata_and_root(self):
        self.assertIn(" * Slug: slateframe/knowledge-query-loop\n", self.source)
        self.assertIn(" * Block Types: core/query\n", self.source)
        self.assertIn(" * Categories: slateframe, slateframe-knowledge\n", self.source)
        body = self.source.split("?>", 1)[1].strip()
        self.assertTrue(body.startswith("<!-- wp:query "))
        self.assertTrue(body.endswith("<!-- /wp:query -->"))

    def test_portable_query_and_core_reading_blocks(self):
        query = self.attributes["query"]
        self.assertEqual(query["postType"], "post")
        self.assertEqual(query["perPage"], 6)
        self.assertFalse(query["inherit"])
        self.assertEqual(query["search"], "")
        self.assertEqual(self.attributes["align"], "wide")
        self.assertEqual(self.attributes["className"], "slateframe-knowledge-query")
        self.assertNotIn("displayLayout", self.attributes)
        self.assertIn('<!-- wp:post-title {"isLink":true,"fontSize":"lead"} /-->', self.source)
        for block in ("post-template", "post-title", "post-date", "post-excerpt",
                      "query-pagination", "query-no-results"):
            self.assertIn("<!-- wp:" + block, self.source)
        self.assertIn("esc_html_x(", self.source)
        self.assertNotIn("time2log", self.source.lower())
        self.assertNotIn("https://", self.source)

    def test_browser_checks_real_registration_reflow_and_accessibility(self):
        browser = BROWSER.read_text(encoding="utf-8")
        for token in ("slateframe/knowledge-query-loop", "registered.blockTypes",
                      "await expect(cards).toHaveCount(1)", "AxeBuilder",
                      "knowledge-query-chooser-390-rtl-400",
                      "knowledge-query-chooser-1440-ltr", "has-lead-font-size",
                      "titleFonts", "letterSpacing"):
            self.assertIn(token, browser)


if __name__ == "__main__":
    unittest.main()
