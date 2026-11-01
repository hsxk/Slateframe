"""Core Query Loop descendants must not own the outer singular discussion."""
import json
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PHP = r'''
define('ABSPATH','/');
class WP_Post {
 public $ID; public $post_type; public $post_status; public $post_content;
 function __construct($id,$content,$type='post',$status='publish') {
  $this->ID=$id; $this->post_content=json_encode($content);
  $this->post_type=$type; $this->post_status=$status;
 }
}
function absint($x){return abs((int)$x);}
function get_the_ID(){return 42;}
function is_singular(){return true;}
function post_password_required(){return false;}
function parse_blocks($content){return json_decode($content,true);}
function find_name($blocks,$name) {
 foreach($blocks as $b) {
  if(($b['blockName']??'')===$name)return true;
  if(find_name($b['innerBlocks']??array(),$name))return true;
 }
 return false;
}
function has_block($name,$value) {
 $p=is_int($value)?get_post($value):null;
 $raw=$p?$p->post_content:$value;
 return is_string($raw)&&find_name(parse_blocks($raw),$name);
}
function get_post($id){return $GLOBALS['posts'][$id]??null;}
function slateframe_singular_synced_pattern_contents() {
 return array_map(fn($p)=>$p->post_content,
  array_filter($GLOBALS['posts'],fn($p)=>$p->post_type==='wp_block'&&$p->post_status==='publish'));
}
$a=json_decode(getenv('SLATEFRAME_CASE'),true);
$GLOBALS['posts']=array(42=>new WP_Post(42,$a['root']));
foreach($a['patterns'] as $id=>$v) {
 $GLOBALS['posts'][$id]=new WP_Post((int)$id,$v['blocks'],'wp_block',$v['status']??'publish');
}
require getcwd().'/inc/comments-ownership.php';
echo slateframe_has_core_discussion_block(42)?'1':'0';
'''

def b(name, children=None, ref=None):
    return {'blockName': name, 'innerBlocks': children or [],
            'attrs': {'ref': ref} if ref is not None else {}}

FORM = b('core/post-comments-form')
query = lambda children: b('core/query', [b('core/post-template', children)])
ref = lambda value: b('core/block', ref=value)
CASES = {
    'query-only': ([query([FORM])], {}, False),
    'query-and-own': ([query([FORM]), FORM], {}, True),
    'query-sibling-own': ([b('core/query', [b('core/post-template', [FORM]), FORM])], {}, True),
    'nested-group-own': ([b('core/group', [FORM])], {}, True),
    'synced-own': ([ref(10)], {10: {'blocks': [FORM]}}, True),
    'synced-under-query': ([query([ref(10)])], {10: {'blocks': [FORM]}}, False),
    'query-in-synced': ([ref(10)], {10: {'blocks': [query([FORM])]}}, False),
    'synced-mixed': ([ref(10)], {10: {'blocks': [query([FORM]), FORM]}}, True),
    'unpublished': ([ref(10)], {10: {'blocks': [FORM], 'status': 'draft'}}, False),
    'cycle': ([ref(10)], {10: {'blocks': [ref(10)]}}, False),
    'nested-synced': ([ref(10)], {10: {'blocks': [ref(11)]}, 11: {'blocks': [FORM]}}, True),
    'overflow-ref': ([ref('99999999999999999999999999999')], {}, False),
}

class QueryLoopDiscussionContext(unittest.TestCase):
    def test_12_helper_context_scenarios(self):
        for name, (root, patterns, expected) in CASES.items():
            with self.subTest(name=name):
                result = subprocess.run(
                    ['php', '-r', PHP], cwd=ROOT, text=True, capture_output=True, timeout=15,
                    env={**os.environ, 'SLATEFRAME_CASE': json.dumps({'root': root, 'patterns': patterns})})
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, '1' if expected else '0')

    def test_browser_and_workflow_require_real_evidence(self):
        browser = (ROOT / 'tests/browser/comments-query-context.spec.js').read_text(encoding='utf-8')
        workflow = (ROOT / '.github/workflows/quality.yml').read_text(encoding='utf-8')
        for variant in ('query-only', 'synced-query-only', 'query-with-own', 'query-with-result'):
            for viewport in ('390-rtl-400', '1440-ltr'):
                name = f'comments-query-{variant}-{viewport}.png'
                self.assertIn(name, browser)
                self.assertIn(name, workflow)
        forced = 'comments-query-query-only-390-rtl-400-forced-colors.png'
        self.assertIn(forced, browser)
        self.assertIn(forced, workflow)
        collision = 'comments-query-collision-390-rtl-400.png'
        self.assertIn(collision, browser)
        self.assertIn(collision, workflow)
        self.assertIn('new AxeBuilder', browser)
        self.assertIn("wp('post', 'delete'", browser)
        self.assertIn('320, 375, 390, 412, 768, 1440, 1920', browser)
        # The Query Loop must not search the fixture's own post_content:
        # WordPress search includes serialized block attribute text.
        self.assertIn('"postType":"page"', browser)
        self.assertIn("'--post_type=post'", browser)
        self.assertIn('slateframe-no-match-query-context-2026', browser)
        # A real published page must match the populated Query Loop, while
        # the outer post remains a different context with its own discussion.
        self.assertIn("const hitTitle = 'slateframe-query-hit-' + suffix", browser)
        self.assertIn("'--post_type=page'", browser)
        self.assertIn("queriedForm: true", browser)
        # WordPress Core renders a Post Template list without a query wrapper.
        # Check the repeated-post DOM, never a non-existent .wp-block-query.
        self.assertIn(".slateframe-prose .wp-block-post-template .wp-block-post-comments-form", browser)
        self.assertNotIn("page.locator(\'.wp-block-query .wp-block-post-comments-form\')", browser)
        self.assertIn('toHaveCount(fixture.queriedForm ? 1 : 0)', browser)
        self.assertIn('toHaveValue(String(hitPageId))', browser)
        self.assertIn('toHaveValue(String(fixture.id))', browser)
        self.assertIn('input[name="comment_post_ID"]', browser)
        self.assertIn('queriedAxe.violations', browser)
        self.assertIn('await queriedSubmit.focus()', browser)
        self.assertIn('toBeFocused()', browser)

    def test_queried_form_locator_remains_visible_to_later_assertions(self):
        """A real-browser failure exposed a block-scoped JS const used later."""
        browser = (ROOT / 'tests/browser/comments-query-context.spec.js').read_text(encoding='utf-8')
        declaration = "const queried = page.locator('.slateframe-prose .wp-block-post-template .wp-block-post-comments-form');"
        self.assertEqual(browser.count(declaration), 1)
        self.assertLess(browser.index(declaration), browser.index('if (fixture.queriedForm) {'))
        # Core's post-comments-form block applies its class to the #respond
        # root itself. A descendant #respond selector incorrectly fails on
        # the actual WordPress DOM even when the form is rendered correctly.
        self.assertIn("await expect(queried).toHaveAttribute('id', 'respond')", browser)
        self.assertNotIn("queried.locator('#respond')", browser)
        self.assertIn('await queriedSubmit.focus()', browser)

    def test_classic_form_label_scoping_is_local_and_core_safe(self):
        template = (ROOT / 'comments.php').read_text(encoding='utf-8')
        helpers = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        browser = (ROOT / 'tests/browser/comments-query-context.spec.js').read_text(encoding='utf-8')
        for token in ('slateframe_scope_classic_comment_defaults',
                      'slateframe_scope_classic_comment_fields',
                      "remove_filter( 'comment_form_defaults'",
                      "remove_filter( 'comment_form_fields'"):
            self.assertIn(token, template)
        for token in ('WP_HTML_Tag_Processor', "'aria-describedby'",
                      "'email-notes'", "'id_form'", "'id_submit'",
                      "'slateframe-outer-'", "in_array( $id, $ids, true )",
                      "if ( ! $map )"):
            self.assertIn(token, helpers)
        for token in ('badLabels', 'badDescriptions', 'document.getElementById',
                      'form.contains(target)', "'slateframe-outer-'",
                      'replyIdCollisions', "'cancel-comment-reply-link'", "'respond'"):
            self.assertIn(token, browser)
        # Core must retain the canonical queried-post form and submission
        # targets. The theme only scopes its own classic field references.
        self.assertIn("queried.locator('button#submit')", browser)
        self.assertIn('toHaveValue(String(hitPageId))', browser)
        self.assertIn('toHaveValue(String(fixture.id))', browser)

    def test_parallel_forms_preserve_core_reply_and_outer_fallback(self):
        bootstrap = (ROOT / 'functions.php').read_text(encoding='utf-8')
        template = (ROOT / 'comments.php').read_text(encoding='utf-8')
        helpers = (ROOT / 'inc/template-tags.php').read_text(encoding='utf-8')
        browser = (ROOT / 'tests/browser/comments-query-context.spec.js').read_text(encoding='utf-8')
        css = (ROOT / 'assets/css/comments.css').read_text(encoding='utf-8')
        self.assertIn("render_block_core/post-comments-form", bootstrap)
        self.assertIn("slateframe_track_nested_core_comment_form", helpers)
        self.assertIn("get_queried_object_id()", helpers)
        self.assertIn("slateframe_nested_core_comment_form_rendered", template)
        self.assertIn("slateframe_scope_outer_comment_reply_link", template)
        self.assertIn("remove_filter( 'comment_reply_link'", template)
        self.assertIn("slateframe_scope_outer_comment_form_html", template)
        self.assertIn("ob_get_clean()", template)
        for token in ("'respond'", "'reply-title'", "'cancel-comment-reply-link'",
                      "'comment_parent'", "'comment_post_ID'",
                      "remove_class( 'comment-reply-link' )", "'#respond'"):
            self.assertIn(token, helpers)
        self.assertIn('slateframe-comments .comment-respond', css)
        self.assertIn("remove_attribute( 'onclick' )", helpers)
        self.assertIn("not.toHaveAttribute('onclick', /./)", browser)
        self.assertIn('replyCommentId', browser)
        self.assertIn("await reply.click()", browser)
        self.assertIn("await cancel.click()", browser)
        self.assertIn("toHaveValue(String(replyCommentId))", browser)
        self.assertIn("toHaveValue('0')", browser)

    def test_no_rendering_or_shortcode_side_effects(self):
        source = (ROOT / 'inc/comments-ownership.php').read_text(encoding='utf-8')
        for token in ('slateframe_discussion_in_current_post_blocks',
                      "'core/query', $post_id", "'core/post-template' === $name",
                      "'publish' !== $post->post_status", '$depth >= 8'):
            self.assertIn(token, source)
        self.assertNotIn('do_blocks(', source)
        self.assertNotIn('do_shortcode(', source)

if __name__ == '__main__':
    unittest.main()
