"""Verify every WordPress Core CI download uses the existing bounded retry wrapper."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = (ROOT / '.github/workflows/quality.yml', ROOT / '.github/workflows/photography.yml')
RETRY = 'bash bin/retry-wp-core-download.sh'

class WordPressCoreDownloadWorkflowContract(unittest.TestCase):
    def test_all_five_core_installs_use_retry(self):
        total = 0
        for path in WORKFLOWS:
            source = path.read_text(encoding='utf-8')
            with self.subTest(path=path.name):
                self.assertNotRegex(source, r'(?m)^\s*wp core download\s')
                total += source.count(RETRY)
        self.assertEqual(total, 5)

    def test_matrix_is_preserved(self):
        quality = WORKFLOWS[0].read_text(encoding='utf-8')
        self.assertIn('bash bin/retry-wp-core-download.sh --path="$site" --version="${{ matrix.wordpress }}"', quality)
        self.assertIn("- wordpress: '6.7'", quality)
        self.assertIn("- wordpress: 'latest'", quality)

    def test_no_silenced_failures(self):
        for path in WORKFLOWS:
            self.assertNotRegex(path.read_text(encoding='utf-8'), r'(?m)^\s*bash bin/retry-wp-core-download\.sh[^\n]*(?:\|\|\s*true|continue-on-error)')
        wrapper = (ROOT / 'bin/retry-wp-core-download.sh').read_text(encoding='utf-8')
        self.assertIn('set -euo pipefail', wrapper)
        self.assertIn('after three bounded attempts', wrapper)

if __name__ == '__main__':
    unittest.main()
