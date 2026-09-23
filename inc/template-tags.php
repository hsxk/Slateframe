<?php
/**
 * Reusable template helpers.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Print the published date.
 */
function slateframe_posted_on() {
	printf(
		'<time class="slateframe-published" datetime="%1$s">%2$s</time>',
		esc_attr( get_the_date( DATE_W3C ) ),
		esc_html( get_the_date() )
	);
}

/**
 * Print compact metadata for posts.
 */
function slateframe_entry_meta() {
	if ( 'post' !== get_post_type() ) {
		return;
	}

	$author_url  = get_author_posts_url( (int) get_the_author_meta( 'ID' ) );
	$author_name = get_the_author();

	echo '<div class="slateframe-entry-meta">';
	slateframe_posted_on();
	echo '<span aria-hidden="true"> · </span>';
	printf(
		'<span class="slateframe-byline"><span class="screen-reader-text">%1$s </span><a href="%2$s">%3$s</a></span>',
		esc_html__( 'By', 'slateframe' ),
		esc_url( $author_url ),
		esc_html( $author_name )
	);
	echo '</div>';
}

/**
 * Print category and tag context for a post.
 */
function slateframe_entry_footer() {
	if ( 'post' !== get_post_type() ) {
		return;
	}

	$categories = get_the_category_list( esc_html_x( ', ', 'category list separator', 'slateframe' ) );
	$tags       = get_the_tag_list( '', esc_html_x( ', ', 'tag list separator', 'slateframe' ) );

	if ( ! $categories && ! $tags ) {
		return;
	}

	echo '<footer class="slateframe-entry-footer">';

	if ( $categories ) {
		printf(
			'<div><span class="slateframe-entry-footer-label">%1$s</span> %2$s</div>',
			esc_html__( 'Filed under', 'slateframe' ),
			wp_kses_post( $categories )
		);
	}

	if ( $tags ) {
		printf(
			'<div><span class="slateframe-entry-footer-label">%1$s</span> %2$s</div>',
			esc_html__( 'Tagged', 'slateframe' ),
			wp_kses_post( $tags )
		);
	}

	echo '</footer>';
}

/**
 * Print posts pagination.
 */
function slateframe_pagination() {
	the_posts_pagination(
		array(
			'mid_size'           => 1,
			'prev_text'          => esc_html__( 'Previous', 'slateframe' ),
			'next_text'          => esc_html__( 'Next', 'slateframe' ),
			'screen_reader_text' => __( 'Posts navigation', 'slateframe' ),
		)
	);
}

/**
 * Provide a usable navigation fallback on fresh installs.
 */
function slateframe_menu_fallback() {
	wp_page_menu(
		array(
			'container'  => false,
			'menu_class' => 'slateframe-menu-fallback',
			'show_home'  => true,
		)
	);
}
