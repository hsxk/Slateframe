"""Execute the real single template with a minimal Core navigation adapter."""
from pathlib import Path
import json
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = r"""
function get_header() {}
function get_footer() {}
function have_posts() { static $count = 0; return $count++ === 0; }
function the_post() {}
function post_class($class) { echo 'class="' . $class . '"'; }
function slateframe_entry_meta() {}
function slateframe_get_display_title() { return '日本語 العربية'; }
function wp_kses_post($text) { return $text; }
function slateframe_featured_media() {}
function the_content() {}
function slateframe_content_pagination() {}
function slateframe_entry_footer() {}
function slateframe_related_posts() {}
function apply_filters($name, $value, $id) { return $value; }
function get_the_ID() { return 3; }
function esc_html__($text, $domain) { return $text; }
function the_post_navigation($args) { echo '<!--NAV:' . json_encode($args) . ':NAV-->'; }
function comments_open() { return false; }
function get_comments_number() { return 0; }
function slateframe_has_core_discussion_block($id) { return false; }
include getcwd() . '/single.php';
"""

class PostNavigationBidi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run = subprocess.run(['php', '-r', PHP], cwd=ROOT, capture_output=True,
                             text=True, timeout=15)
        if run.returncode:
            raise AssertionError(run.stderr)
        cls.html = run.stdout
        match = re.search(r'<!--NAV:(.*?):NAV-->', cls.html)
        if not match:
            raise AssertionError('Core navigation arguments missing')
        cls.nav = json.loads(match.group(1))

    def test_both_adjacent_titles_use_native_bidi_isolation(self):
        for side in ('prev', 'next'):
            with self.subTest(side=side):
                template = self.nav[side + '_text']
                self.assertIn('<span><bdi>%title</bdi></span>', template)
                self.assertEqual(template.count('%title'), 1)
                self.assertEqual(template.count('<bdi>'), 1)
                self.assertEqual(template.count('</bdi>'), 1)

    def test_localized_context_remains_visible_and_core_owned(self):
        self.assertIn('Previous post', self.nav['prev_text'])
        self.assertIn('Next post', self.nav['next_text'])
        self.assertIn('slateframe-post-navigation-label', self.nav['prev_text'])
        self.assertIn('slateframe-post-navigation-label', self.nav['next_text'])
        self.assertIn('slateframe-post-navigation', self.html)
        self.assertIn('日本語 العربية', self.html)

    def test_no_forced_direction_or_custom_adjacent_query(self):
        source = (ROOT / 'single.php').read_text(encoding='utf-8')
        self.assertNotIn('dir="ltr"', source)
        self.assertNotIn('WP_Query(', source)
        self.assertNotIn('get_adjacent_post(', source)
        self.assertNotIn('<script', source)
        self.assertIn('the_post_navigation(', source)

    def test_php_parses(self):
        run = subprocess.run(['php', '-l', str(ROOT / 'single.php')],
                             capture_output=True, text=True, timeout=15)
        self.assertEqual(run.returncode, 0, run.stderr)

if __name__ == '__main__':
    unittest.main()
