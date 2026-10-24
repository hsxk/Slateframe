"""Protect attachment recovery links from non-public parent metadata."""
import json
import os
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/attachment-parent-visibility.php.fixture'


class AttachmentParentVisibility(unittest.TestCase):
    def render(self, **case):
        result = subprocess.run(
            ['php', str(FIXTURE)], cwd=ROOT, capture_output=True, text=True,
            env={**os.environ, 'SLATEFRAME_ATTACHMENT_PARENT_CASE': json.dumps(case)},
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        return json.loads(result.stdout)

    def test_published_post_parent_keeps_recovery_link(self):
        self.assertEqual(self.render(parent=7, public=True)['result'], 7)

    def test_published_page_parent_keeps_recovery_link(self):
        self.assertEqual(self.render(parent=27, public=True)['result'], 27)

    def test_publicly_queryable_custom_post_type_is_supported(self):
        self.assertEqual(self.render(parent=83, public=True)['result'], 83)

    def test_password_protected_published_parent_remains_viewable(self):
        self.assertEqual(self.render(parent=29, public=True)['result'], 29)

    def test_private_parent_is_not_exposed(self):
        self.assertEqual(self.render(parent=17, public=False)['result'], 0)

    def test_draft_parent_is_not_exposed(self):
        self.assertEqual(self.render(parent=18, public=False)['result'], 0)

    def test_scheduled_parent_is_not_exposed(self):
        self.assertEqual(self.render(parent=19, public=False)['result'], 0)

    def test_trashed_parent_is_not_exposed(self):
        self.assertEqual(self.render(parent=20, public=False)['result'], 0)

    def test_non_viewable_custom_type_is_not_exposed(self):
        self.assertEqual(self.render(parent=21, public=False)['result'], 0)

    def test_orphan_attachment_does_not_query_visibility(self):
        data = self.render(parent=0, public=True)
        self.assertEqual(data['result'], 0)
        self.assertEqual(data['calls']['public'], 0)

    def test_missing_parent_does_not_query_visibility(self):
        data = self.render(public=True)
        self.assertEqual(data['result'], 0)
        self.assertEqual(data['calls']['public'], 0)

    def test_invalid_negative_parent_does_not_query_visibility(self):
        data = self.render(parent=-2, public=True)
        self.assertEqual(data['result'], 0)
        self.assertEqual(data['calls']['public'], 0)

    def test_decimal_string_parent_uses_exact_public_id(self):
        data = self.render(parent="184", public=True)
        self.assertEqual(data['result'], 184)
        self.assertEqual(data['checked_parent'], 184)
        self.assertEqual(data['calls']['public'], 1)

    def test_malformed_parent_never_checks_an_unrelated_public_post(self):
        malformed = (
            True, False, 7.0, [7], {"ID": 7}, "7.0", "7e0",
            "+7", " 7", "7 ", "9999999999999999999999999999999999",
        )
        for parent in malformed:
            with self.subTest(parent=parent):
                data = self.render(parent=parent, public=True)
                self.assertEqual(data['result'], 0)
                self.assertEqual(data['calls']['public'], 0)
                self.assertIsNone(data['checked_parent'])

    def test_parent_filter_does_not_coerce_boolean_to_post_one(self):
        data = self.render(parent=True, public=True)
        self.assertEqual(data['result'], 0)
        self.assertEqual(data['calls']['public'], 0)

    def test_parent_filter_does_not_coerce_array_to_post_one(self):
        data = self.render(parent=[1], public=True)
        self.assertEqual(data['result'], 0)
        self.assertEqual(data['calls']['public'], 0)

    def test_parent_filter_does_not_saturate_overflow_to_max_int(self):
        data = self.render(parent="999999999999999999999999999999", public=True)
        self.assertEqual(data['result'], 0)
        self.assertEqual(data['calls']['public'], 0)

    def test_public_check_uses_exact_parent_id(self):
        data = self.render(parent=184, public=True)
        self.assertEqual(data['checked_parent'], 184)
        self.assertEqual(data['calls']['public'], 1)

    def test_attachment_id_is_normalized_for_core(self):
        data = self.render(parent=9, public=True, attachment=-42)
        self.assertEqual(data['attachment_id'], 42)

    def test_template_never_uses_raw_parent_id(self):
        source = (ROOT / 'attachment.php').read_text(encoding='utf-8')
        self.assertIn('slateframe_public_attachment_parent_id( $slateframe_attachment_id )', source)
        self.assertNotIn('wp_get_post_parent_id( $slateframe_attachment_id )', source)
        self.assertIn('if ( $slateframe_parent_id )', source)

    def test_helper_delegates_visibility_to_wordpress_core(self):
        source = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        self.assertIn('is_post_publicly_viewable( $parent_id )', source)
        self.assertNotIn("current_user_can( 'read_post'", source)


if __name__ == '__main__':
    unittest.main()
