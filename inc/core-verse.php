<?php
/**
 * Native Core Verse presentation without owning poetry markup.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register a small, conditional reflow layer for native Verse blocks.
 *
 * WordPress retains authored line breaks, typography, alignment and direction.
 */
function slateframe_register_core_verse_styles() {
	wp_enqueue_block_style(
		'core/verse',
		array(
			'handle' => 'slateframe-core-verse',
			'src'    => get_template_directory_uri() . '/assets/css/core-verse.css',
			'path'   => get_template_directory() . '/assets/css/core-verse.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_verse_styles', 20 );

/**
 * Match the native Verse presentation in Gutenberg without custom blocks.
 */
function slateframe_register_core_verse_editor_style() {
	add_editor_style( 'assets/css/core-verse.css' );
}
add_action( 'after_setup_theme', 'slateframe_register_core_verse_editor_style', 20 );
