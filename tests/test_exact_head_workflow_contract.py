"""Guard PR-HEAD checkouts and enforce the real WordPress evidence gate."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
QUALITY = ROOT / '.github/workflows/quality.yml'
PHOTO = ROOT / '.github/workflows/photography.yml'


class ExactHeadWorkflowContract(unittest.TestCase):
    def test_every_quality_checkout_uses_exact_head(self):
        text = QUALITY.read_text(encoding='utf-8')
        blocks = re.findall(r'^\s+- uses: actions/checkout@v4\n((?:\s+[^\n]*\n){0,6})', text, re.M)
        self.assertGreaterEqual(len(blocks), 7, 'Every quality job must check out the same head SHA')
        for block in blocks:
            with self.subTest(checkout=block[:90]):
                self.assertIn('github.event.pull_request.head.sha || github.sha', block)
                self.assertIn('github.event.pull_request.head.repo.full_name || github.repository', block)
                self.assertIn('persist-credentials: false', block)

    def test_browser_evidence_matches_checked_out_head(self):
        text = QUALITY.read_text(encoding='utf-8')
        self.assertIn('SLATEFRAME_EVIDENCE_SHA:', text)
        self.assertIn('git rev-parse HEAD', text)
        self.assertIn('HEAD_SHA.txt', text)
        self.assertIn('tests/verify_footnotes_screenshots.py', text)
        self.assertNotIn('continue-on-error: true', text[text.index('- name: Require complete visual evidence'):text.index('- name: Upload browser artifacts')])

    def test_photo_workflow_already_uses_exact_head(self):
        text = PHOTO.read_text(encoding='utf-8')
        self.assertIn('github.event.pull_request.head.sha || github.sha', text)
        self.assertIn('github.event.pull_request.head.repo.full_name || github.repository', text)
        self.assertIn('persist-credentials: false', text)


if __name__ == '__main__':
    unittest.main()
