"""Protected Core posts must not expose or parse private presentation assets."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/hidden-presentation-assets.php.fixture'


class HiddenPresentationAssetParity(unittest.TestCase):
    def render(self, locked):
        proc = subprocess.run(
            ['php', str(FIXTURE)], cwd=ROOT, capture_output=True, text=True,
            env={**os.environ, 'SLATEFRAME_HIDDEN_CASE': json.dumps({'locked': locked})},
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr + proc.stdout)
        return json.loads(proc.stdout)

    def test_locked_content_never_activates_contextual_styles(self):
        state = self.render(True)
        for key in ('photography', 'content_modes', 'query_loop', 'form_content'):
            with self.subTest(key=key):
                self.assertFalse(state[key])
        self.assertEqual(state['synced'], [])
        self.assertEqual(state['forms'], {'forms': False, 'search_form': False, 'form_content': False})

    def test_locked_content_is_not_read_for_asset_detection(self):
        self.assertEqual(self.render(True)['post_reads'], 0)

    def test_unlocked_content_restores_contextual_styles(self):
        state = self.render(False)
        for key in ('photography', 'content_modes', 'query_loop', 'form_content'):
            with self.subTest(key=key):
                self.assertTrue(state[key])
        self.assertGreater(state['post_reads'], 0)

    def test_fixture_uses_actual_theme_selectors(self):
        fixture = FIXTURE.read_text(encoding='utf-8')
        self.assertIn("'function ' . $name . '() {'", fixture)
        self.assertIn('require $tmp;', fixture)
        self.assertNotIn('eval(', fixture)


if __name__ == '__main__':
    unittest.main()
