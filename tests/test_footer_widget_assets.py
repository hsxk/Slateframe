"""Core/classic footer form asset contract without a WordPress test database."""

import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

PHP_TEST = r'''
/**
 * Standalone preflight for Core/classic footer widget form assets.
 *
 * Execute with: php tests/footer-widget-form-assets.php
 * The real WordPress/Chromium suite remains the authoritative CI gate.
 *
 * @package Slateframe
 */

define( 'ABSPATH', __DIR__ );
$GLOBALS['slateframe_test_sidebars'] = array();
$GLOBALS['slateframe_test_blocks']   = array();
$GLOBALS['slateframe_test_classic']  = array();
$GLOBALS['slateframe_test_flags']    = array();
$GLOBALS['slateframe_test_post']     = null;

function get_template_directory() {
	return getcwd();
}
function add_action() {}
function add_filter() {}
function apply_filters( $name, $value ) {
	return $value;
}
function wp_get_sidebars_widgets() {
	return $GLOBALS['slateframe_test_sidebars'];
}
function get_option( $key, $default = false ) {
	if ( 'widget_block' === $key ) {
		return $GLOBALS['slateframe_test_blocks'];
	}
	return isset( $GLOBALS['slateframe_test_classic'][ $key ] ) ? $GLOBALS['slateframe_test_classic'][ $key ] : $default;
}
function parse_blocks( $content ) {
	return array( array( 'blockName' => 'core/group', 'innerBlocks' => array( array( 'blockName' => 'core/legacy-widget', 'attrs' => array( 'idBase' => false !== strpos( $content, 'idBase":"search' ) ? 'search' : 'archives' ) ) ) ) );
}
function has_block( $name, $content ) {
	if ( $content instanceof WP_Post ) { $content = $content->post_content; }
	return false !== strpos( $content, '<!-- wp:' . str_replace( 'core/', '', $name ) );
}
function is_search() {
	return ! empty( $GLOBALS['slateframe_test_flags']['search'] );
}
function is_404() {
	return ! empty( $GLOBALS['slateframe_test_flags']['404'] );
}
function is_home() {
	return ! empty( $GLOBALS['slateframe_test_flags']['home'] );
}
function is_archive() {
	return ! empty( $GLOBALS['slateframe_test_flags']['archive'] );
}
function is_author() {
	return ! empty( $GLOBALS['slateframe_test_flags']['author'] );
}
function is_singular() {
	return ! empty( $GLOBALS['slateframe_test_flags']['singular'] );
}
function get_post() {
	return $GLOBALS['slateframe_test_post'];
}
function comments_open() {
	return false;
}
function get_comments_number() {
	return 0;
}
class WP_Post {
	public $ID = 1;
	public $post_content = '';
}
class WP_HTML_Tag_Processor {
	private $html;
	public function __construct( $html ) {
		$this->html = $html;
	}
	public function next_tag( $query = null ) {
		return ( isset( $query['tag_name'] ) && 'FORM' === $query['tag_name'] ) && (bool) preg_match( '/<form(?:\s|>)/i', $this->html );
	}
}
require_once getcwd() . '/functions.php';

$cases = array(
	'empty'                => array( array(), array(), array(), array( false, false, false ) ),
	'ordinary-footer'      => array( array( 'text-2' ), array(), array(), array( false, false, false ) ),
	'classic-search'       => array( array( 'search-2' ), array(), array(), array( true, true, false ) ),
	'core-search'          => array( array( 'block-2' ), array( 2 => array( 'content' => '<!-- wp:search /-->' ) ), array(), array( true, false, false ) ),
	'legacy-search'        => array( array( 'block-8' ), array( 8 => array( 'content' => '<!-- wp:legacy-widget {"idBase":"search"} /-->' ) ), array(), array( true, true, false ) ),
	'nonsearch-legacy'     => array( array( 'block-8' ), array( 8 => array( 'content' => '<!-- wp:legacy-widget {"idBase":"archives"} /-->' ) ), array(), array( false, false, false ) ),
	'nested-core-search'   => array( array( 'block-3' ), array( 3 => array( 'content' => '<!-- wp:group --><!-- wp:search /--><!-- /wp:group -->' ) ), array(), array( true, false, false ) ),
	'block-html-form'      => array( array( 'block-4' ), array( 4 => array( 'content' => '<!-- wp:html --><form><input></form><!-- /wp:html -->' ) ), array(), array( true, false, true ) ),
	'inactive-search-block'=> array( array( 'text-2' ), array( 2 => array( 'content' => '<!-- wp:search /-->' ) ), array(), array( false, false, false ) ),
	'missing-block'        => array( array( 'block-99' ), array(), array(), array( false, false, false ) ),
	'bad-widget-id'        => array( array( 'block-0', 'block-invalid', 'search-invalid' ), array(), array(), array( false, false, false ) ),
	'mixed-search-and-form'=> array( array( 'search-2', 'block-4' ), array( 4 => array( 'content' => '<form action="/"></form>' ) ), array(), array( true, true, true ) ),
	'archive-core-search'  => array( array( 'block-2' ), array( 2 => array( 'content' => '<!-- wp:search /-->' ) ), array( 'archive' => true ), array( true, false, false ) ),
	'singular-footer-form' => array( array( 'block-4' ), array( 4 => array( 'content' => '<form></form>' ) ), array( 'singular' => true ), array( true, false, true ) ),
	'custom-html-form'     => array( array( 'custom_html-5' ), array(), array(), array( true, false, true ), array( 'widget_custom_html' => array( 5 => array( 'content' => '<form action="/"></form>' ) ) ) ),
	'classic-text-form'    => array( array( 'text-7' ), array(), array(), array( true, false, true ), array( 'widget_text' => array( 7 => array( 'text' => '<form><input></form>' ) ) ) ),
	'normal-search-page'   => array( array(), array(), array( 'search' => true ), array( true, true, false ) ),
	'404-page'            => array( array(), array(), array( '404' => true ), array( true, true, false ) ),
);

$failures = array();
foreach ( $cases as $name => $case ) {
	if ( getenv( 'SLATEFRAME_CASE' ) !== $name ) { continue; }
	$GLOBALS['slateframe_test_sidebars'] = array( 'footer-content' => $case[0] );
	$GLOBALS['slateframe_test_blocks']   = $case[1];
	$GLOBALS['slateframe_test_flags']    = $case[2];
	$GLOBALS['slateframe_test_classic']  = isset( $case[4] ) ? $case[4] : array();
	$GLOBALS['slateframe_test_post']     = new WP_Post();
	$actual = array(
		slateframe_forms_styles_needed(),
		slateframe_search_form_styles_needed(),
		slateframe_form_content_styles_needed(),
	);
	if ( $actual !== $case[3] ) {
		$failures[] = $name . ': expected ' . json_encode( $case[3] ) . ', got ' . json_encode( $actual );
	}
}
if ( $failures ) {
	fwrite( STDERR, implode( "\n", $failures ) . "\n" );
	exit( 1 );
}
printf( "Footer form asset cases: %d/%d passed\n", count( $cases ), count( $cases ) );

'''


class FooterWidgetAssetContract(unittest.TestCase):
    def test_footer_form_php_cases(self):
        import os
        names = (
            "empty", "ordinary-footer", "classic-search", "core-search",
            "legacy-search", "nonsearch-legacy", "nested-core-search",
            "block-html-form", "inactive-search-block", "missing-block",
            "bad-widget-id", "mixed-search-and-form", "archive-core-search",
            "singular-footer-form", "custom-html-form", "classic-text-form",
            "normal-search-page", "404-page",
        )
        for name in names:
            with self.subTest(case=name):
                result = subprocess.run(
                    ["php", "-r", PHP_TEST], cwd=ROOT,
                    capture_output=True, text=True, check=False,
                    env={**os.environ, "SLATEFRAME_CASE": name},
                )
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
                self.assertIn("18/18 passed", result.stdout)

    def test_mobile_core_search_uses_intrinsic_single_column_without_budget_change(self):
        base = (ROOT / "style.css").read_text(encoding="utf-8")
        forms = (ROOT / "assets/css/forms.css").read_text(encoding="utf-8")
        self.assertIn(
            "@media(max-width:640px){.wp-block-search__button-outside .wp-block-search__inside-wrapper{display:grid;grid-template-columns:minmax(0,1fr)}",
            base,
        )
        self.assertIn(".wp-block-search__button-outside .wp-block-search__button{margin-inline-start:0;max-inline-size:100%;white-space:normal}", base)
        self.assertLessEqual(len(base.encode("utf-8")), 16000)
        self.assertLessEqual(len(forms.encode("utf-8")), 1300)

    def test_form_content_layer_has_no_unneeded_reading_dependency(self):
        source = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("array( 'slateframe-forms' ),\n\t\t\t$version", source)
        self.assertIn("function slateframe_footer_form_assets()", source)
        self.assertIn("function slateframe_blocks_have_legacy_search( $blocks )", source)


if __name__ == "__main__":
    unittest.main()
