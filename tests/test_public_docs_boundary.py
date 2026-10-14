"""Keep public Slateframe documentation independent from private site histories."""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PublicDocumentationBoundary(unittest.TestCase):
    def test_public_docs_do_not_publish_site_specific_history(self):
        documents = [ROOT / 'README.md', ROOT / 'CHANGELOG.md', ROOT / 'CONTRIBUTING.md']
        documents.extend((ROOT / 'docs').glob('*.md'))
        legacy_site_identifier = re.compile(r'\btime[0-9]+(?:log|analyze)\b', re.IGNORECASE)
        for document in documents:
            with self.subTest(document=document.relative_to(ROOT)):
                self.assertIsNone(legacy_site_identifier.search(document.read_text()))

    def test_integration_boundaries_are_public_and_generic(self):
        text = (ROOT / 'docs/INTEGRATION-BOUNDARIES.md').read_text()
        for section in ('Supported theme responsibilities', 'Excluded site responsibilities', 'Acceptance'):
            self.assertIn(section, text)
        self.assertIn('docs/INTEGRATION-BOUNDARIES.md', (ROOT / 'README.md').read_text())
        self.assertIn('INTEGRATION-BOUNDARIES.md', (ROOT / 'docs/WPCODE-MIGRATION.md').read_text())


if __name__ == '__main__':
    unittest.main()
