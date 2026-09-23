<?php
/**
 * Slateframe theme bootstrap.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once get_template_directory() . '/inc/template-tags.php';

/**
 * Register theme supports and navigation locations.
 */
function slateframe_setup() {
	load_theme_textdomain( 'slateframe', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'editor-styles' );
	add_editor_style( array( 'style.css', 'assets/css/editor.css' ) );

	add_theme_support(
		'html5',
		array(
			'search-form',
			'comment-form',
			'comment-list',
			'gallery',
			'caption',
			'style',
			'script',
		)
	);

	add_theme_support(
		'custom-logo',
		array(
			'height'      => 96,
			'width'       => 96,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	register_nav_menus(
		array(
			'primary' => __( 'Primary navigation', 'slateframe' ),
			'footer'  => __( 'Footer navigation', 'slateframe' ),
		)
	);
}
add_action( 'after_setup_theme', 'slateframe_setup' );

/**
 * Enqueue the intentionally small frontend asset layer.
 */
function slateframe_assets() {
	$version = wp_get_theme()->get( 'Version' );

	wp_enqueue_style( 'slateframe-style', get_stylesheet_uri(), array(), $version );

	if ( is_singular() && ( comments_open() || get_comments_number() ) ) {
		wp_enqueue_style(
			'slateframe-comments',
			get_template_directory_uri() . '/assets/css/comments.css',
			array( 'slateframe-style' ),
			$version
		);
	}

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}

	if ( is_rtl() ) {
		wp_enqueue_style(
			'slateframe-rtl',
			get_template_directory_uri() . '/rtl.css',
			array( 'slateframe-style' ),
			$version
		);
	}

	wp_enqueue_script(
		'slateframe-theme',
		get_template_directory_uri() . '/assets/js/theme.js',
		array(),
		$version,
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
}
add_action( 'wp_enqueue_scripts', 'slateframe_assets' );

/**
 * Render only the custom-logo image inside Slateframe's own brand link.
 *
 * Core get_custom_logo() includes its own anchor. Rendering the attachment
 * directly avoids invalid nested links in the header.
 */
function slateframe_brand_mark() {
	$logo_id = (int) get_theme_mod( 'custom_logo' );

	if ( ! $logo_id ) {
		return;
	}

	echo wp_kses_post(
		wp_get_attachment_image(
			$logo_id,
			'full',
			false,
			array(
				'class'       => 'slateframe-brand-logo',
				'alt'         => '',
				'aria-hidden' => 'true',
				'loading'     => 'eager',
				'decoding'    => 'async',
			)
		)
	);
}

/**
 * Render an optional language selector supplied by an integration plugin.
 *
 * Core remains language-agnostic: no locale list, URL pattern, or plugin is
 * assumed here.
 */
function slateframe_language_switcher() {
	$html = apply_filters( 'slateframe_language_switcher_html', '' );

	if ( ! $html ) {
		return;
	}

	echo '<div class="slateframe-language-slot">';
	echo wp_kses_post( $html );
	echo '</div>';
}

/**
 * Register reusable editorial block styles.
 */
function slateframe_register_block_styles() {
	$styles = array(
		array( 'core/quote', 'slateframe-note', __( 'Editorial note', 'slateframe' ) ),
		array( 'core/group', 'slateframe-project-feature', __( 'Project feature', 'slateframe' ) ),
		array( 'core/group', 'slateframe-learning-path', __( 'Learning path', 'slateframe' ) ),
		array( 'core/image', 'slateframe-frame', __( 'Editorial frame', 'slateframe' ) ),
		array( 'core/gallery', 'slateframe-photo-sequence', __( 'Photo sequence', 'slateframe' ) ),
		array( 'core/table', 'slateframe-data', __( 'Data table', 'slateframe' ) ),
		array( 'core/details', 'slateframe-disclosure', __( 'Editorial disclosure', 'slateframe' ) ),
		array( 'core/gallery', 'slateframe-contact-sheet', __( 'Contact sheet', 'slateframe' ) ),
		array( 'core/list', 'slateframe-steps', __( 'Numbered steps', 'slateframe' ) ),
		array( 'core/list', 'slateframe-checklist', __( 'Editorial checklist', 'slateframe' ) ),
		array( 'core/group', 'slateframe-key-facts', __( 'Key facts', 'slateframe' ) ),
		array( 'core/columns', 'slateframe-ledger', __( 'Editorial ledger', 'slateframe' ) ),
	);

	foreach ( $styles as $style ) {
		register_block_style(
			$style[0],
			array(
				'name'  => $style[1],
				'label' => $style[2],
			)
		);
	}
}
add_action( 'init', 'slateframe_register_block_styles' );

/**
 * Register Slateframe's pattern category.
 */
function slateframe_pattern_category() {
	$categories = array(
		'slateframe'             => __( 'Slateframe', 'slateframe' ),
		'slateframe-photography' => __( 'Slateframe: Photography', 'slateframe' ),
		'slateframe-portfolio'   => __( 'Slateframe: Portfolio', 'slateframe' ),
		'slateframe-knowledge'   => __( 'Slateframe: Knowledge', 'slateframe' ),
	);

	foreach ( $categories as $slug => $label ) {
		register_block_pattern_category(
			$slug,
			array(
				'label' => $label,
			)
		);
	}
}
add_action( 'init', 'slateframe_pattern_category' );
