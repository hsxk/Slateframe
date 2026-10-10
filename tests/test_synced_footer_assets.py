"""Isolated PHP contract for Core synced-pattern footer asset detection.

The full WordPress/Chromium job is still required before merging.
"""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

HARNESS = r'''
class WP_Post {
    public $post_type;
    public $post_status;
    public $post_content;
    function __construct($content, $status='publish', $type='wp_block') {
        $this->post_content=$content;
        $this->post_status=$status;
        $this->post_type=$type;
    }
}
$GLOBALS['posts'] = array();
function get_post($id) { return isset($GLOBALS['posts'][$id]) ? $GLOBALS['posts'][$id] : null; }
function has_block($name, $content) {
    $short = str_replace('core/', '', $name);
    return false !== strpos($content, '<!-- wp:' . $short);
}
function parse_blocks($content) {
    $blocks = array();
    preg_match_all('/<!-- wp:block \\{"ref":(\\d+)\\} \\/-->/', $content, $refs);
    foreach ($refs[1] as $ref) {
        $blocks[] = array('blockName'=>'core/block','attrs'=>array('ref'=>(int)$ref));
    }
    if (false !== strpos($content, '<!-- wp:legacy-widget')) {
        $blocks[] = array('blockName'=>'core/legacy-widget','attrs'=>array('idBase'=>false !== strpos($content,'"idBase":"search"') ? 'search' : 'archives'));
    }
    return $blocks;
}
function slateframe_blocks_have_legacy_search($blocks) {
    foreach ($blocks as $block) {
        if ('core/legacy-widget' === $block['blockName'] && 'search' === $block['attrs']['idBase']) return true;
    }
    return false;
}
function slateframe_content_has_form($content) { return (bool) preg_match('/<form(?:\\s|>)/i', $content); }
%s
function check($name, $blocks, $expected) {
    $actual=slateframe_synced_form_assets($blocks);
    if ($actual !== $expected) {
        fwrite(STDERR, $name . ' expected ' . json_encode($expected) . ' got ' . json_encode($actual) . "\n");
        exit(1);
    }
}
function ref($id) { return array(array('blockName'=>'core/block','attrs'=>array('ref'=>$id))); }
$no=array('forms'=>false,'search_form'=>false,'form_content'=>false);
$core=array('forms'=>true,'search_form'=>false,'form_content'=>false);
$legacy=array('forms'=>true,'search_form'=>true,'form_content'=>false);
$html=array('forms'=>true,'search_form'=>false,'form_content'=>true);
$all=array('forms'=>true,'search_form'=>true,'form_content'=>true);
check('empty', array(), $no);
check('invalid', 'invalid', $no);
check('invalid-block', array('invalid'), $no);
check('zero', ref(0), $no);
check('negative', ref(-2), $no);
check('malformed-ref', ref('1junk'), $no);
check('float-ref', ref(1.5), $no);
check('missing', ref(404), $no);
$GLOBALS['posts'][1]=new WP_Post('<!-- wp:search /-->');
check('core-search', ref(1), $core);
$GLOBALS['posts'][2]=new WP_Post('<!-- wp:legacy-widget {"idBase":"search"} /-->');
check('legacy-search', ref(2), $legacy);
$GLOBALS['posts'][3]=new WP_Post('<!-- wp:html --><form><input></form><!-- /wp:html -->');
check('custom-html', ref(3), $html);
$GLOBALS['posts'][4]=new WP_Post('<!-- wp:search /-->', 'draft');
check('unpublished', ref(4), $no);
$GLOBALS['posts'][5]=new WP_Post('<!-- wp:search /-->', 'publish', 'post');
check('wrong-type', ref(5), $no);
$GLOBALS['posts'][6]=new WP_Post('<!-- wp:block {"ref":1} /-->');
check('nested-synced', ref(6), $core);
$GLOBALS['posts'][7]=new WP_Post('<!-- wp:block {"ref":8} /-->');
$GLOBALS['posts'][8]=new WP_Post('<!-- wp:block {"ref":7} /--><!-- wp:search /-->');
check('cycle-with-search', ref(7), $core);
$GLOBALS['posts'][9]=new WP_Post('<!-- wp:block {"ref":9} /-->');
check('self-cycle', ref(9), $no);
check('group-nested', array(array('blockName'=>'core/group','innerBlocks'=>ref(1))), $core);
$deep=ref(1); for($j=0;$j<12;$j++) $deep=array(array('blockName'=>'core/group','innerBlocks'=>$deep));
check('deep-core-groups-not-pattern-depth', $deep, $core);
check('mixed', array_merge(ref(1),ref(2),ref(3)), $all);
for($i=20;$i<32;$i++) $GLOBALS['posts'][$i]=new WP_Post('<!-- wp:block {"ref":'.($i+1).'} /-->');
$GLOBALS['posts'][32]=new WP_Post('<!-- wp:search /-->');
check('bounded-depth', ref(20), $no);
check('unrelated', array(array('blockName'=>'core/paragraph')), $no);
check('multiple-refs', array_merge(ref(4),ref(1),ref(3)), array('forms'=>true,'search_form'=>false,'form_content'=>true));
echo 'Synced footer cases: 22/22 passed' . "\n";
'''


class SyncedFooterAssetsTest(unittest.TestCase):
    def test_php_cases(self):
        source_file = ROOT / "functions.php"
        if not source_file.exists():  # Local isolated preflight before applying the patch.
            source_file = ROOT / "synced-helper.php"
        source = source_file.read_text(encoding="utf-8")
        fragments = []
        for name in (
            "slateframe_synced_pattern_contents",
            "slateframe_pattern_form_assets",
            "slateframe_synced_form_assets",
        ):
            start = source.index("function " + name + "(")
            end = source.find("\n/**", start)
            fragments.append(source[start:end if end >= 0 else None])
        php = HARNESS % "\n".join(fragments)
        result = subprocess.run(["php", "-r", php], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("22/22 passed", result.stdout)

    def test_followup_patch_is_incremental(self):
        source_file = ROOT / "functions.php"
        if not source_file.exists():
            source_file = ROOT / "patches/0003-fix-forms-synced-footer-pattern-assets.patch"
        source = source_file.read_text(encoding="utf-8")
        self.assertIn("function slateframe_synced_form_assets(", source)
        self.assertIn("has_block( 'core/block', $content )", source)
        self.assertNotIn("time2log", source.lower())


if __name__ == "__main__":
    unittest.main()
