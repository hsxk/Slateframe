"""Prevent WordPress Search's default pre-escaped query from being escaped twice."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SearchQueryEscapeContract(unittest.TestCase):
    def test_search_form_escapes_raw_query_once_for_attribute(self):
        form = (ROOT / 'searchform.php').read_text()
        self.assertIn('esc_attr( get_search_query( false ) )', form)
        self.assertIn('name="s"', form)
        self.assertIn('method="get"', form)
        self.assertNotIn('esc_attr( get_search_query() )', form)

    def test_search_heading_escapes_raw_query_once_for_html(self):
        template = (ROOT / 'search.php').read_text()
        self.assertIn('esc_html( get_search_query( false ) )', template)
        self.assertNotIn('esc_html( get_search_query() )', template)
        self.assertIn("'<bdi>' . esc_html( get_search_query( false ) ) . '</bdi>'", template)
        self.assertIn("esc_html__( 'Search results for: %s', 'slateframe' )", template)

    def test_browser_regression_checks_query_values_and_bidi(self):
        test = (ROOT / 'tests/browser/search-query-bidi.spec.js').read_text()
        for term in ('encodeURIComponent', 'R&D', '日本語', 'مرحبا', 'toHaveValue', 'bdi', 'direction', 'scrollWidth'):
            self.assertIn(term, test)


if __name__ == '__main__':
    unittest.main()
