"""Keep attachment discussion owned by authored WordPress Core blocks."""
import json
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHP = r"""
$GLOBALS['case'] = json_decode(getenv('SLATEFRAME_ATTACHMENT_COMMENTS_CASE'), true);
$GLOBALS['calls'] = 0;
$GLOBALS['loop'] = 0;
function get_header() {}
function get_footer() {}
function have_posts() { return $GLOBALS['loop']++ === 0; }
function the_post() {}
function get_the_ID() { return 42; }
function slateframe_public_attachment_parent_id($id) { return 0; }
function wp_get_attachment_url($id) { return ''; }
function esc_url_raw($value) { return $value; }
function get_post_mime_type($id) { return 'application/octet-stream'; }
function wp_get_attachment_caption($id) { return ''; }
function slateframe_attachment_details($id) { return []; }
function post_class($class = '') { echo 'class="' . $class . '"'; }
function slateframe_get_display_title() { return 'Fixture attachment'; }
function wp_kses_post($value) { return $value; }
function wp_attachment_is_image($id) { return false; }
function get_the_content() { return ''; }
function comments_open() { return $GLOBALS['case']['open']; }
function get_comments_number() { return $GLOBALS['case']['count']; }
function has_block($name, $post) {
    if ($post !== 42) throw new Exception('Unexpected attachment ID');
    return in_array($name, $GLOBALS['case']['blocks'], true);
}
function comments_template() { $GLOBALS['calls']++; }
ob_start();
require getcwd() . '/attachment.php';
ob_end_clean();
echo 'SLATEFRAME_RESULT:' . json_encode($GLOBALS['calls']);
"""

class AttachmentCommentsCoreOwnership(unittest.TestCase):
    def test_classic_comments_only_without_core_discussion(self):
        cases = [
            ('plain-open', True, 0, [], 1),
            ('plain-closed-with-history', False, 2, [], 1),
            ('plain-closed-empty', False, 0, [], 0),
            ('unrelated-block', True, 0, ['core/paragraph'], 1),
            ('core-comments', True, 0, ['core/comments'], 0),
            ('core-post-comments', True, 0, ['core/post-comments'], 0),
            ('core-post-comments-form', True, 0, ['core/post-comments-form'], 0),
            ('core-discussion-closed-with-history', False, 2, ['core/comments'], 0),
            ('multiple-core-blocks', True, 2,
             ['core/comments', 'core/post-comments-form'], 0),
        ]
        for name, opened, count, blocks, expected in cases:
            with self.subTest(name=name):
                result = subprocess.run(
                    ['php', '-r', PHP], cwd=ROOT, text=True, capture_output=True,
                    env={**os.environ, 'SLATEFRAME_ATTACHMENT_COMMENTS_CASE': json.dumps({
                        'open': opened, 'count': count, 'blocks': blocks,
                    })}, timeout=15,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, 'SLATEFRAME_RESULT:' + str(expected))

    def test_templates_share_core_discussion_ownership(self):
        source = (ROOT / 'attachment.php').read_text(encoding='utf-8')
        for block in ('core/comments', 'core/post-comments', 'core/post-comments-form'):
            with self.subTest(block=block):
                self.assertIn("! has_block( '" + block + "', get_the_ID() )", source)
        self.assertIn('comments_template();', source)


    def test_exact_head_browser_evidence_gate(self):
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        browser = (ROOT / 'tests/browser/attachment-comments-core-ownership.spec.js').read_text(encoding='utf-8')
        for screenshot in (
            'attachment-comments-core-390-rtl-400.png',
            'attachment-comments-core-390-rtl-400-forced-colors.png',
            'attachment-comments-core-1440-ltr.png',
            'attachment-comments-classic-390-rtl.png',
            'attachment-comments-closed-390-rtl-400.png',
            'attachment-comments-closed-390-rtl-400-forced-colors.png',
            'attachment-comments-closed-1440-ltr.png',
        ):
            with self.subTest(screenshot=screenshot):
                self.assertIn(screenshot, workflow)
                self.assertIn(screenshot, browser)
        self.assertIn('wp_insert_comment', browser)
        self.assertIn('wp_update_comment_count_now', browser)
        self.assertIn('Historical attachment comment', browser)
        self.assertIn('wp_delete_attachment', browser)
        self.assertIn('AxeBuilder', browser)


if __name__ == '__main__':
    unittest.main()
