"""Validate related-reading and 404 adapter post ID normalization with PHP runtime."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DiscoveryPostIds(unittest.TestCase):
    def test_php_runtime_boundaries(self):
        fixture = ROOT / "tests/fixtures/discovery-post-id-boundaries.php.fixture"
        result = subprocess.run(
            ["php", str(fixture)], cwd=ROOT, capture_output=True,
            text=True, check=False, timeout=20,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Discovery post ID boundaries: 21 cases passed", result.stdout)

    def test_core_first_query_contract(self):
        source = (ROOT / "inc/content-discovery.php").read_text(encoding="utf-8")
        self.assertIn("function slateframe_discovery_positive_ids(", source)
        self.assertIn("slateframe_discovery_positive_ids( $args['post__in'] )", source)
        self.assertIn("$args['post__not_in'] = array_values( array_unique( $excluded ) );", source)
        self.assertNotIn("time2log", source.lower())


if __name__ == "__main__":
    unittest.main()
