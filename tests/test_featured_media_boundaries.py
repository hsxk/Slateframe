"""Exercise real featured-media helper against malformed Core adapter output."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class FeaturedMediaBoundaries(unittest.TestCase):
    def test_php_runtime_boundaries(self):
        fixture = ROOT / "tests/fixtures/featured-media-boundaries.php.fixture"
        result = subprocess.run(
            ["php", str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("Featured media boundaries: 41 cases passed", result.stdout)

    def test_core_image_processor_contract(self):
        source = (ROOT / "inc/template-tags.php").read_text(encoding="utf-8")
        self.assertIn("! is_string( $image_html )", source)
        self.assertIn("! $image_processor->next_tag( 'img' )", source)
        self.assertIn("$image_processor->set_attribute( 'fetchpriority', 'high' );", source)
        self.assertIn("$image_html      = wp_kses_post( $image_html );", source)
        self.assertLess(
            source.index("$image_html      = wp_kses_post( $image_html );"),
            source.index("$image_processor = new WP_HTML_Tag_Processor( $image_html );"),
        )
        self.assertIn("get_attribute( 'src' )", source)
        self.assertIn("get_attribute( 'srcset' )", source)
        self.assertIn("if ( ! $has_source )", source)
        self.assertIn("$image_html = $image_processor->get_updated_html();", source)
        self.assertNotIn("time2log", source.lower())


if __name__ == "__main__":
    unittest.main()
