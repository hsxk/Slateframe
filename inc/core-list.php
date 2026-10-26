<?php
/**
 * Native WordPress List presentation for frontend and Gutenberg.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register only intrinsic reflow for rendered Core List blocks.
 *
 * Core retains ownership of list nesting, markers, start, reversed and links.
 */
function slateframe_register_core_list_styles() {
	wp_enqueue_block_style(
		'core/list',
		array(
			'handle' => 'slateframe-core-list',
			'src'    => get_template_directory_uri() . '/assets/css/core-list.css',
			'path'   => get_template_directory() . '/assets/css/core-list.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_list_styles', 20 );

/**
 * Mirror the same native list reflow into the block editor.
 */
function slateframe_register_core_list_editor_style() {
	add_editor_style( 'assets/css/core-list.css' );
}
add_action( 'after_setup_theme', 'slateframe_register_core_list_editor_style', 20 );
