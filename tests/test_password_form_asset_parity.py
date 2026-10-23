"""Keep native WordPress password forms styled without hidden discussion assets."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/password-form-assets.php.fixture'


class PasswordFormAssetParity(unittest.TestCase):
    def render(self, **case):
        result = subprocess.run(
            ['php', str(FIXTURE)], cwd=ROOT, capture_output=True, text=True,
            env={**os.environ, 'SLATEFRAME_PASSWORD_CASE': json.dumps(case)},
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        return json.loads(result.stdout)

    def test_locked_post_loads_core_password_form_controls(self):
        data = self.render(singular=True, locked=True)
        self.assertTrue(data['helper'])
        self.assertIn('slateframe-forms', data['styles'])

    def test_locked_post_hides_comment_styles_even_if_comments_open(self):
        data = self.render(singular=True, locked=True, open=True)
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_locked_post_hides_comment_styles_with_history(self):
        data = self.render(singular=True, locked=True, history=True)
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_locked_post_never_loads_reply_script(self):
        data = self.render(singular=True, locked=True, open=True, history=True, thread=True)
        self.assertNotIn('comment-reply', data['scripts'])

    def test_locked_post_retains_forms_after_filter_disables_detection(self):
        data = self.render(singular=True, locked=True, disable_forms_filter=True)
        self.assertFalse(data['helper'])
        self.assertIn('slateframe-forms', data['styles'])

    def test_unlocked_open_post_preserves_comment_styles(self):
        data = self.render(singular=True, open=True)
        self.assertIn('slateframe-comments', data['styles'])
        self.assertIn('slateframe-forms', data['styles'])

    def test_unlocked_open_post_preserves_threaded_reply(self):
        data = self.render(singular=True, open=True, thread=True)
        self.assertIn('comment-reply', data['scripts'])

    def test_unlocked_historical_comments_keep_styles_without_reply(self):
        data = self.render(singular=True, history=True, thread=True)
        self.assertIn('slateframe-comments', data['styles'])
        self.assertNotIn('comment-reply', data['scripts'])

    def test_unlocked_empty_post_does_not_load_forms(self):
        data = self.render(singular=True)
        self.assertNotIn('slateframe-forms', data['styles'])
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_authored_form_still_loads_generic_form_styles(self):
        data = self.render(singular=True, authored_form=True)
        self.assertIn('slateframe-forms', data['styles'])
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_search_form_preserves_css_dependency(self):
        data = self.render(search_form=True)
        self.assertIn('slateframe-forms', data['styles'])
        self.assertIn('slateframe-search-form', data['styles'])

    def test_locked_rtl_post_preserves_directional_layer(self):
        data = self.render(singular=True, locked=True, rtl=True)
        self.assertIn('slateframe-rtl', data['styles'])
        self.assertIn('slateframe-forms', data['styles'])

    def test_locked_post_preserves_authored_form_layer_without_comments(self):
        data = self.render(singular=True, locked=True, form_content=True)
        self.assertIn('slateframe-form-content', data['styles'])
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_non_singular_requests_do_not_infer_password_form(self):
        data = self.render(locked=True, open=True, history=True, thread=True)
        self.assertNotIn('slateframe-forms', data['styles'])
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_shared_stylesheet_is_never_duplicated(self):
        data = self.render(singular=True, locked=True, open=True, form_content=True)
        self.assertEqual(data['styles'].count('slateframe-forms'), 1)

    def test_source_preserves_core_owned_password_flow(self):
        source = (ROOT / 'functions.php').read_text(encoding='utf-8')
        self.assertIn('$password_form_needed = is_singular() && post_password_required();', source)
        self.assertIn('$comments_visible && comments_open()', source)
        self.assertNotIn('get_the_password_form()', source)


if __name__ == '__main__':
    unittest.main()
