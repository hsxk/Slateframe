"""Execute the real Slateframe author byline helper under mixed text directions."""
from html.parser import HTMLParser
from pathlib import Path
import os
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = r"""
define('ABSPATH', '/');
function get_post_type() { return 'post'; }
function wp_strip_all_tags($value) { return strip_tags($value); }
function get_the_author_meta($key) { return '7'; }
function get_the_author() { return getenv('EMPTY_AUTHOR') === '1' ? '' : (getenv('AUTHOR_NAME') !== false ? getenv('AUTHOR_NAME') : 'العربية / 日本語 — Alice & Bob'); }
function get_author_posts_url($id) { return getenv('NO_AUTHOR_URL') === '1' ? '' : '/author/alice/'; }
function apply_filters($name, $value, ...$args) { return $value; }
function esc_url_raw($value) { return $value; }
function esc_url($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_attr($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function esc_html__($value, $domain) { return $value; }
function get_the_date($format = null) { return $format ? '2026-11-01T12:00:00+09:00' : 'November 1, 2026'; }
require getcwd() . '/inc/template-tags.php';
slateframe_entry_meta();
"""

class IsolateParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.isolates = []

    def handle_starttag(self, tag, attrs):
        if tag == 'bdi':
            self.isolates.append(tuple(self.stack))
        self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.stack:
            self.stack = self.stack[:len(self.stack) - 1 - self.stack[::-1].index(tag)]

class EntryBylineBidi(unittest.TestCase):
    def render(self, **env_vars):
        result = subprocess.run(['php', '-r', PHP], cwd=ROOT, text=True,
                                capture_output=True, timeout=15,
                                env={**os.environ, **env_vars})
        self.assertEqual(result.returncode, 0, result.stderr)
        parser = IsolateParser()
        parser.feed(result.stdout)
        return result.stdout, parser.isolates

    def test_linked_mixed_author_is_isolated_without_changing_core_url(self):
        html, isolates = self.render()
        author_isolates = [path for path in isolates if 'time' not in path]
        date_isolates = [path for path in isolates if 'time' in path]
        self.assertEqual(len(author_isolates), 1)
        self.assertIn('a', author_isolates[0])
        self.assertEqual(len(date_isolates), 1)
        self.assertIn('href="/author/alice/"', html)
        self.assertIn('<bdi>العربية / 日本語 — Alice &amp; Bob</bdi>', html)
        self.assertIn('datetime="2026-11-01T12:00:00+09:00"', html)
        self.assertIn('class="slateframe-meta-separator" aria-hidden="true"', html)

    def test_unlinked_author_keeps_isolation_without_empty_anchor(self):
        html, isolates = self.render(NO_AUTHOR_URL='1')
        self.assertEqual(len([path for path in isolates if 'time' not in path]), 1)
        self.assertEqual(len([path for path in isolates if 'time' in path]), 1)
        self.assertNotIn('<a ', html)
        self.assertIn('<bdi>العربية / 日本語 — Alice &amp; Bob</bdi>', html)

    def test_empty_author_does_not_emit_empty_isolation(self):
        html, isolates = self.render(EMPTY_AUTHOR='1')
        self.assertEqual([path for path in isolates if 'time' not in path], [])
        self.assertEqual(len([path for path in isolates if 'time' in path]), 1)
        self.assertNotIn('slateframe-meta-byline', html)
        self.assertIn('slateframe-published', html)

    def test_invisible_only_author_does_not_create_nameless_link(self):
        for value in ('&nbsp;', '\u200b', '\ufe0f', '\u3164', '\u2800', '\u0301'):
            with self.subTest(value=repr(value)):
                html, isolates = self.render(AUTHOR_NAME=value)
                self.assertEqual(len([path for path in isolates if 'time' not in path]), 0)
                self.assertEqual(len([path for path in isolates if 'time' in path]), 1)
                self.assertNotIn('slateframe-meta-byline', html)
                self.assertNotIn('<a ', html)

    def test_does_not_force_ltr_direction_or_add_script(self):
        source = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        self.assertIn('<a href="%2$s"><bdi>%3$s</bdi></a>', source)
        self.assertIn('<bdi>%2$s</bdi></span>', source)
        self.assertNotIn('dir="ltr"', source)
        self.assertNotIn('<script', self.render()[0])

if __name__ == '__main__':
    unittest.main()
