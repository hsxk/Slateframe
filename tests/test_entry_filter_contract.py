"""Exercise public Slateframe author/taxonomy adapter boundaries with PHP stubs."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class EntryFilterContract(unittest.TestCase):
    def test_invalid_filter_returns_do_not_break_post_rendering(self):
        fixture = ROOT / 'tests/fixtures/entry-filter-contract.php.fixture'
        result = subprocess.run(['php', str(fixture)], cwd=ROOT, capture_output=True,
                                text=True, check=False, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Entry filter boundaries: 17 cases passed', result.stdout)

    def test_public_filters_remain_site_neutral(self):
        source = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        self.assertIn("apply_filters( 'slateframe_author_url'", source)
        self.assertIn("esc_url_raw( $author_url )", source)
        self.assertIn("is_string( $categories )", source)
        self.assertIn("is_string( $tags )", source)
        self.assertNotIn('time2log', source.lower())


if __name__ == '__main__':
    unittest.main()
