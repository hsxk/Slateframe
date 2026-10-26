"""Keep closed, empty single posts free of phantom comment landmarks."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/single-comments-gate.php.fixture'


class SingleCommentsGate(unittest.TestCase):
    def render(self, opened, count, block=''):
        result = subprocess.run(
            ['php', str(FIXTURE)], cwd=ROOT, capture_output=True, text=True,
            env={**os.environ, 'SLATEFRAME_COMMENTS_OPEN': str(int(opened)),
                 'SLATEFRAME_COMMENTS_COUNT': str(count),
                 'SLATEFRAME_COMMENTS_BLOCK': block}, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_closed_post_without_comments_has_no_empty_comments_landmark(self):
        page = self.render(False, 0)
        self.assertEqual(page['calls'], 0)
        self.assertFalse(page['has_comments_section'])
        self.assertTrue(page['has_main'])

    def test_open_post_without_comments_renders_form_container(self):
        page = self.render(True, 0)
        self.assertEqual(page['calls'], 1)
        self.assertTrue(page['has_comments_section'])

    def test_closed_post_with_history_preserves_comments(self):
        page = self.render(False, 3)
        self.assertEqual(page['calls'], 1)
        self.assertTrue(page['has_comments_section'])

    def test_native_core_comments_owns_the_discussion(self):
        for block in ('core/comments', 'core/post-comments', 'core/post-comments-form'):
            with self.subTest(block=block):
                page = self.render(True, 3, block)
                self.assertEqual(page['calls'], 0)
                self.assertFalse(page['has_comments_section'])
                self.assertTrue(page['has_main'])

    def test_open_post_with_history_renders_only_once(self):
        page = self.render(True, 3)
        self.assertEqual(page['calls'], 1)
        self.assertTrue(page['has_comments_section'])


if __name__ == '__main__':
    unittest.main()
