<?php
/**
 * Isolated PHP contract for conditional presentation assets in Core synced patterns.
 * Not a replacement for a real WordPress integration or GitHub Actions test.
 */
define( 'ABSPATH', __DIR__ );
$GLOBALS['theme_path'] = is_file( dirname( __DIR__ ) . '/functions.php' ) ? dirname( __DIR__ ) : dirname( __DIR__ ) . '/work/slateframe';
$GLOBALS['fixtures'] = array();
$GLOBALS['current']  = null;
$GLOBALS['lookups']  = array();
$GLOBALS['singular'] = true;

class WP_Post {
	public $ID;
	public $post_type;
	public $post_status;
	public $post_content;
	public function __construct( $id, $type, $status, $content ) {
		$this->ID = $id;
		$this->post_type = $type;
		$this->post_status = $status;
		$this->post_content = $content;
	}
}
class WP_HTML_Tag_Processor {
	private $html;
	private $offset = 0;
	private $match;
	public function __construct( $html ) { $this->html = $html; }
	public function next_tag( $query = null ) {
		while ( preg_match( '/<([a-z][a-z0-9-]*)(?:\\s[^>]*)?>/i', $this->html, $match, PREG_OFFSET_CAPTURE, $this->offset ) ) {
			$this->offset = $match[0][1] + strlen( $match[0][0] );
			$this->match  = $match[0][0];
			if ( null === $query || strtoupper( is_array( $query ) ? $query['tag_name'] : $query ) === strtoupper( $match[1][0] ) ) {
				return true;
			}
		}
		return false;
	}
	public function has_class( $class ) {
		if ( preg_match( '/\\bclass=["\\\']([^"\\\']*)["\\\']/i', $this->match, $match ) ) {
			return in_array( $class, preg_split( '/\\s+/', $match[1] ), true );
		}
		return false;
	}
}
function get_template_directory() { return $GLOBALS['theme_path']; }
function add_action() {}
function add_filter() {}
function apply_filters( $name, $value ) { return $value; }
function is_singular() { return $GLOBALS['singular']; }
function get_post( $id = null ) {
	if ( null === $id ) { return $GLOBALS['current']; }
	$GLOBALS['lookups'][ $id ] = ( isset( $GLOBALS['lookups'][ $id ] ) ? $GLOBALS['lookups'][ $id ] : 0 ) + 1;
	return isset( $GLOBALS['fixtures'][ $id ] ) ? $GLOBALS['fixtures'][ $id ] : null;
}
function parse_blocks( $content ) {
	$blocks = array();
	preg_match_all( '/<!-- wp:(block|search|image|gallery|legacy-widget)\\s*(\\{[^>]*?\\})?\\s*\\/?-->/', $content, $matches, PREG_SET_ORDER );
	foreach ( $matches as $match ) {
		$attrs = isset( $match[2] ) && '' !== $match[2] ? json_decode( $match[2], true ) : array();
		$blocks[] = array(
			'blockName'   => 'core/' . $match[1],
			'attrs'       => is_array( $attrs ) ? $attrs : array(),
			'innerBlocks' => array(),
		);
	}
	return $blocks;
}
function has_block( $name, $content ) {
	if ( $content instanceof WP_Post ) { $content = $content->post_content; }
	foreach ( parse_blocks( $content ) as $block ) {
		if ( 'core/' . preg_replace( '#^core/#', '', $name ) === $block['blockName'] ) { return true; }
	}
	return false;
}
function wp_get_sidebars_widgets() { $GLOBALS['footer_lookups'] = ( isset( $GLOBALS['footer_lookups'] ) ? $GLOBALS['footer_lookups'] : 0 ) + 1; return array(); }
function get_option( $key, $default = null ) { return $default; }
class SlateframeTestTheme { public function get( $key ) { return '0.1.0'; } }
function wp_get_theme() { return new SlateframeTestTheme(); }
function get_stylesheet_uri() { return '/wp-content/themes/slateframe/style.css'; }
function get_template_directory_uri() { return '/wp-content/themes/slateframe'; }
function wp_enqueue_style( $handle, $url, $dependencies = array() ) { $GLOBALS['styles'][ $handle ] = $dependencies; }
function wp_enqueue_script( $handle ) { $GLOBALS['scripts'][] = $handle; }
function is_rtl() { return false; }

function is_search() { return false; }
function is_404() { return false; }
function is_home() { return false; }
function is_archive() { return false; }
function is_author() { return false; }
function comments_open() { return false; }
function get_comments_number() { return 0; }
require_once get_template_directory() . '/functions.php';

function ref_block( $id ) { return '<!-- wp:block {"ref":' . $id . '} /-->'; }
function set_pattern( $id, $content, $status = 'publish', $type = 'wp_block' ) {
	$GLOBALS['fixtures'][ $id ] = new WP_Post( $id, $type, $status, $content );
}
function set_document( $id, $content ) {
	$GLOBALS['current'] = new WP_Post( $id, 'page', 'publish', $content );
}
$checks = 0;
function check( $description, $expected, $actual ) {
	global $checks;
	++$checks;
	if ( $expected !== $actual ) {
		fwrite( STDERR, 'FAIL ' . $description . ' expected=' . var_export( $expected, true ) . ' actual=' . var_export( $actual, true ) . "\n" );
		exit( 1 );
	}
}

set_pattern( 101, '<!-- wp:image {"lightbox":{"enabled":true}} /-->' );
set_document( 1001, ref_block( 101 ) );
check( 'synced Core lightbox loads Photography', true, slateframe_photography_styles_needed() );
check( 'Core lightbox does not load Portfolio', false, slateframe_content_modes_needed() );
check( 'Core lightbox does not load Query Loop', false, slateframe_query_loop_styles_needed() );
check( 'synced reference is fetched once across three decisions', 1, $GLOBALS['lookups'][101] );

set_pattern( 102, '<!-- wp:gallery /--><figure class="is-style-slateframe-contact-sheet"></figure>' );
set_document( 1002, ref_block( 102 ) );
check( 'synced Photography gallery style', true, slateframe_photography_styles_needed() );
check( 'gallery does not load Query Loop', false, slateframe_query_loop_styles_needed() );

set_pattern( 103, '<!-- wp:group --><div class="slateframe-knowledge-checklist"></div>' );
set_document( 1003, ref_block( 103 ) );
check( 'synced Knowledge content mode', true, slateframe_content_modes_needed() );
check( 'Knowledge does not load Photography', false, slateframe_photography_styles_needed() );

set_pattern( 104, '<!-- wp:query --><div class="slateframe-project-grid"></div>' );
set_document( 1004, ref_block( 104 ) );
check( 'synced Portfolio Query Loop', true, slateframe_query_loop_styles_needed() );
check( 'synced Portfolio shared content mode', true, slateframe_content_modes_needed() );

set_pattern( 105, ref_block( 106 ) );
set_pattern( 106, ref_block( 107 ) );
set_pattern( 107, '<!-- wp:image {"lightbox":{"enabled":true}} /-->' );
set_document( 1005, ref_block( 105 ) );
check( 'nested synced Core lightbox', true, slateframe_photography_styles_needed() );
check( 'each nested pattern queried once', 1, $GLOBALS['lookups'][106] );

set_pattern( 108, ref_block( 109 ) );
set_pattern( 109, ref_block( 108 ) . '<div class="slateframe-knowledge-checklist"></div>' );
set_document( 1006, ref_block( 108 ) );
check( 'cyclic pattern still finds content', true, slateframe_content_modes_needed() );
check( 'cyclic reference is fetched once', 1, $GLOBALS['lookups'][108] );

set_pattern( 110, '<div class="slateframe-project-grid"></div>', 'draft' );
set_document( 1007, ref_block( 110 ) );
check( 'unpublished patterns excluded', false, slateframe_query_loop_styles_needed() );
set_pattern( 111, '<div class="slateframe-project-grid"></div>', 'publish', 'post' );
set_document( 1008, ref_block( 111 ) );
check( 'wrong post type excluded', false, slateframe_query_loop_styles_needed() );

set_pattern( 112, '<!-- wp:search /-->' );
set_document( 1009, ref_block( 112 ) );
check( 'synced Core Search form styles preserved', true, slateframe_forms_styles_needed() );
check( 'synced Core Search does not load classic search form', false, slateframe_search_form_styles_needed() );
set_pattern( 113, '<!-- wp:legacy-widget {"idBase":"search"} /-->' );
set_document( 1010, ref_block( 113 ) );
check( 'synced legacy Search retains both form layers', true, slateframe_search_form_styles_needed() );
set_pattern( 114, '<form><input /></form>' );
set_document( 1011, ref_block( 114 ) );
check( 'synced authored HTML form states preserved', true, slateframe_form_content_styles_needed() );

set_pattern( 115, '<div class="slateframe-project-grid"></div>' );
set_document( 1012, '<p>literal slateframe-project-grid is prose</p>' );
check( 'prose does not load Query Loop', false, slateframe_query_loop_styles_needed() );
set_document( 1013, ref_block( 115 ) . ref_block( 115 ) );
check( 'repeated sibling reference deduplicated', true, slateframe_query_loop_styles_needed() );
check( 'repeated sibling reference fetched once', 1, $GLOBALS['lookups'][115] );

$nested = array( array( 'blockName' => 'core/group', 'innerBlocks' => array( array( 'blockName' => 'core/group', 'innerBlocks' => array( array( 'blockName' => 'core/block', 'attrs' => array( 'ref' => 115 ) ) ) ) ) ) );
$seen = array();
check( 'ordinary Group nesting preserves reference depth', array( '<div class="slateframe-project-grid"></div>' ), slateframe_synced_pattern_contents( $nested, $seen ) );

set_pattern( 116, ref_block( 117 ) );
set_pattern( 117, ref_block( 118 ) );
set_pattern( 118, ref_block( 119 ) );
set_pattern( 119, ref_block( 120 ) );
set_pattern( 120, ref_block( 121 ) );
set_pattern( 121, ref_block( 122 ) );
set_pattern( 122, ref_block( 123 ) );
set_pattern( 123, ref_block( 124 ) );
set_pattern( 124, '<div class="slateframe-project-grid"></div>' );
$seen = array();
check( 'eight-reference bound excludes ninth', 8, count( slateframe_synced_pattern_contents( parse_blocks( ref_block( 116 ) ), $seen ) ) );

// A long branch must not hide descendants of a later, shorter reference.
for ( $id = 201; $id < 208; $id++ ) {
	set_pattern( $id, ref_block( $id + 1 ) );
}
set_pattern( 208, ref_block( 209 ) );
set_pattern( 209, '<div class="slateframe-project-grid"></div>' );
set_document( 1014, ref_block( 201 ) . ref_block( 208 ) );
check( 'shallower repeated reference can reveal depth-bounded child', true, slateframe_query_loop_styles_needed() );
check( 'shorter-path reference was fetched twice for correctness', 2, $GLOBALS['lookups'][208] );
check( 'depth-bounded descendant was reached', 1, $GLOBALS['lookups'][209] );

// Multiple presentation modes may be supplied by the same published pattern.
set_pattern( 210, '<!-- wp:image {"lightbox":{"enabled":true}} /--><div class="slateframe-project-grid"></div>' );
set_document( 1015, ref_block( 210 ) );
check( 'mixed pattern requests Photography', true, slateframe_photography_styles_needed() );
check( 'mixed pattern requests Query Loop', true, slateframe_query_loop_styles_needed() );
check( 'mixed pattern requests Knowledge/Portfolio', true, slateframe_content_modes_needed() );
check( 'mixed pattern fetched once', 1, $GLOBALS['lookups'][210] );

$seen = array();
check( 'invalid negative reference is ignored', array(), slateframe_synced_pattern_contents( array( array( 'blockName' => 'core/block', 'attrs' => array( 'ref' => -4 ) ) ), $seen ) );
$seen = array();
check( 'non-numeric reference is ignored', array(), slateframe_synced_pattern_contents( array( array( 'blockName' => 'core/block', 'attrs' => array( 'ref' => '1e3' ) ) ), $seen ) );
$seen = array();
check( 'missing pattern is ignored', array(), slateframe_synced_pattern_contents( array( array( 'blockName' => 'core/block', 'attrs' => array( 'ref' => 99999 ) ) ), $seen ) );

// Enqueue integration contract: asset handles must follow resolved content.
set_document( 1016, ref_block( 210 ) );
$GLOBALS['styles'] = array();
slateframe_assets();
check( 'mixed synced pattern enqueues Photography CSS', true, isset( $GLOBALS['styles']['slateframe-photography'] ) );
check( 'mixed synced pattern enqueues content mode CSS', true, isset( $GLOBALS['styles']['slateframe-content-modes'] ) );
check( 'mixed synced pattern enqueues Query Loop CSS', true, isset( $GLOBALS['styles']['slateframe-query-loop'] ) );
check( 'Query Loop depends on shared content mode', array( 'slateframe-content-modes' ), $GLOBALS['styles']['slateframe-query-loop'] );
check( 'Photography depends on reading', array( 'slateframe-reading' ), $GLOBALS['styles']['slateframe-photography'] );
check( 'synced pattern without forms does not enqueue forms', false, isset( $GLOBALS['styles']['slateframe-forms'] ) );

set_document( 1017, ref_block( 112 ) );
$GLOBALS['styles'] = array();
slateframe_assets();
check( 'Core Search pattern enqueues forms', true, isset( $GLOBALS['styles']['slateframe-forms'] ) );
check( 'Core Search pattern does not enqueue theme classic search form', false, isset( $GLOBALS['styles']['slateframe-search-form'] ) );
check( 'Core Search pattern does not enqueue photography', false, isset( $GLOBALS['styles']['slateframe-photography'] ) );

set_document( 1018, ref_block( 114 ) );
$GLOBALS['styles'] = array();
slateframe_assets();
check( 'authored synced form enqueues form-content', true, isset( $GLOBALS['styles']['slateframe-form-content'] ) );
check( 'form-content depends on forms', array( 'slateframe-forms' ), $GLOBALS['styles']['slateframe-form-content'] );

set_document( 1019, '<p>Nothing to see here</p>' );
$GLOBALS['styles'] = array();
slateframe_assets();
check( 'plain page has no specialized styles', false, isset( $GLOBALS['styles']['slateframe-photography'] ) || isset( $GLOBALS['styles']['slateframe-query-loop'] ) || isset( $GLOBALS['styles']['slateframe-content-modes'] ) );

check( 'footer widget inspection cached per request', 1, $GLOBALS['footer_lookups'] );

$GLOBALS['singular'] = false;
check( 'non-singular pages do not enqueue Photography', false, slateframe_photography_styles_needed() );
check( 'non-singular pages do not enqueue Query Loop', false, slateframe_query_loop_styles_needed() );
check( 'non-singular pages do not enqueue content modes', false, slateframe_content_modes_needed() );

printf( "PASS %d isolated PHP presentation assertions\n", $checks );
