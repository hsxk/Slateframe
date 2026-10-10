"""Isolated integration contract for Core synced-pattern conditional form assets.

These stubs exercise the actual theme functions. A real WordPress/Chromium
run remains mandatory before any remote merge or release acceptance.
"""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]

PHP = r'''
define('ABSPATH', __DIR__);
$GLOBALS['pattern_posts'] = array();
$GLOBALS['pattern_fetches'] = array();
$GLOBALS['current_post'] = null;
$GLOBALS['sidebars'] = array('footer-content'=>array());
$GLOBALS['block_widgets'] = array();
$GLOBALS['flags'] = array();
class WP_Post {
 public $ID; public $post_type; public $post_status; public $post_content;
 function __construct($id,$content,$status='publish',$type='wp_block') {
  $this->ID=$id; $this->post_content=$content; $this->post_status=$status; $this->post_type=$type;
 }
}
class WP_HTML_Tag_Processor {
 private $content;
 function __construct($html) {$this->content=$html;}
 function next_tag($query=null) {return isset($query['tag_name']) && $query['tag_name']==='FORM' && preg_match('/<form(?:\s|>)/i',$this->content);}
}
function get_template_directory() {return getcwd();}
function add_action() {}
function add_filter() {}
function apply_filters($name,$value) {return $value;}
function wp_get_sidebars_widgets() {return $GLOBALS['sidebars'];}
function get_option($key,$default=false) {return $key==='widget_block' ? $GLOBALS['block_widgets'] : $default;}
function get_post($id=null) {if($id!==null){$GLOBALS['pattern_fetches'][$id]=isset($GLOBALS['pattern_fetches'][$id])?$GLOBALS['pattern_fetches'][$id]+1:1;}return $id===null ? $GLOBALS['current_post'] : (isset($GLOBALS['pattern_posts'][$id])?$GLOBALS['pattern_posts'][$id]:null);}
function has_block($name,$content) {if ($content instanceof WP_Post) $content=$content->post_content;return strpos($content,'<!-- wp:'.str_replace('core/','',$name))!==false;}
function parse_blocks($content) {
 $out=array(); preg_match_all('/<!-- wp:block \{"ref":(\d+)\} \/-->/', $content,$m);
 foreach($m[1] as $ref) $out[]=array('blockName'=>'core/block','attrs'=>array('ref'=>(int)$ref));
 if(strpos($content,'<!-- wp:legacy-widget')!==false) $out[]=array('blockName'=>'core/legacy-widget','attrs'=>array('idBase'=>strpos($content,'"idBase":"search"')!==false?'search':'archives'));
 return $out;
}
function is_singular() {return !empty($GLOBALS['flags']['singular']);}
function is_search() {return !empty($GLOBALS['flags']['search']);}
function is_404() {return false;}
function is_home() {return false;}
function is_archive() {return false;}
function is_author() {return false;}
function comments_open() {return false;}
function get_comments_number() {return 0;}
require_once getcwd().'/functions.php';
function pattern($id,$content,$status='publish',$type='wp_block') {$GLOBALS['pattern_posts'][$id]=new WP_Post($id,$content,$status,$type);}
function check($name,$expected) {
 if (getenv('SLATEFRAME_CASE') !== $name) return;
 $got=array(slateframe_forms_styles_needed(),slateframe_search_form_styles_needed(),slateframe_form_content_styles_needed());
 if($got!==$expected){fwrite(STDERR,$name.' expected '.json_encode($expected).' got '.json_encode($got)."\n");exit(1);}
}
$no=array(false,false,false);$core=array(true,false,false);$legacy=array(true,true,false);$html=array(true,false,true);$all=array(true,true,true);
pattern(1,'<!-- wp:search /-->');
pattern(2,'<!-- wp:legacy-widget {"idBase":"search"} /-->');
pattern(3,'<!-- wp:html --><form><input></form><!-- /wp:html -->');
pattern(4,'<!-- wp:block {"ref":1} /-->');
pattern(5,'<!-- wp:block {"ref":6} /-->');
pattern(6,'<!-- wp:block {"ref":5} /--><!-- wp:search /-->');
pattern(7,'<!-- wp:search /-->','draft');
pattern(8,'<!-- wp:search /-->','publish','post');
pattern(9,'<!-- wp:block {"ref":9} /-->');
pattern(10,'<!-- wp:legacy-widget {"idBase":"archives"} /-->');
function set_footer($content) {
 $GLOBALS['sidebars']=array('footer-content'=>array('block-2'));
 $GLOBALS['block_widgets']=array(2=>array('content'=>$content));
 $GLOBALS['flags']=array(); $GLOBALS['current_post']=null;
}
set_footer('<!-- wp:block {"ref":1} /-->');check('footer-core',$core);
set_footer('<!-- wp:block {"ref":2} /-->');check('footer-legacy',$legacy);
set_footer('<!-- wp:block {"ref":3} /-->');check('footer-html',$html);
set_footer('<!-- wp:block {"ref":4} /-->');check('footer-nested',$core);
set_footer('<!-- wp:block {"ref":5} /-->');check('footer-cycle',$core);
set_footer('<!-- wp:block {"ref":7} /-->');check('footer-draft',$no);
set_footer('<!-- wp:block {"ref":8} /-->');check('footer-wrong-type',$no);
set_footer('<!-- wp:block {"ref":9} /-->');check('footer-self-cycle',$no);
set_footer('<!-- wp:block {"ref":10} /-->');check('footer-other-widget',$no);
set_footer('<!-- wp:block {"ref":404} /-->');check('footer-missing',$no);
set_footer('<!-- wp:block {"ref":1} /--><!-- wp:block {"ref":2} /--><!-- wp:block {"ref":3} /-->');check('footer-mixed',$all);
set_footer('<!-- wp:paragraph -->form<!-- /wp:paragraph -->');check('footer-no-ref',$no);
$GLOBALS['sidebars']=array('footer-content'=>array());
$GLOBALS['block_widgets']=array();$GLOBALS['flags']=array('singular'=>true);
$GLOBALS['current_post']=new WP_Post(101,'<!-- wp:block {"ref":1} /-->','publish','post');check('singular-core',$core);
$GLOBALS['current_post']=new WP_Post(102,'<!-- wp:block {"ref":2} /-->','publish','post');check('singular-legacy',$legacy);
$GLOBALS['current_post']=new WP_Post(103,'<!-- wp:block {"ref":3} /-->','publish','post');check('singular-html',$html);
$GLOBALS['current_post']=new WP_Post(104,'<!-- wp:block {"ref":5} /-->','publish','post');check('singular-cycle',$core);
$GLOBALS['current_post']=new WP_Post(105,'<!-- wp:block {"ref":7} /-->','publish','post');check('singular-draft',$no);
$GLOBALS['current_post']=new WP_Post(106,'<!-- wp:block {"ref":8} /-->','publish','post');check('singular-wrong-type',$no);
$GLOBALS['current_post']=new WP_Post(107,'<!-- wp:block {"ref":9} /-->','publish','post');check('singular-self-cycle',$no);
$GLOBALS['current_post']=new WP_Post(108,'<!-- wp:block {"ref":1} /--><!-- wp:block {"ref":2} /--><!-- wp:block {"ref":3} /-->','publish','post');check('singular-mixed',$all);
if(getenv('SLATEFRAME_CASE')==='singular-mixed' && (!isset($GLOBALS['pattern_fetches'][1]) || $GLOBALS['pattern_fetches'][1]<1)) {fwrite(STDERR,'No pattern lookup');exit(1);}
$GLOBALS['current_post']=new WP_Post(109,'<!-- wp:paragraph -->no form<!-- /wp:paragraph -->','publish','post');check('singular-no-ref',$no);
$GLOBALS['flags']=array();check('nonsingular-ignores-post',$no);
$GLOBALS['flags']=array('singular'=>true);$GLOBALS['current_post']=new WP_Post(110,'<!-- wp:block {"ref":1} /-->','publish','post');
$GLOBALS['pattern_fetches'][1]=0;check('singular-cache',$core);
if(getenv('SLATEFRAME_CASE')==='singular-cache' && $GLOBALS['pattern_fetches'][1]!==1){fwrite(STDERR,'Expected one pattern lookup across three asset decisions, got '.$GLOBALS['pattern_fetches'][1]);exit(1);}
echo 'Synced integration case passed'."\n";
'''

class SyncedFormIntegrationTest(unittest.TestCase):
    def test_php_form_asset_cases(self):
        import os
        import re
        names = re.findall(r"check\('([^']+)'", PHP)
        self.assertEqual(len(names), 23)
        for name in names:
            with self.subTest(case=name):
                result = subprocess.run(
                    ['php', '-r', PHP], cwd=ROOT, text=True, capture_output=True,
                    env={**os.environ, 'SLATEFRAME_CASE': name},
                )
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                self.assertIn('Synced integration case passed', result.stdout)

    def test_synced_asset_scan_has_cycle_guard_and_post_visibility(self):
        source=(ROOT/'functions.php').read_text()
        self.assertIn('function slateframe_synced_form_assets(',source)
        self.assertIn('$depth >= 8',source)
        self.assertIn("'wp_block' !== $post->post_type",source)
        self.assertIn("'publish' !== $post->post_status",source)
        self.assertIn('function slateframe_singular_synced_form_assets()',source)

if __name__=='__main__': unittest.main()
