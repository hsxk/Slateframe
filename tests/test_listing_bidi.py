"""Execute listing templates against a minimal WordPress output contract."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

PHP_FIXTURE = r'''
define('ABSPATH', '/');
function wp_strip_all_tags($value) { return strip_tags($value); }
function __($value, $domain) { return $value; }
$mode = $argv[2];
$GLOBALS['wp_query'] = (object) ['max_num_pages' => 1, 'found_posts' => $mode === 'one' ? 1 : ($mode === 'zero' ? 0 : 12)];
function get_header() {}
function get_footer() {}
function have_posts() { return false; }
function get_template_part($a, $b) {}
function get_search_form() { echo '<form role="search"></form>'; }
function the_archive_title($before, $after) { echo $before . '<span class="screen-reader-text">Archives:</span> 日本語 العربية' . $after; }
function the_archive_description($before, $after) { echo $before . 'Archive description' . $after; }
function get_queried_object_id() { return 1; }
function get_the_author_meta($field, $id) { global $mode; return $field === 'display_name' ? ($mode === 'hostile' ? '<script>alert(1)</script>' : '日本語 العربية') : 'Author biography'; }
function apply_filters($name, $value, $id) { return $value; }
function wp_kses_post($value) { return $value; }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function is_home() { return true; }
function is_front_page() { global $mode; return $mode === 'front'; }
function single_post_title() { echo '日本語 العربية'; }
function bloginfo($field) { echo 'Slateframe 日本語 العربية'; }
function get_search_query($escaped = true) { global $mode; return $mode === 'hostile' ? '<img onerror=alert(1)>' : '日本語 العربية'; }
function esc_html__($value, $domain) { return $value; }
function _n($singular, $plural, $count, $domain) { return $count === 1 ? $singular : $plural; }
function number_format_i18n($number) { return (string) $number; }
require getcwd() . '/inc/template-tags.php';
include $argv[1];
'''

class ListingBidi(unittest.TestCase):
    def render(self, path, mode='listing'):
        result = subprocess.run(
            ['php', '-r', PHP_FIXTURE, str(ROOT / path), mode],
            text=True, capture_output=True, timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout

    def test_author_name_and_bio(self):
        html = self.render('author.php')
        self.assertIn('<h1 class="slateframe-page-title"><bdi>日本語 العربية</bdi></h1>', html)
        self.assertIn('<p class="slateframe-archive-description"><bdi>Author biography</bdi></p>', html)

    def test_archive_preserves_core_prefix_and_description(self):
        html = self.render('archive.php')
        self.assertIn('<h1 class="slateframe-page-title"><bdi><span class="screen-reader-text">Archives:</span> 日本語 العربية</bdi></h1>', html)
        self.assertIn('Archive description', html)

    def test_posts_index_title(self):
        self.assertRegex(self.render('index.php'),
                         r'<h1 class="slateframe-page-title"><bdi>\s*日本語 العربية\s*</bdi></h1>')

    def test_front_index_site_name(self):
        self.assertRegex(self.render('index.php', 'front'),
                         r'<h1 class="slateframe-page-title"><bdi>\s*Slateframe 日本語 العربية\s*</bdi></h1>')

    def test_search_query_and_localized_count(self):
        html = self.render('search.php')
        self.assertIn('Search results for: <bdi>日本語 العربية</bdi>', html)
        self.assertIn('<bdi>12</bdi> results found', html)
        self.assertIn('<form role="search">', html)

    def test_singular_and_zero_search_counts_keep_isolation(self):
        self.assertIn('<bdi>1</bdi> result found', self.render('search.php', 'one'))
        self.assertIn('<bdi>0</bdi> results found', self.render('search.php', 'zero'))

    def test_author_name_and_search_query_are_escaped(self):
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;', self.render('author.php', 'hostile'))
        self.assertIn('&lt;img onerror=alert(1)&gt;', self.render('search.php', 'hostile'))
        self.assertNotIn('<script>alert(1)</script>', self.render('author.php', 'hostile'))

    def test_no_forced_direction_or_runtime_assets(self):
        for path in ('author.php', 'archive.php', 'index.php', 'search.php'):
            with self.subTest(path=path):
                source = (ROOT / path).read_text(encoding='utf-8')
                self.assertNotIn('dir="ltr"', source)
                self.assertNotIn('<script', source)
                self.assertNotIn('unicode-bidi:', source)

    def test_changed_templates_parse(self):
        for path in ('author.php', 'archive.php', 'index.php', 'search.php'):
            with self.subTest(path=path):
                result = subprocess.run(['php', '-l', str(ROOT / path)],
                                        text=True, capture_output=True, timeout=15)
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

if __name__ == '__main__':
    unittest.main()
