"""Classic listing cards must not render empty or unsafe thumbnail links."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CardThumbnailBoundaries(unittest.TestCase):
    def test_real_php_card_template_and_core_image_filter_boundaries(self):
        fixture = ROOT / 'tests/fixtures/card-thumbnail.php.fixture'
        result = subprocess.run(['php', str(fixture)], cwd=ROOT,
                                capture_output=True, text=True, check=False, timeout=20)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('Card thumbnail boundaries: 59 assertions passed', result.stdout)

    def test_shared_core_media_guard_and_no_duplicate_thumbnail_query(self):
        card = (ROOT / 'template-parts/content-card.php').read_text(encoding='utf-8')
        media = (ROOT / 'inc/media-source.php').read_text(encoding='utf-8')
        self.assertIn('slateframe_card_thumbnail_markup( get_the_ID() )', card)
        self.assertIn("if ( '' !== $slateframe_card_image )", card)
        self.assertNotIn('the_post_thumbnail(', card)
        self.assertIn('function slateframe_card_thumbnail_markup( $post_id )', media)
        self.assertIn('get_the_post_thumbnail(', media)
        self.assertIn('wp_kses_post( $html )', media)
        self.assertIn('while ( $markup_tags->next_tag() )', media)
        self.assertIn('in_array( $markup_tags->get_tag(), $interactive, true )', media)
        self.assertIn('slateframe_image_has_source( $processor->get_attribute(', media)
        self.assertIn('slateframe_normalize_image_alt( $processor )', media)

    def test_real_wordpress_browser_evidence_is_mandatory(self):
        browser = (ROOT / 'tests/browser/card-thumbnail.spec.js').read_text(encoding='utf-8')
        coverage = (ROOT / 'bin/check-visual-coverage.py').read_text(encoding='utf-8')
        name = 'card-filtered-thumbnail-390-rtl-400-forced-colors.png'
        self.assertIn(name, browser)
        self.assertIn(f'"{name}": 390', coverage)
        self.assertIn('sf_card_fragment', browser)
        self.assertIn('sf_card_missing_alt', browser)
        self.assertIn('AxeBuilder', browser)
        self.assertIn('sf_card_nested_link', browser)
        self.assertIn('card-interactive-thumbnail-390-rtl-400-forced-colors.png', browser)
        self.assertIn('card-interactive-thumbnail-390-rtl-400-forced-colors.png', coverage)


if __name__ == '__main__':
    unittest.main()
