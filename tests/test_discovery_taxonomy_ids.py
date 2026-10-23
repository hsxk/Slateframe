"""Ensure malformed taxonomy adapter results cannot break related reading."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class DiscoveryTaxonomyIds(unittest.TestCase):
    def test_php_runtime_boundary(self):
        fixture = ROOT / 'tests/fixtures/discovery-taxonomy-ids.php.fixture'
        result = subprocess.run(['php', str(fixture)], cwd=ROOT, capture_output=True,
                                text=True, check=False, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Discovery taxonomy boundaries: 21 cases passed', result.stdout)

    def test_core_first_contract(self):
        source = (ROOT / 'inc/content-discovery.php').read_text(encoding='utf-8')
        self.assertIn('slateframe_discovery_taxonomy_ids( wp_get_post_tags(', source)
        self.assertIn('slateframe_discovery_taxonomy_ids( wp_get_post_categories(', source)
        self.assertIn("$args['post_status']         = 'publish';", source)
        self.assertNotIn('time2log', source.lower())


if __name__ == '__main__':
    unittest.main()
