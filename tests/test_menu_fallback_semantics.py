"""Exercise Slateframe's WordPress Core page-menu fallback with isolated PHP stubs."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = r'''
define('ABSPATH', '/tmp/');
$GLOBALS['options'] = json_decode($argv[1], true);
$GLOBALS['front'] = $argv[2] === '1';
function get_option($name) { return $GLOBALS['options'][$name] ?? false; }
function is_front_page() { return $GLOBALS['front']; }
function home_url($path) { return 'https://example.org/'; }
function esc_url($url) { return $url; }
function esc_html__($text, $domain) { return $text; }
function wp_kses_post($text) { return $text; }
function wp_list_pages($args) {
    $GLOBALS['menu_args'] = $args;
    $html = '';
    if (($args['exclude'] ?? '') !== '17') {
        $html .= '<li class="page_item"><a href="/front">Front</a></li>';
    }
    return $html . '<li class="page_item"><a href="/other">Other</a></li>';
}
require $argv[3];
ob_start(); slateframe_menu_fallback(); $html = ob_get_clean();
echo json_encode(['html' => $html, 'args' => $GLOBALS['menu_args']], JSON_THROW_ON_ERROR);
'''


def render(options, front):
    result = subprocess.run(
        ['php', '-r', PHP, json.dumps(options), '1' if front else '0',
         str(ROOT / 'inc' / 'template-tags.php')],
        check=True, capture_output=True, text=True, timeout=10,
    )
    return json.loads(result.stdout)


class MenuFallback(unittest.TestCase):
    def test_posts_front_page_has_one_current_home_link(self):
        data = render({'show_on_front': 'posts'}, True)
        self.assertIn('href="https://example.org/" aria-current="page">Home</a>', data['html'])
        self.assertNotIn('exclude', data['args'])
        self.assertEqual(data['html'].count('aria-current="page"'), 1)

    def test_static_front_page_not_duplicated(self):
        data = render({'show_on_front': 'page', 'page_on_front': '17'}, True)
        self.assertEqual(data['args']['exclude'], '17')
        self.assertNotIn('href="/front"', data['html'])
        self.assertIn('href="/other"', data['html'])
        self.assertEqual(data['html'].count('aria-current="page"'), 1)

    def test_separate_posts_page_does_not_mark_root_current(self):
        data = render({'show_on_front': 'page', 'page_on_front': 17}, False)
        self.assertEqual(data['args']['exclude'], '17')
        self.assertNotIn('aria-current="page"', data['html'])
        self.assertIn('href="/other"', data['html'])

    def test_invalid_front_page_id_does_not_exclude_unrelated_page(self):
        for bad in ([], {}, '17oops', '-17', '9999999999999999999999999999999999999'):
            with self.subTest(bad=bad):
                data = render({'show_on_front': 'page', 'page_on_front': bad}, False)
                self.assertNotIn('exclude', data['args'])
                self.assertIn('href="/front"', data['html'])

    def test_existing_menu_shape_and_no_current_state_on_other_pages(self):
        data = render({'show_on_front': 'posts'}, False)
        self.assertTrue(data['html'].startswith('<ul class="slateframe-menu-fallback">'))
        self.assertIn('class="page_item slateframe-home-link"', data['html'])
        self.assertTrue(data['html'].endswith('</ul>'))
        self.assertNotIn('aria-current="page"', data['html'])
        self.assertIs(data['args']['echo'], False)
        self.assertEqual(data['args']['title_li'], '')


if __name__ == '__main__':
    unittest.main()
