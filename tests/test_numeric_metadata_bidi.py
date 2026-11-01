"""Execute theme-owned numeric metadata in PHP and guard Core-first boundaries."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

PHP_SETUP = r'''
define('ABSPATH', '/tmp/');
function get_the_date($format = '') { return $format ? '2026-11-01T00:00:00+00:00' : '2026年11月1日 العربية'; }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function post_password_required() { return false; }
function get_comments_number() { global $argv; return (int) $argv[3]; }
function get_the_ID() { return 7; }
function absint($value) { return abs((int) $value); }
function have_comments() { return true; }
function _n($singular, $plural, $count, $domain) { return $count === 1 ? $singular : $plural; }
function number_format_i18n($count) { return (string) $count; }
function wp_list_comments($args) { echo '<li>Comment</li>'; }
function the_comments_navigation() {}
function comments_open() { return true; }
function comment_form($args) {}
'''

class NumericMetadataBidi(unittest.TestCase):
    def render(self, file, command, count=2):
        code = PHP_SETUP + "\ninclude $argv[1];\n" + command
        result = subprocess.run(['php', '-r', code, str(ROOT / file), 'unused', str(count)],
                                text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result.stdout

    def test_published_date_keeps_core_datetime_and_isolates_visible_text(self):
        html = self.render('inc/template-tags.php', 'slateframe_posted_on();')
        self.assertIn('datetime="2026-11-01T00:00:00+00:00"', html)
        self.assertIn('<bdi>2026年11月1日 العربية</bdi>', html)

    def test_comment_count_singular_and_plural(self):
        for count, phrase in [(1, 'response'), (12, 'responses')]:
            with self.subTest(count=count):
                html = self.render('comments.php', '', count)
                self.assertIn('<bdi>' + str(count) + '</bdi> ' + phrase, html)
                self.assertIn('Comment', html)

    def test_related_and_recovery_dates_are_isolated(self):
        for path in ('404.php', 'inc/content-discovery.php'):
            with self.subTest(path=path):
                source = (ROOT / path).read_text()
                self.assertIn('<time datetime="<?php echo esc_attr( get_the_date( DATE_W3C ) ); ?>"><bdi><?php echo esc_html( get_the_date() ); ?></bdi></time>', source)

    def test_attachment_metadata_and_parent_title_are_escaped(self):
        source = (ROOT / 'attachment.php').read_text()
        self.assertIn('<bdi><?php echo esc_html( $slateframe_value ); ?></bdi>', source)
        self.assertIn("'<bdi>' . esc_html( slateframe_get_display_title( $slateframe_parent_id ) ) . '</bdi>'", source)

    def test_no_forced_ltr_or_new_runtime_scripts(self):
        for name in ('comments.php', 'attachment.php', '404.php', 'inc/content-discovery.php', 'inc/template-tags.php'):
            source = (ROOT / name).read_text()
            self.assertNotIn('dir="ltr"', source)
            self.assertNotIn('<script', source)

    def test_php_syntax(self):
        for name in ('comments.php', 'attachment.php', '404.php', 'inc/content-discovery.php', 'inc/template-tags.php'):
            result = subprocess.run(['php', '-l', str(ROOT / name)], text=True, capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

if __name__ == '__main__':
    unittest.main()
