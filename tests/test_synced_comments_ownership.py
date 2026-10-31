"""Core comments inside published synced patterns must own their form."""
import json
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHP = r"""
define('ABSPATH', '/');
$GLOBALS['case'] = json_decode(getenv('SLATEFRAME_SYNCED_COMMENTS_CASE'), true);
function absint($value) { return abs((int) $value); }
function get_the_ID() { return $GLOBALS['case']['current_id']; }
function is_singular() { return $GLOBALS['case']['singular']; }
function post_password_required() { return $GLOBALS['case']['locked']; }
function has_block($block, $content) {
    if (is_int($content)) {
        return in_array($block, $GLOBALS['case']['direct'], true);
    }
    if (!is_string($content)) throw new RuntimeException('Unexpected content type');
    return strpos($content, '<!-- wp:' . substr($block, 5)) !== false;
}
function slateframe_singular_synced_pattern_contents() {
    if ($GLOBALS['case']['locked']) throw new RuntimeException('Locked content inspected');
    $GLOBALS['case']['synced_calls']++;
    return $GLOBALS['case']['synced'];
}
$GLOBALS['case']['synced_calls'] = 0;
require getcwd() . '/inc/comments-ownership.php';
$result = slateframe_has_core_discussion_block($GLOBALS['case']['post_id']);
echo json_encode(array('found' => $result, 'calls' => $GLOBALS['case']['synced_calls']));
"""


class SyncedCommentsOwnership(unittest.TestCase):
    def test_direct_and_synced_core_discussion(self):
        cases = [
            ('ordinary', [], [], True, False, 42, 42, False, 1),
            ('direct-comments', ['core/comments'], [], True, False, 42, 42, True, 0),
            ('direct-legacy', ['core/post-comments'], [], True, False, 42, 42, True, 0),
            ('direct-form', ['core/post-comments-form'], [], True, False, 42, 42, True, 0),
            ('synced-comments', [], ['<!-- wp:comments /-->'], True, False, 42, 42, True, 1),
            ('synced-legacy', [], ['<!-- wp:post-comments /-->'], True, False, 42, 42, True, 1),
            ('synced-form', [], ['<!-- wp:post-comments-form /-->'], True, False, 42, 42, True, 1),
            ('synced-nested', [], ['<!-- wp:group --><!-- wp:post-comments-form /--><!-- /wp:group -->'], True, False, 42, 42, True, 1),
            ('unrelated-pattern', [], ['<!-- wp:paragraph --><p>Hi</p><!-- /wp:paragraph -->'], True, False, 42, 42, False, 1),
            ('malformed-content', [], [None, [], 123], True, False, 42, 42, False, 1),
            ('password-protected', [], ['<!-- wp:comments /-->'], True, True, 42, 42, False, 0),
            ('archive-context', [], ['<!-- wp:comments /-->'], False, False, 42, 42, False, 0),
            ('different-post', [], ['<!-- wp:comments /-->'], True, False, 41, 42, False, 0),
            ('zero-id', [], [], True, False, 0, 0, False, 0),
        ]
        for name, direct, synced, singular, locked, post_id, current_id, expected, calls in cases:
            with self.subTest(name=name):
                payload = {'direct': direct, 'synced': synced, 'singular': singular,
                           'locked': locked, 'post_id': post_id, 'current_id': current_id}
                result = subprocess.run(['php', '-r', PHP], cwd=ROOT, capture_output=True,
                                        text=True, timeout=15,
                                        env={**os.environ, 'SLATEFRAME_SYNCED_COMMENTS_CASE': json.dumps(payload)})
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(json.loads(result.stdout), {'found': expected, 'calls': calls})

    def test_all_templates_use_shared_core_first_detection(self):
        for name in ('single.php', 'page.php', 'attachment.php'):
            with self.subTest(template=name):
                source = (ROOT / name).read_text(encoding='utf-8')
                self.assertIn('! slateframe_has_core_discussion_block( get_the_ID() )', source)
                self.assertNotIn("! has_block( 'core/comments', get_the_ID() )", source)
        bootstrap = (ROOT / 'functions.php').read_text(encoding='utf-8')
        self.assertIn("require_once get_template_directory() . '/inc/comments-ownership.php';", bootstrap)

    def test_real_wordpress_visual_evidence_is_required(self):
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        browser = (ROOT / 'tests/browser/synced-comments-ownership.spec.js').read_text(encoding='utf-8')
        for kind in ('post', 'page', 'attachment'):
            for suffix in ('390-rtl-400', '1440-ltr'):
                name = 'synced-comments-' + kind + '-' + suffix + '.png'
                with self.subTest(screenshot=name):
                    self.assertIn(name, workflow)
                    self.assertIn(name, browser)
        self.assertIn('synced-comments-attachment-390-rtl-400-forced-colors.png', workflow)
        self.assertIn('synced-comments-attachment-390-rtl-400-forced-colors.png', browser)
        self.assertIn('wp_block', browser)
        self.assertIn('AxeBuilder', browser)
        self.assertIn('wp_delete_attachment', browser)


if __name__ == '__main__':
    unittest.main()
