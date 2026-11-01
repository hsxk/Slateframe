"""Execute real classic listing templates with WordPress-like filtered titles."""
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
function is_home() { return getenv('IS_HOME') === '1'; }
function is_front_page() { return getenv('IS_FRONT') === '1'; }
function single_post_title($prefix = '', $display = true) {
    $value = getenv('POSTS_TITLE');
    if ($display) { echo $value; } else { return $value; }
}
function get_bloginfo($key, $filter = '') { return getenv('SITE_NAME'); }
function __($value, $domain) { return $value; }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8', false); }
function esc_html__($value, $domain) { return esc_html($value); }
function esc_html_e($value, $domain) { echo esc_html($value); }
function get_search_query($escaped = true) { return getenv('SEARCH_QUERY'); }
function _n($one, $many, $count, $domain) { return $count === 1 ? $one : $many; }
function number_format_i18n($value) { return (string) $value; }
function get_search_form() { echo '<form data-fixture="search"></form>'; }
function have_posts() { return false; }
function get_template_part($path, $name) { echo '<div data-fixture="empty"></div>'; }
$wp_query = (object) array('found_posts' => 2, 'max_num_pages' => 0);
include getcwd() . '/' . getenv('TEMPLATE');
"""


class ListingReadableHeadings(unittest.TestCase):
    def render(self, template, **options):
        env = {**os.environ, 'TEMPLATE': template,
               'IS_HOME': '0', 'IS_FRONT': '0', 'SITE_NAME': 'Slateframe',
               'POSTS_TITLE': 'Writing', 'SEARCH_QUERY': 'R&D 日本語 العربية'}
        env.update({k: str(v) for k, v in options.items()})
        result = subprocess.run(['php', '-r', PHP], cwd=ROOT, env=env,
                                capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        match = re.search(r'<h1 class="slateframe-page-title">(.*?)</h1>',
                          result.stdout, re.S)
        self.assertIsNotNone(match, result.stdout)
        return result.stdout, unescape(re.sub(r'<[^>]+>', '', match.group(1))).strip()

    def test_site_title_is_preserved_on_normal_index(self):
        html, heading = self.render('index.php', SITE_NAME='العربية / 日本語 Slateframe')
        self.assertEqual(heading, 'العربية / 日本語 Slateframe')
        self.assertIn('<h1 class="slateframe-page-title"><bdi>', html)

    def test_posts_page_uses_core_page_title(self):
        _, heading = self.render('index.php', IS_HOME='1', IS_FRONT='0', POSTS_TITLE='中文 Writing')
        self.assertEqual(heading, '中文 Writing')

    def test_posts_front_page_uses_site_name(self):
        _, heading = self.render('index.php', IS_HOME='1', IS_FRONT='1', SITE_NAME='Home journal')
        self.assertEqual(heading, 'Home journal')

    def test_blank_site_name_falls_back(self):
        for title in ('', '\u200b', '\ufe0f', '&nbsp;', '\u3164'):
            with self.subTest(title=repr(title)):
                _, heading = self.render('index.php', SITE_NAME=title)
                self.assertEqual(heading, 'Latest posts')

    def test_blank_posts_page_title_falls_back(self):
        _, heading = self.render('index.php', IS_HOME='1', IS_FRONT='0', POSTS_TITLE='\u200b')
        self.assertEqual(heading, 'Latest posts')

    def test_index_escapes_filtered_html_without_losing_text(self):
        html, heading = self.render('index.php', SITE_NAME='<script>alert(1)</script> 日本語')
        self.assertNotIn('<script>', html)
        self.assertEqual(heading, '<script>alert(1)</script> 日本語')

    def test_search_preserves_escaped_multilingual_query_once(self):
        html, heading = self.render('search.php', SEARCH_QUERY='R&D "日本語" العربية')
        self.assertEqual(heading, 'Search results for: R&D "日本語" العربية')
        self.assertIn('<bdi>R&amp;D', html)
        self.assertNotIn('R&amp;amp;D', html)
        self.assertRegex(html, r'<bdi>2</bdi> results found')

    def test_search_empty_or_invisible_query_has_readable_heading(self):
        for query in ('', '\u200b', '\ufe0f', '&nbsp;', '\u2800'):
            with self.subTest(query=repr(query)):
                html, heading = self.render('search.php', SEARCH_QUERY=query)
                self.assertEqual(heading, 'Search results')
                self.assertNotIn('<h1 class="slateframe-page-title"><bdi>', html)
                self.assertIn('<form data-fixture="search">', html)

    def test_search_escapes_html_query(self):
        html, heading = self.render('search.php', SEARCH_QUERY='<img src=x onerror=alert(1)>日本語')
        self.assertNotIn('<img src=x', html)
        self.assertEqual(heading, 'Search results for: <img src=x onerror=alert(1)>日本語')

    def test_no_custom_query_or_forced_direction(self):
        for template in ('index.php', 'search.php'):
            source = (ROOT / template).read_text(encoding='utf-8')
            self.assertNotIn('WP_Query(', source)
            self.assertNotIn('dir="ltr"', source)
            self.assertNotIn('<script', source)
            self.assertIn('slateframe_has_readable_label(', source)
            self.assertIn('<bdi>', source)

    def test_php_syntax(self):
        for template in ('index.php', 'search.php'):
            run = subprocess.run(['php', '-l', str(ROOT / template)],
                                 capture_output=True, text=True, timeout=15)
            self.assertEqual(run.returncode, 0, run.stderr)


if __name__ == '__main__':
    unittest.main()
