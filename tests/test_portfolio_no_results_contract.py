"""Keep Portfolio empty states visitor-facing and WordPress Core-native."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT / "patterns/portfolio-project-grid.php"
BROWSER = ROOT / "tests/browser/portfolio-empty-results.spec.js"


class PortfolioEmptyResultsContract(unittest.TestCase):
    def test_native_query_and_empty_result_block(self):
        source = PATTERN.read_text(encoding="utf-8")
        self.assertIn('<!-- wp:query-no-results -->', source)
        self.assertIn('<!-- /wp:query-no-results -->', source)
        self.assertIn('"inherit":false', source)
        self.assertIn('No projects are available yet.', source)
        self.assertNotIn('Publish some work to populate this project grid.', source)

    def test_text_is_translated_with_theme_domain(self):
        source = PATTERN.read_text(encoding="utf-8")
        self.assertIn("'Empty project grid message', 'slateframe'", source)
        self.assertIn('esc_html_x(', source)

    def test_browser_asserts_registered_localized_copy(self):
        source = BROWSER.read_text(encoding="utf-8")
        self.assertIn('const expectedEmptyText = await page.evaluate', source)
        self.assertIn('new DOMParser()', source)
        self.assertIn('<!-- wp:query-no-results -->', source)
        self.assertIn("paragraphs.length === 1", source)
        self.assertIn("expect(expectedEmptyText).not.toBe('')", source)
        self.assertIn('await expect(empty).toContainText(expectedEmptyText)', source)
        self.assertNotIn("expect(blocks).toContain('No projects are available yet.')", source)
        self.assertNotIn("await expect(empty).toContainText('No projects are available yet.')", source)

    def test_browser_checks_visible_text_geometry_not_just_wrapper(self):
        source = BROWSER.read_text(encoding="utf-8")
        for fragment in (
            'document.createRange()', 'range.selectNodeContents(paragraph)',
            'textRects: textRects.length', 'clippedText: textRects.some(',
            'expect(result.textRects).toBeGreaterThan(0)',
            'expect(result.clippedText', "style.visibility !== 'hidden'",
            'Number(style.opacity) > 0',
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, source)

    def test_real_browser_empty_fixture_and_containment(self):
        source = BROWSER.read_text(encoding="utf-8")
        for fragment in ('--post_type=page', '--post_content=', '--force',
                         'wp-block-query-no-results', 'wp-block-post-template > .wp-block-post',
                         'wp-block-query-pagination a', 'forcedColors', "'rtl'", "'200%'",
                         'document.documentElement.scrollWidth', 'WP_Block_Patterns_Registry',
                         'slateframe/portfolio-project-grid', 'Registered Portfolio Query Loop search contract changed'):
            self.assertIn(fragment, source)
        self.assertIn("const id = wp('post', 'create'", source)
        self.assertIn("wp('post', 'delete', id, '--force')", source)
        self.assertNotIn("const content = '<!-- wp:group", source)


if __name__ == "__main__":
    unittest.main()
