"""Exercise the read-only Core comment-form observer without WordPress bootstrap."""
import json
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHP = r'''
define('ABSPATH', '/');
class WP_Block {
 public $context;
 function __construct($context) { $this->context = $context; }
}
function is_singular() { return $GLOBALS['case']['singular']; }
function get_queried_object_id() { return $GLOBALS['case']['outer']; }
$GLOBALS['case'] = json_decode(getenv('SLATEFRAME_OBSERVER_CASE'), true);
require getcwd() . '/inc/template-tags.php';
$case = $GLOBALS['case'];
$instance = $case['block'] ? new WP_Block($case['context']) : new stdClass();
$content = $case['content'];
$result = slateframe_track_nested_core_comment_form($content, array(), $instance);
echo json_encode(array('same' => $result === $content,
 'marker' => $GLOBALS['slateframe_nested_core_comment_form_rendered'] ?? null));
'''

CASES = {
    'different-post-core-form': ({'content': '<div id="respond">Form</div>', 'context': {'postId': 63}}, 67),
    'same-post-core-form': ({'content': '<div id="respond">Form</div>', 'context': {'postId': 67}}, None),
    'no-core-responder': ({'content': '<div class="other">Form</div>', 'context': {'postId': 63}}, None),
    'empty-markup': ({'content': '', 'context': {'postId': 63}}, None),
    'missing-context': ({'content': '<div id="respond">Form</div>', 'context': {}}, None),
    'invalid-post-context': ({'content': '<div id="respond">Form</div>', 'context': {'postId': 'abc'}}, None),
    'zero-post-context': ({'content': '<div id="respond">Form</div>', 'context': {'postId': 0}}, None),
    'overflow-post-context': ({'content': '<div id="respond">Form</div>', 'context': {'postId': '999999999999999999999999'}}, None),
    'non-core-block-instance': ({'content': '<div id="respond">Form</div>', 'context': {'postId': 63}, 'block': False}, None),
    'archive-context': ({'content': '<div id="respond">Form</div>', 'context': {'postId': 63}, 'singular': False}, None),
    'no-outer-post': ({'content': '<div id="respond">Form</div>', 'context': {'postId': 63}, 'outer': 0}, None),
    'non-string-render': ({'content': False, 'context': {'postId': 63}}, None),
}

class NestedCoreCommentObserver(unittest.TestCase):
    def test_observer_preserves_rendered_html_and_only_marks_real_nested_form(self):
        for name, (overrides, expected) in CASES.items():
            with self.subTest(case=name):
                case = {'content': '<div id="respond">Form</div>', 'context': {'postId': 63},
                        'block': True, 'singular': True, 'outer': 67, **overrides}
                result = subprocess.run(
                    ['php', '-r', PHP], cwd=ROOT, text=True, capture_output=True,
                    env={**os.environ, 'SLATEFRAME_OBSERVER_CASE': json.dumps(case)}, timeout=15)
                self.assertEqual(result.returncode, 0, result.stderr)
                observed = json.loads(result.stdout)
                self.assertTrue(observed['same'], name)
                self.assertEqual(observed['marker'], expected, name)

if __name__ == '__main__':
    unittest.main()
