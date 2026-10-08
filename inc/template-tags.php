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
 * Return a resilient display title for frontend discovery surfaces.
 *
 * WordPress permits untitled content. Theme navigation must still expose a
 * meaningful, translatable label instead of an empty link target.
 *
 * @param int $post_id Optional post ID. Defaults to the current post.
 * @return string
 */
function slateframe_get_display_title( $post_id = 0 ) {
	$title = get_the_title( $post_id );

	if ( '' === trim( wp_strip_all_tags( (string) $title ) ) ) {
		return __( 'Untitled', 'slateframe' );
	}

	return $title;
}

/**
 * Render featured media shared by posts and Pages.
 *
 * @param int $post_id Optional post ID. Defaults to the current post.
 */
function slateframe_featured_media( $post_id = 0 ) {
	$post_id = $post_id ? absint( $post_id ) : get_the_ID();

	if ( ! $post_id || ! has_post_thumbnail( $post_id ) ) {
		return;
	}

	$thumbnail_id = get_post_thumbnail_id( $post_id );
	$caption      = wp_get_attachment_caption( $thumbnail_id );

	$image_html = wp_get_attachment_image(
		$thumbnail_id,
		'full',
		false,
		array(
			'class'    => 'slateframe-entry-hero-image',
			'loading'  => 'eager',
			'decoding' => 'async',
		)
	);

	if ( '' === $image_html ) {
		return;
	}

	$image_processor = new WP_HTML_Tag_Processor( $image_html );

	if ( $image_processor->next_tag( 'img' ) ) {
		$image_processor->set_attribute( 'loading', 'eager' );
		$image_processor->set_attribute( 'decoding', 'async' );
		$image_processor->set_attribute( 'fetchpriority', 'high' );
		$image_html = $image_processor->get_updated_html();
	}

	echo '<figure class="slateframe-shell slateframe-entry-hero">';
	// wp_get_attachment_image() escapes its responsive image markup; attributes above are set through Core's HTML processor.
	echo $image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

	if ( '' !== trim( (string) $caption ) ) {
		printf( '<figcaption class="wp-caption-text">%s</figcaption>', wp_kses_post( $caption ) );
	}

	echo '</figure>';
}

/**
 * Return portable attachment metadata without exposing server file paths.
 *
 * @param int $attachment_id Attachment post ID.
 * @return array<string,string>
 */
function slateframe_attachment_details( $attachment_id ) {
	$attachment_id = absint( $attachment_id );
	$metadata      = wp_get_attachment_metadata( $attachment_id );
	$details       = array();
	$mime_type     = get_post_mime_type( $attachment_id );

	if ( $mime_type ) {
		$details[ __( 'File type', 'slateframe' ) ] = $mime_type;
	}

	if ( is_array( $metadata ) && ! empty( $metadata['width'] ) && ! empty( $metadata['height'] ) ) {
		$details[ __( 'Dimensions', 'slateframe' ) ] = sprintf(
			/* translators: 1: image width, 2: image height. */
			__( '%1$s × %2$s px', 'slateframe' ),
			number_format_i18n( (int) $metadata['width'] ),
			number_format_i18n( (int) $metadata['height'] )
		);
	}

	if ( is_array( $metadata ) && ! empty( $metadata['filesize'] ) ) {
		$details[ __( 'File size', 'slateframe' ) ] = size_format( (int) $metadata['filesize'] );
	}

	/**
	 * Filters metadata displayed on an attachment page.
	 *
	 * @param array<string,string> $details       Label/value metadata.
	 * @param int                  $attachment_id Attachment post ID.
	 */
	return apply_filters( 'slateframe_attachment_details', $details, $attachment_id );
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

	$author_id   = (int) get_the_author_meta( 'ID' );
	$author_name = trim( (string) get_the_author() );
	$author_url  = $author_id ? get_author_posts_url( $author_id ) : '';

	/**
	 * Filters the author destination used by Slateframe entry metadata.
	 *
	 * Sites may point a byline at an About/Profile page without globally
	 * rewriting WordPress author archive URLs.
	 *
	 * @param string $author_url Default author archive URL.
	 * @param int    $author_id  WordPress user ID.
	 */
	$author_url = apply_filters( 'slateframe_author_url', $author_url, $author_id );

	echo '<div class="slateframe-entry-meta">';
	slateframe_posted_on();

	if ( '' !== $author_name ) {
		echo '<span aria-hidden="true"> · </span>';

		if ( $author_url ) {
			printf(
				'<span class="slateframe-byline"><span class="screen-reader-text">%1$s </span><a href="%2$s">%3$s</a></span>',
				esc_html__( 'By', 'slateframe' ),
				esc_url( $author_url ),
				esc_html( $author_name )
			);
		} else {
			printf(
				'<span class="slateframe-byline"><span class="screen-reader-text">%1$s </span>%2$s</span>',
				esc_html__( 'By', 'slateframe' ),
				esc_html( $author_name )
			);
		}
	}

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

	/**
	 * Filters taxonomy markup shown in the single-entry footer.
	 *
	 * @param string $categories Category links HTML.
	 * @param int    $post_id    Current post ID.
	 */
	$categories = apply_filters( 'slateframe_entry_categories_html', $categories, get_the_ID() );

	/**
	 * Filters tag markup shown in the single-entry footer.
	 *
	 * @param string $tags    Tag links HTML.
	 * @param int    $post_id Current post ID.
	 */
	$tags = apply_filters( 'slateframe_entry_tags_html', $tags, get_the_ID() );

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
 * Print accessible, touch-sized navigation for WordPress native page breaks.
 *
 * Core owns current-page semantics; single-page documents emit no navigation.
 */
function slateframe_content_pagination() {
	wp_link_pages(
		array(
			'before' => '<nav class="slateframe-content-pages" aria-label="' . esc_attr__( 'Content pages', 'slateframe' ) . '">',
			'after'  => '</nav>',
		)
	);
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
 *
 * wp_page_menu() always restores its default div when the container argument
 * is empty. Building the list directly keeps fallback markup identical in
 * shape to wp_nav_menu() output, which simplifies responsive navigation.
 */
function slateframe_menu_fallback() {
	$pages = wp_list_pages(
		array(
			'echo'     => false,
			'title_li' => '',
		)
	);

	printf(
		'<ul class="slateframe-menu-fallback"><li class="page_item slateframe-home-link"><a href="%1$s">%2$s</a></li>%3$s</ul>',
		esc_url( home_url( '/' ) ),
		esc_html__( 'Home', 'slateframe' ),
		wp_kses_post( $pages )
	);
}
