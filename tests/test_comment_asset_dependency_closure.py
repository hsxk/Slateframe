"""Validate WordPress CSS dependency closure for open and historical comments."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/comments-style-closure.php.fixture'

class CommentAssetDependencyClosure(unittest.TestCase):
    def run_case(self, **flags):
        result = subprocess.run(
            ['php', str(FIXTURE)], cwd=ROOT, capture_output=True, text=True,
            env={**os.environ, 'SLATEFRAME_COMMENTS_CASE': json.dumps(flags)},
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        return json.loads(result.stdout)

    def test_closed_thread_with_history_loads_both_css_layers(self):
        data = self.run_case(singular=True, count=3)
        self.assertIn('slateframe-comments', data['styles'])
        self.assertIn('slateframe-forms', data['styles'])
        self.assertNotIn('comment-reply', data['scripts'])

    def test_open_thread_without_history_loads_both_css_layers(self):
        data = self.run_case(singular=True, open=True)
        self.assertIn('slateframe-comments', data['styles'])
        self.assertIn('slateframe-forms', data['styles'])

    def test_open_thread_reply_script_requires_thread_option(self):
        data = self.run_case(singular=True, open=True, thread=True)
        self.assertIn('comment-reply', data['scripts'])

    def test_closed_thread_never_enqueues_reply_script(self):
        data = self.run_case(singular=True, count=4, thread=True)
        self.assertNotIn('comment-reply', data['scripts'])

    def test_empty_closed_thread_has_no_comment_assets(self):
        data = self.run_case(singular=True)
        self.assertNotIn('slateframe-comments', data['styles'])
        self.assertNotIn('slateframe-forms', data['styles'])

    def test_non_singular_does_not_load_comment_assets(self):
        data = self.run_case(count=5, open=True)
        self.assertNotIn('slateframe-comments', data['styles'])
        self.assertNotIn('comment-reply', data['scripts'])

    def test_unrelated_authored_form_does_not_load_comments(self):
        data = self.run_case(singular=True, form_content=True)
        self.assertIn('slateframe-forms', data['styles'])
        self.assertIn('slateframe-form-content', data['styles'])
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_search_form_dependency_is_closed(self):
        data = self.run_case(search_form=True)
        self.assertIn('slateframe-forms', data['styles'])
        self.assertIn('slateframe-search-form', data['styles'])

    def test_normal_forms_only_does_not_load_comments(self):
        data = self.run_case(forms=True)
        self.assertIn('slateframe-forms', data['styles'])
        self.assertNotIn('slateframe-comments', data['styles'])

    def test_rtl_closed_comments_preserve_dependency(self):
        data = self.run_case(singular=True, count=2, rtl=True)
        self.assertIn('slateframe-rtl', data['styles'])
        self.assertIn('slateframe-comments', data['styles'])
        self.assertIn('slateframe-forms', data['styles'])

    def test_combined_filters_and_comments_do_not_duplicate_handles(self):
        data = self.run_case(singular=True, count=2, forms=True, form_content=True, search_form=True)
        self.assertEqual(data['styles'].count('slateframe-forms'), 1)
        self.assertEqual(data['styles'].count('slateframe-comments'), 1)

    def test_dynamic_photo_opt_in_is_contextual(self):
        data = self.run_case(singular=True, photo_opt_in=True)
        self.assertIn('slateframe-photography', data['styles'])
        self.assertNotIn('slateframe-content-modes', data['styles'])
        self.assertNotIn('slateframe-query-loop', data['styles'])

    def test_dynamic_knowledge_opt_in_does_not_force_query_loop(self):
        data = self.run_case(singular=True, content_opt_in=True)
        self.assertIn('slateframe-content-modes', data['styles'])
        self.assertNotIn('slateframe-query-loop', data['styles'])
        self.assertNotIn('slateframe-photography', data['styles'])

    def test_dynamic_query_loop_opt_in_preserves_dependency_closure(self):
        data = self.run_case(singular=True, query_opt_in=True)
        self.assertIn('slateframe-query-loop', data['styles'])
        self.assertIn('slateframe-content-modes', data['styles'])
        self.assertNotIn('slateframe-photography', data['styles'])

    def test_false_plugin_filter_cannot_suppress_native_photo(self):
        data = self.run_case(singular=True, native_photo=True, filter_force_false=True)
        self.assertIn('slateframe-photography', data['styles'])

    def test_false_plugin_filter_cannot_suppress_native_query_loop(self):
        data = self.run_case(singular=True, native_query=True, filter_force_false=True)
        self.assertIn('slateframe-query-loop', data['styles'])
        self.assertIn('slateframe-content-modes', data['styles'])

    def test_comment_assets_keep_existing_core_first_dependencies(self):
        source = (ROOT / 'functions.php').read_text(encoding='utf-8')
        self.assertIn('$forms_needed || $form_content_needed || $search_form_needed || $comments_needed', source)
        self.assertIn("array( 'slateframe-reading', 'slateframe-forms' )", source)
        self.assertIn('if ( $comments_needed ) {', source)
        self.assertIn("if ( $comments_open && get_option( 'thread_comments' ) ) {", source)

if __name__ == '__main__':
    unittest.main()
