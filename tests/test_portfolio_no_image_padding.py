"""Guard native image-free Portfolio card readability at 400% zoom."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class PortfolioNoImagePaddingContract(unittest.TestCase):
    def test_bounded_logical_padding_and_core_query_budget(self):
        css = (ROOT / 'assets/css/content-modes.css').read_text()
        query = (ROOT / 'patterns/portfolio-query-loop.php').read_text()
        self.assertIn('Slug: slateframe/portfolio-query-loop', query)
        self.assertIn('wp:query', query)
        self.assertIn('wp:post-template', query)
        self.assertIn('slateframe-project-card:not(:has(.wp-block-post-featured-image img))', css)
        self.assertIn('padding-inline-start:min(var(--slateframe-stack-gap),20px)', css)
        self.assertNotIn('padding-inline-start:var(--slateframe-stack-gap)', css)
        self.assertLessEqual(len(css.encode('utf-8')), 7000)

    def test_real_wordpress_visual_and_accessibility_matrix(self):
        source = (ROOT / 'tests/browser/portfolio-no-image-padding.spec.js').read_text()
        for needle in ('SLATEFRAME_PROJECT_PATH', 'setRootTextScale',
                       '[320, 375, 390, 412, 768, 1440, 1920]',
                       "['ltr', 'rtl']", '[16, 32, 64]', 'Math.min(font, 20)',
                       'wp-block-post-featured-image', 'AxeBuilder',
                       "forcedColors: 'active'", 'toBeFocused',
                       'portfolio-no-image-390-rtl-400-forced-colors.png',
                       'portfolio-no-image-1440-ltr.png'):
            with self.subTest(needle=needle):
                self.assertIn(needle, source)

    def test_changelog_heading_precedes_release_notes(self):
        changelog = (ROOT / 'CHANGELOG.md').read_text()
        self.assertTrue(changelog.startswith('# Changelog\n'))
        self.assertIn('## Unreleased\n', changelog)
        self.assertIn('image-free Portfolio cards', changelog)

if __name__ == '__main__':
    unittest.main()
