"""Execute the real Slateframe author archive with malformed Core display names."""
from pathlib import Path
import os
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = r"""
define('ABSPATH', '/');
function wp_strip_all_tags($value) { return strip_tags($value); }
function get_queried_object_id() { return 7; }
function get_the_author_meta($key, $id = 0) { return $key === 'display_name' ? getenv('AUTHOR_NAME') : getenv('AUTHOR_BIO'); }
function apply_filters($name, $value, ...$args) { return $value; }
function __($value, $domain) { return $value; }
function get_header() {}
function get_footer() {}
function have_posts() { return false; }
function get_template_part($slug, $name) {}
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
$wp_query = (object) ['max_num_pages' => 1];
require getcwd() . '/inc/template-tags.php';
include getcwd() . '/author.php';
"""

class AuthorReadableIdentity(unittest.TestCase):
    def render(self, name, bio=''):
        run = subprocess.run(['php', '-r', PHP], cwd=ROOT, capture_output=True,
            text=True, timeout=15, env={**os.environ, 'AUTHOR_NAME': name, 'AUTHOR_BIO': bio})
        self.assertEqual(run.returncode, 0, run.stderr)
        return run.stdout

    def test_empty_and_unicode_invisible_names_use_localized_heading(self):
        for value in ('', ' ', '&nbsp;', '\u200b', '\ufe0f', '\u3164', '\u2800', '\u0301', '<i></i>'):
            with self.subTest(value=repr(value)):
                html = self.render(value, '&nbsp;')
                self.assertIn('<h1 class="slateframe-page-title"><bdi>Author</bdi></h1>', html)
                self.assertNotIn('slateframe-archive-description', html)
                self.assertIn('id="main-content"', html)

    def test_valid_mixed_author_and_bio_keep_native_bdi_and_escaping(self):
        html = self.render('日本語 العربية & Alice', '中文 / العربية')
        self.assertIn('<bdi>日本語 العربية &amp; Alice</bdi>', html)
        self.assertIn('<bdi>中文 / العربية</bdi>', html)
        self.assertNotIn('dir="ltr"', html)

    def test_markup_only_bio_is_not_rendered(self):
        html = self.render('0', '<span></span>')
        self.assertIn('<bdi>0</bdi>', html)
        self.assertNotIn('slateframe-archive-description', html)

    def test_no_core_author_archive_query_or_link_override(self):
        source = (ROOT / 'author.php').read_text(encoding='utf-8')
        self.assertIn('slateframe_has_readable_label( $slateframe_author_name )', source)
        self.assertIn('slateframe_has_readable_label( $slateframe_author_bio )', source)
        self.assertNotIn('WP_Query(', source)
        self.assertNotIn('dir="ltr"', source)

if __name__ == '__main__':
    unittest.main()
