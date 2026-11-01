"""Exercise Slateframe's native page-menu fallback with isolated PHP Core stubs."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
PHP = r'''
define('ABSPATH', '/tmp/');
class WP_HTML_Tag_Processor {
    private $html;
    private $offset = 0;
    private $classes = '';
    public function __construct($html) { $this->html = $html; }
    public function next_tag($tag = 'li') {
        if (!preg_match('/<' . preg_quote($tag, '/') . '\\b[^>]*>/i', $this->html, $match, PREG_OFFSET_CAPTURE, $this->offset)) {
            return false;
        }
        $this->offset = $match[0][1] + strlen($match[0][0]);
        $this->classes = '';
        if (preg_match('/class="([^"]*)"/', $match[0][0], $class)) {
            $this->classes = $class[1];
        }
        return true;
    }
    public function has_class($name) {
        return in_array($name, preg_split('/\\s+/', trim($this->classes)), true);
    }
}
$GLOBALS['options'] = json_decode($argv[1], true);
$GLOBALS['front'] = $argv[2] === '1';
$GLOBALS['page_markup'] = json_decode($argv[4], true);
function get_option($name) { return $GLOBALS['options'][$name] ?? false; }
function is_front_page() { return $GLOBALS['front']; }
function home_url($path) { return 'https://example.org/'; }
function esc_url($url) { return $url; }
function esc_html__($text, $domain) { return $text; }
function wp_kses_post($text) { return $text; }
function wp_list_pages($args) {
    $GLOBALS['menu_args'] = $args;
    if ($GLOBALS['page_markup'] !== '__default__') { return $GLOBALS['page_markup']; }
    $static = ($GLOBALS['options']['show_on_front'] ?? '') === 'page';
    $current = $static && $GLOBALS['front'] ? ' aria-current="page"' : '';
    return '<li class="page_item page-item-17 page_item_has_children"><a href="/front"' . $current .
        '>Front</a><ul class="children"><li class="page_item"><a href="/child">Child</a></li></ul></li>' .
        '<li class="page_item"><a href="/blog">Blog</a></li>';
}
require $argv[3];
ob_start(); slateframe_menu_fallback(); $html = ob_get_clean();
echo json_encode(['html' => $html, 'args' => $GLOBALS['menu_args']], JSON_THROW_ON_ERROR);
'''


def render(options, front, pages='__default__'):
    result = subprocess.run(
        ['php', '-r', PHP, json.dumps(options), '1' if front else '0',
         str(ROOT / 'inc' / 'template-tags.php'), json.dumps(pages)],
        check=True, capture_output=True, text=True, timeout=10,
    )
    return json.loads(result.stdout)


class MenuFallback(unittest.TestCase):
    def test_posts_front_page_has_one_current_home_link(self):
        data = render({'show_on_front': 'posts'}, True)
        self.assertIn('href="https://example.org/" aria-current="page">Home</a>', data['html'])
        self.assertEqual(data['html'].count('aria-current="page"'), 1)
        self.assertIn('slateframe-home-link current_page_item', data['html'])

    def test_static_front_page_uses_core_current_link_once(self):
        data = render({'show_on_front': 'page', 'page_on_front': '17'}, True)
        self.assertNotIn('slateframe-home-link', data['html'])
        self.assertEqual(data['html'].count('href="/front"'), 1)
        self.assertIn('href="/front" aria-current="page"', data['html'])
        self.assertEqual(data['html'].count('aria-current="page"'), 1)

    def test_static_front_page_retains_child_hierarchy(self):
        data = render({'show_on_front': 'page', 'page_on_front': 17}, True)
        self.assertNotIn('exclude', data['args'])
        self.assertIn('page_item_has_children', data['html'])
        self.assertIn('<ul class="children">', data['html'])
        self.assertIn('href="/child"', data['html'])

    def test_separate_posts_page_does_not_mark_root_current(self):
        data = render({'show_on_front': 'page', 'page_on_front': 17}, False)
        self.assertNotIn('slateframe-home-link', data['html'])
        self.assertNotIn('aria-current="page"', data['html'])
        self.assertIn('href="/blog"', data['html'])

    def test_invalid_front_page_id_retains_home_fallback(self):
        for bad in ([], {}, '17oops', '-17', '9999999999999999999999999999999999999'):
            with self.subTest(bad=bad):
                data = render({'show_on_front': 'page', 'page_on_front': bad}, False)
                self.assertIn('slateframe-home-link', data['html'])
                self.assertNotIn('exclude', data['args'])

    def test_existing_list_shape_and_other_pages(self):
        data = render({'show_on_front': 'posts'}, False)
        self.assertTrue(data['html'].startswith('<ul class="slateframe-menu-fallback">'))
        self.assertTrue(data['html'].endswith('</ul>'))
        self.assertIn('href="/blog"', data['html'])
        self.assertIn('href="/child"', data['html'])
        self.assertNotIn('aria-current="page"', data['html'])
        self.assertNotIn('current_page_item', data['html'])
        self.assertIs(data['args']['echo'], False)
        self.assertEqual(data['args']['title_li'], '')


    def test_empty_static_front_page_list_keeps_accessible_home(self):
        data = render({'show_on_front': 'page', 'page_on_front': 17}, True, '')
        self.assertIn('slateframe-home-link current_page_item', data['html'])
        self.assertIn('aria-current="page"', data['html'])
        self.assertEqual(data['html'].count('href="https://example.org/"'), 1)

    def test_whitespace_static_front_page_list_keeps_home(self):
        data = render({'show_on_front': 'page', 'page_on_front': 17}, False, '  \n\t ')
        self.assertIn('slateframe-home-link', data['html'])
        self.assertNotIn('current_page_item', data['html'])
        self.assertNotIn('aria-current="page"', data['html'])

    def test_non_string_core_page_list_does_not_hide_home(self):
        for pages in (False, None, [], {'invalid': True}):
            with self.subTest(pages=pages):
                data = render({'show_on_front': 'page', 'page_on_front': 17}, True, pages)
                self.assertIn('slateframe-home-link current_page_item', data['html'])
                self.assertIn('aria-current="page"', data['html'])

    def test_filtered_static_front_page_restores_home_with_other_pages(self):
        pages = '<li class="page_item page-item-24"><a href="/about">About</a></li>'
        data = render({'show_on_front': 'page', 'page_on_front': 17}, True, pages)
        self.assertIn('slateframe-home-link current_page_item', data['html'])
        self.assertEqual(data['html'].count('aria-current="page"'), 1)
        self.assertIn('href="/about"', data['html'])

    def test_prefix_collision_does_not_hide_home(self):
        pages = '<li class="page_item page-item-170"><a href="/other">Other</a></li>'
        data = render({'show_on_front': 'page', 'page_on_front': 17}, False, pages)
        self.assertIn('slateframe-home-link', data['html'])

    def test_unrelated_attribute_does_not_hide_home(self):
        pages = '<li data-note="page-item-17" class="page_item page-item-24"><a href="/other">Other</a></li>'
        data = render({'show_on_front': 'page', 'page_on_front': 17}, False, pages)
        self.assertIn('slateframe-home-link', data['html'])

    def test_nested_static_front_page_does_not_duplicate_home(self):
        pages = '<li class="page_item page-item-24"><ul><li class="page_item page-item-17"><a href="/front">Front</a></li></ul></li>'
        data = render({'show_on_front': 'page', 'page_on_front': 17}, False, pages)
        self.assertNotIn('slateframe-home-link', data['html'])

    def test_home_current_class_uses_existing_navigation_style(self):
        css = (ROOT / 'assets' / 'css' / 'navigation.css').read_text(encoding='utf-8')
        self.assertIn('.current_page_item', css)
        self.assertIn('text-decoration:underline', css)


if __name__ == '__main__':
    unittest.main()
