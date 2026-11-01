"""Executable classic archive template regression with filtered Core titles."""
from html import unescape
from pathlib import Path
import os
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = r"""
define('ABSPATH', __DIR__);
function wp_strip_all_tags($text) { return strip_tags($text); }
require getcwd() . '/inc/template-tags.php';
function get_header() {}
function get_footer() {}
function get_the_archive_title() {
    return getenv('ARCHIVE_NONSTRING') === '1' ? array('unexpected') : getenv('ARCHIVE_TITLE');
}
function is_category() { return getenv('ARCHIVE_TYPE') === 'category'; }
function is_tag() { return getenv('ARCHIVE_TYPE') === 'tag'; }
function is_date() { return getenv('ARCHIVE_TYPE') === 'date'; }
function is_post_type_archive() { return getenv('ARCHIVE_TYPE') === 'post_type'; }
function __($text, $domain) { return $text; }
function wp_kses_post($text) { return strip_tags($text, '<span><em><strong>'); }
function the_archive_description($before, $after) {
    $description = getenv('ARCHIVE_DESCRIPTION');
    if ($description !== '') { echo $before . $description . $after; }
}
function have_posts() { return false; }
function get_template_part($path, $name) { echo '<div data-fixture="empty"></div>'; }
$wp_query = (object) array('max_num_pages' => 0);
include getcwd() . '/archive.php';
"""


class ArchiveReadableHeading(unittest.TestCase):
    def render(self, title, description='', nonstring=False, archive_type='other'):
        env = {**os.environ, 'ARCHIVE_TITLE': title,
               'ARCHIVE_DESCRIPTION': description, 'ARCHIVE_NONSTRING': '1' if nonstring else '0', 'ARCHIVE_TYPE': archive_type}
        result = subprocess.run(['php', '-r', PHP], cwd=ROOT, env=env,
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        match = re.search(r'<h1 class="slateframe-page-title"><bdi>(.*?)</bdi></h1>',
                          result.stdout, re.S)
        self.assertIsNotNone(match, result.stdout)
        return result.stdout, unescape(re.sub(r'<[^>]+>', '', match.group(1)))

    def test_core_category_prefix_and_markup_are_preserved(self):
        html, title = self.render('<span class="archive-title-prefix">Category:</span> 日本語')
        self.assertEqual(title, 'Category: 日本語')
        self.assertIn('<span class="archive-title-prefix">', html)

    def test_multilingual_term_name_is_not_replaced(self):
        for title in ('التصنيف: العربية', '分類：日本語', '分类：中文',
                      'Tag: café', 'Archive: 🧭', 'Date: 2026'):
            with self.subTest(title=title):
                _, actual = self.render(title)
                self.assertEqual(actual, title)

    def test_empty_unicode_and_html_only_titles_have_fallback(self):
        for title in ('', ' ', '\u200b', '\ufe0f', '\u3164', '\u2800',
                      '&nbsp;', '<span></span>', '<span>\u200b</span>'):
            with self.subTest(title=repr(title)):
                html, actual = self.render(title)
                self.assertEqual(actual, 'Archive')
                self.assertEqual(html.count('<h1 '), 1)

    def test_contextual_fallbacks_are_localized_and_not_technical(self):
        for kind, label in [('category', 'Category archive'),
                            ('tag', 'Tag archive'), ('date', 'Date archive'),
                            ('post_type', 'Content archive'), ('other', 'Archive')]:
            with self.subTest(kind=kind):
                _, actual = self.render('\u200b', archive_type=kind)
                self.assertEqual(actual, label)

    def test_nonstring_filter_value_falls_back_without_warning(self):
        html, title = self.render('ignored', nonstring=True)
        self.assertEqual(title, 'Archive')
        self.assertNotIn('Warning:', html)

    def test_safe_core_prefix_is_not_escaped_as_literal_markup(self):
        html, _ = self.render('<span class="archive-title-prefix">Tag:</span> C++')
        self.assertIn('<span class="archive-title-prefix">Tag:</span> C++', html)
        self.assertNotIn('&lt;span', html)

    def test_filtered_script_markup_does_not_execute(self):
        html, _ = self.render('<script>alert(1)</script> Knowledge')
        self.assertNotIn('<script>', html)
        self.assertIn('Knowledge', html)

    def test_description_and_core_empty_state_remain(self):
        html, _ = self.render('Portfolio', '<p>Long form description</p>')
        self.assertIn('<div class="slateframe-archive-description"><p>Long form description</p></div>', html)
        self.assertIn('data-fixture="empty"', html)

    def test_no_custom_query_or_forced_direction(self):
        source = (ROOT / 'archive.php').read_text(encoding='utf-8')
        self.assertNotIn('WP_Query(', source)
        self.assertNotIn('dir="ltr"', source)
        self.assertIn('get_the_archive_title()', source)
        self.assertIn('slateframe_has_readable_label(', source)
        self.assertIn('the_archive_description(', source)

    def test_php_syntax(self):
        run = subprocess.run(['php', '-l', str(ROOT / 'archive.php')],
                             capture_output=True, text=True, timeout=15)
        self.assertEqual(run.returncode, 0, run.stderr)


if __name__ == '__main__':
    unittest.main()
