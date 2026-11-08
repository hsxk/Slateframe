"""Regression contract for zero-result search recovery query invariants."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

PHP = r"""
define('ABSPATH', '/');
function absint($value) { return abs((int) $value); }
function apply_filters($hook, $args) {
    if ($hook !== 'slateframe_search_recent_posts_args') { return $args; }
    $mode = $GLOBALS['mode'];
    if ($mode === 'hostile') {
        return array_merge($args, array(
            'post_type' => 'any', 'post_status' => 'private',
            'posts_per_page' => -1, 'nopaging' => true,
            'fields' => 'ids', 'no_found_rows' => false,
            'suppress_filters' => true, 'ignore_sticky_posts' => false
        ));
    }
    if ($mode === 'multilingual') {
        return array_merge($args, array('lang' => 'ja', 'orderby' => 'title'));
    }
    if ($mode === 'excluded') {
        return array_merge($args, array('post__in' => array(4, 5, 6),
            'post__not_in' => array(5, 6)));
    }
    if ($mode === 'empty') { return array(); }
    return $args;
}
class WP_Query {
    public $query_vars;
    function __construct($args) { $this->query_vars = $args; }
}
$GLOBALS['mode'] = $argv[1];
require getcwd() . '/inc/content-discovery.php';
$query = slateframe_search_recent_posts_query();
echo json_encode($query->query_vars, JSON_THROW_ON_ERROR);
"""


class SearchRecentRecoveryContract(unittest.TestCase):
    def args(self, mode):
        run = subprocess.run(
            ['php', '-r', PHP, mode], cwd=ROOT, capture_output=True,
            text=True, timeout=15,
        )
        self.assertEqual(run.returncode, 0, run.stderr)
        return json.loads(run.stdout)

    def assert_public_bounded(self, args):
        self.assertEqual(args['post_type'], 'post')
        self.assertEqual(args['post_status'], 'publish')
        self.assertEqual(args['posts_per_page'], 3)
        self.assertFalse(args['nopaging'])
        self.assertEqual(args['fields'], 'all')
        self.assertTrue(args['no_found_rows'])
        self.assertFalse(args['suppress_filters'])
        self.assertTrue(args['ignore_sticky_posts'])

    def test_default_is_public_recent_and_bounded(self):
        args = self.args('default')
        self.assert_public_bounded(args)
        self.assertEqual(args['orderby'], 'date')
        self.assertEqual(args['order'], 'DESC')

    def test_filter_cannot_expose_private_or_unbounded_content(self):
        self.assert_public_bounded(self.args('hostile'))

    def test_multilingual_adapter_can_scope_without_disabling_core_filters(self):
        args = self.args('multilingual')
        self.assert_public_bounded(args)
        self.assertEqual(args['lang'], 'ja')
        self.assertEqual(args['orderby'], 'title')

    def test_empty_filter_falls_back_to_safe_defaults(self):
        self.assert_public_bounded(self.args('empty'))

    def test_explicit_candidates_do_not_widen_when_excluded(self):
        args = self.args('excluded')
        self.assert_public_bounded(args)
        self.assertEqual(args['post__in'], [4])
        self.assertEqual(args['post__not_in'], [5, 6])

    def test_php_syntax(self):
        for path in ('inc/content-discovery.php', 'search.php'):
            run = subprocess.run(['php', '-l', str(ROOT / path)],
                                 capture_output=True, text=True, timeout=15)
            self.assertEqual(run.returncode, 0, run.stderr)


if __name__ == '__main__':
    unittest.main()
