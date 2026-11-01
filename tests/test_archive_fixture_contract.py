"""Guard request-scoped archive test fixtures in serialized CI."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ArchiveFixtureContract(unittest.TestCase):
    def test_filter_is_request_scoped_and_cleaned_up(self):
        source = (ROOT / 'tests/browser/archive-readable-heading.spec.js').read_text(encoding='utf-8')
        self.assertIn("sf_archive_title_test", source)
        self.assertIn("get_the_archive_title", source)
        self.assertIn("finally {", source)
        self.assertIn("fs.rm(plugin", source)
        self.assertIn("flag: 'wx'", source)

    def test_fixture_runs_in_stateful_phase(self):
        source = (ROOT / 'tests/browser/archive-readable-heading.spec.js').read_text(encoding='utf-8')
        self.assertIn('execFileSync(', source)
        self.assertIn("wp('term', 'get'", source)


if __name__ == '__main__':
    unittest.main()
