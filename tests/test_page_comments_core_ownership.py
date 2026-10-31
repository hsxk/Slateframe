"""Classic page comments must defer to authored WordPress Core discussion blocks."""
import json
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHP = r"""
$GLOBALS['case'] = json_decode(getenv('SLATEFRAME_PAGE_COMMENTS_CASE'), true);
$GLOBALS['calls'] = 0;
$GLOBALS['loop'] = 0;
function get_header() {}
function get_footer() {}
function have_posts() { return $GLOBALS['loop']++ === 0; }
function the_post() {}
function post_class($class = '') { echo 'class="' . $class . '"'; }
function slateframe_get_display_title() { return 'Fixture title'; }
function wp_kses_post($value) { return $value; }
function slateframe_featured_media() {}
function the_content() {}
function slateframe_content_pagination() {}
function comments_open() { return $GLOBALS['case']['open']; }
function get_comments_number() { return $GLOBALS['case']['count']; }
function get_the_ID() { return 42; }
function has_block($name, $post) {
    if ($post !== 42) throw new Exception('Unexpected page ID');
    return in_array($name, $GLOBALS['case']['blocks'], true);
}
function comments_template() { $GLOBALS['calls']++; }
ob_start();
require getcwd() . '/page.php';
ob_end_clean();
echo 'SLATEFRAME_RESULT:' . json_encode($GLOBALS['calls']);
"""


class PageCommentsCoreOwnership(unittest.TestCase):
    def test_classic_comments_are_rendered_only_without_core_discussion(self):
        cases = [
            ('plain-open', True, 0, [], 1),
            ('plain-with-replies-closed', False, 2, [], 1),
            ('plain-closed-empty', False, 0, [], 0),
            ('unrelated-block', True, 0, ['core/paragraph'], 1),
            ('core-comments', True, 0, ['core/comments'], 0),
            ('core-post-comments', True, 0, ['core/post-comments'], 0),
            ('core-post-comments-form', True, 0, ['core/post-comments-form'], 0),
            ('core-discussion-closed', False, 2, ['core/comments'], 0),
            ('multiple-core-blocks', True, 2,
             ['core/comments', 'core/post-comments-form'], 0),
        ]
        for name, opened, count, blocks, expected in cases:
            with self.subTest(name=name):
                result = subprocess.run(
                    ['php', '-r', PHP], cwd=ROOT, text=True, capture_output=True,
                    env={**os.environ, 'SLATEFRAME_PAGE_COMMENTS_CASE': json.dumps({
                        'open': opened, 'count': count, 'blocks': blocks,
                    })}, timeout=15,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, 'SLATEFRAME_RESULT:' + str(expected))

    def test_page_and_single_share_core_ownership_guard(self):
        for template in ('page.php', 'single.php'):
            source = (ROOT / template).read_text(encoding='utf-8')
            for block in ('core/comments', 'core/post-comments', 'core/post-comments-form'):
                with self.subTest(template=template, block=block):
                    self.assertIn("! has_block( '" + block + "', get_the_ID() )", source)
            self.assertIn('comments_template();', source)

    def test_real_wordpress_page_regression_is_in_browser_suite(self):
        source = (ROOT / 'tests/browser/page-comments-core-ownership.spec.js').read_text(
            encoding='utf-8')
        for token in ('--post_type=page', '--comment_status=open',
                      'wp:post-comments-form', 'form#commentform',
                      '.slateframe-comments', '320, 375, 390, 412, 768, 1440, 1920',
                      "['ltr', 'rtl']", "fontSize = '64px'",
                      "forcedColors: 'active'", 'AxeBuilder',
                      "wp('post', 'delete'", 'finally'):
            self.assertIn(token, source)
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for screenshot in (
            'page-comments-core-390-rtl-400.png',
            'page-comments-core-390-rtl-400-forced-colors.png',
            'page-comments-core-1440-ltr.png',
            'page-comments-classic-390-rtl.png',
        ):
            with self.subTest(screenshot=screenshot):
                self.assertIn('test-artifacts/screenshots/$screenshot', workflow)
                self.assertIn(screenshot, workflow)
        self.assertIn('Missing page discussion evidence:', workflow)


if __name__ == '__main__':
    unittest.main()
