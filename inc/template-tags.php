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
 * Accept only positive, non-overflowing integer values from Core metadata.
 *
 * Never cast arrays, objects, booleans, fractions or overflowing strings to
 * a different valid-looking post ID, image dimension or byte count.
 *
 * @param mixed $value Value from Core or an integration filter.
 * @return int Positive integer or zero when invalid.
 */
function slateframe_positive_int( $value ) {
	if ( ! is_int( $value ) && ! is_string( $value ) ) {
		return 0;
	}

	$digits = (string) $value;
	if ( ! preg_match( '/^[0-9]+$/D', $digits ) ) {
		return 0;
	}

	$number = (int) $digits;
	return $number > 0 && ltrim( $digits, '0' ) === (string) $number ? $number : 0;
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

	if ( ! is_string( $title ) || '' === trim( wp_strip_all_tags( $title ) ) ) {
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

	// Attachment filters may return false, objects or non-image markup. Never
	// pass those values to Core's HTML processor or emit an empty hero figure.
	if ( ! is_string( $image_html ) || '' === trim( $image_html ) ) {
		return;
	}

	// KSES strips untrusted filter markup before Core adds fixed, safe image
	// attributes. Applying KSES afterward would strip fetchpriority/decoding.
	$image_html      = wp_kses_post( $image_html );
	$image_processor = new WP_HTML_Tag_Processor( $image_html );

	if ( ! $image_processor->next_tag( 'img' ) ) {
		return;
	}

	// Filters can leave a valid-looking image tag without a usable source.
	// Match attachment previews: accept Core responsive srcset-only images.
	$image_src    = $image_processor->get_attribute( 'src' );
	$image_srcset = $image_processor->get_attribute( 'srcset' );
	$has_source   = ( is_string( $image_src ) && '' !== trim( $image_src ) )
		|| ( is_string( $image_srcset ) && '' !== trim( $image_srcset ) );
	if ( ! $has_source ) {
		return;
	}

	$image_processor->set_attribute( 'loading', 'eager' );
	$image_processor->set_attribute( 'decoding', 'async' );
	$image_processor->set_attribute( 'fetchpriority', 'high' );
	$image_html = $image_processor->get_updated_html();

	echo '<figure class="slateframe-shell slateframe-entry-hero">';
	// Filter-provided HTML passed KSES above; only fixed Core image attributes
	// were added afterward. Preserve responsive and priority attributes.
	echo $image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

	if ( is_string( $caption ) && '' !== trim( $caption ) ) {
		printf( '<figcaption class="wp-caption-text">%s</figcaption>', wp_kses_post( $caption ) );
	}

	echo '</figure>';
}

/**
 * Return the public parent of an attachment, if one exists.
 *
 * Attachment pages can be reached independently of their parent. Never
 * expose a private, draft, scheduled, trashed, or non-viewable parent's
 * title and permalink in the attachment recovery navigation. Core decides
 * public visibility for built-in and registered custom post types.
 *
 * @param int $attachment_id Attachment post ID.
 * @return int Public parent post ID, or zero when no public parent exists.
 */
function slateframe_public_attachment_parent_id( $attachment_id ) {
	// Core returns an integer, but filtered post objects may expose malformed
	// parent IDs. Casting arrays, booleans or overflowing strings could turn
	// them into an unrelated public post and expose its recovery link.
	$parent_id = slateframe_positive_int( wp_get_post_parent_id( absint( $attachment_id ) ) );

	if ( 0 >= $parent_id || ! is_post_publicly_viewable( $parent_id ) ) {
		return 0;
	}

	return $parent_id;
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

	if ( is_string( $mime_type ) && '' !== $mime_type ) {
		$details[ __( 'File type', 'slateframe' ) ] = $mime_type;
	}

	$width  = is_array( $metadata ) ? slateframe_positive_int( isset( $metadata['width'] ) ? $metadata['width'] : null ) : 0;
	$height = is_array( $metadata ) ? slateframe_positive_int( isset( $metadata['height'] ) ? $metadata['height'] : null ) : 0;
	if ( $width && $height ) {
		$details[ __( 'Dimensions', 'slateframe' ) ] = sprintf(
			/* translators: 1: image width, 2: image height. */
			__( '%1$s × %2$s px', 'slateframe' ),
			number_format_i18n( $width ),
			number_format_i18n( $height )
		);
	}

	$filesize = is_array( $metadata ) ? slateframe_positive_int( isset( $metadata['filesize'] ) ? $metadata['filesize'] : null ) : 0;
	if ( $filesize ) {
		$details[ __( 'File size', 'slateframe' ) ] = size_format( $filesize );
	}

	/**
	 * Filters metadata displayed on an attachment page.
	 *
	 * @param array<string,string> $details       Label/value metadata.
	 * @param int                  $attachment_id Attachment post ID.
	 */
	$filtered = apply_filters( 'slateframe_attachment_details', $details, $attachment_id );
	if ( ! is_array( $filtered ) ) {
		return $details;
	}

	$safe_details = array();
	foreach ( $filtered as $label => $value ) {
		if (
			! is_string( $label ) ||
			'' === trim( $label ) ||
			! is_string( $value ) ||
			'' === trim( $value )
		) {
			continue;
		}
		$safe_details[ $label ] = $value;
	}

	return $safe_details;
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

	$author_id   = slateframe_positive_int( get_the_author_meta( 'ID' ) );
	$raw_author  = get_the_author();
	$author_name = is_string( $raw_author ) ? trim( $raw_author ) : '';
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
	// Extensions may intentionally suppress a byline link or return invalid data.
	// Sanitize before deciding whether to render an anchor at all.
	$author_url = is_string( $author_url ) ? esc_url_raw( $author_url ) : '';

	echo '<div class="slateframe-entry-meta">';
	slateframe_posted_on();

	if ( '' !== $author_name ) {
		// Keep punctuation and the author together when metadata wraps.
		echo '<span class="slateframe-meta-byline"><span class="slateframe-meta-separator" aria-hidden="true">·</span>';

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

		echo '</span>';
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

	// The public hooks accept HTML strings. Ignore malformed plugin returns
	// instead of passing arrays or WP_Error objects to wp_kses_post().
	$categories = is_string( $categories ) ? $categories : '';
	$tags       = is_string( $tags ) ? $tags : '';

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
	// Core must retain the static front page as a parent of its child pages.
	$static_front = 'page' === get_option( 'show_on_front' ) && slateframe_positive_int( get_option( 'page_on_front' ) );
	$pages        = wp_list_pages(
		array(
			'echo'     => false,
			'title_li' => '',
		)
	);

	$home = '';
	// An unpublished or filtered static front page can leave Core's list empty.
	if ( ! $static_front || ! is_string( $pages ) || '' === trim( $pages ) ) {
		$is_current = is_front_page();
		$home       = sprintf(
			'<li class="page_item slateframe-home-link%1$s"><a href="%2$s"%3$s>%4$s</a></li>',
			$is_current ? ' current_page_item' : '',
			esc_url( home_url( '/' ) ),
			$is_current ? ' aria-current="page"' : '',
			esc_html__( 'Home', 'slateframe' )
		);
	}

	printf(
		'<ul class="slateframe-menu-fallback">%1$s%2$s</ul>',
		$home, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
		wp_kses_post( is_string( $pages ) ? $pages : '' )
	);
}


/**
 * Scope the theme's classic form field references when a Query Loop also
 * renders a Core comment form for a different post on the same document.
 *
 * WordPress Core's repeated-post form uses canonical field IDs. Leave its
 * markup, submission names and post target untouched; scope only canonical
 * field IDs in the theme-owned outer form. Plugins' non-Core IDs survive.
 *
 * @param string $html Field markup from Core or a plugin.
 * @return string Field markup with local ID references.
 */
function slateframe_scope_classic_comment_field_html( $html ) {
	if ( ! is_string( $html ) || '' === $html ) {
		return $html;
	}

	$post_id = absint( get_the_ID() );
	if ( ! $post_id ) {
		return $html;
	}

	$ids = array( 'comment', 'author', 'email', 'url', 'wp-comment-cookies-consent', 'email-notes' );
	$map = array();
	foreach ( $ids as $id ) {
		$map[ $id ] = 'slateframe-outer-' . $post_id . '-' . $id;
	}

	$tags = new WP_HTML_Tag_Processor( $html );
	while ( $tags->next_tag() ) {
		foreach ( array( 'id', 'for' ) as $attribute ) {
			$value = $tags->get_attribute( $attribute );
			if ( is_string( $value ) && isset( $map[ $value ] ) ) {
				$tags->set_attribute( $attribute, $map[ $value ] );
			}
		}

		$describedby = $tags->get_attribute( 'aria-describedby' );
		if ( is_string( $describedby ) && '' !== $describedby ) {
			$tokens = preg_split( '/\\s+/', trim( $describedby ) );
			if ( is_array( $tokens ) ) {
				$updated = array_map(
					static function ( $token ) use ( $map ) {
						return isset( $map[ $token ] ) ? $map[ $token ] : $token;
					},
					$tokens
				);
				$tags->set_attribute( 'aria-describedby', implode( ' ', $updated ) );
			}
		}
	}

	return $tags->get_updated_html();
}

/**
 * Scope only Core's default classic form container IDs and email note.
 *
 * @param array $defaults Core comment form defaults.
 * @return array Scoped defaults.
 */
function slateframe_scope_classic_comment_defaults( $defaults ) {
	if ( ! is_array( $defaults ) || ! get_the_ID() ) {
		return $defaults;
	}

	$prefix = 'slateframe-outer-' . absint( get_the_ID() ) . '-';
	if ( isset( $defaults['id_form'] ) && 'commentform' === $defaults['id_form'] ) {
		$defaults['id_form'] = $prefix . 'commentform';
	}
	if ( isset( $defaults['id_submit'] ) && 'submit' === $defaults['id_submit'] ) {
		$defaults['id_submit'] = $prefix . 'submit';
	}
	if ( isset( $defaults['comment_notes_before'] ) ) {
		$defaults['comment_notes_before'] = slateframe_scope_classic_comment_field_html( $defaults['comment_notes_before'] );
	}

	return $defaults;
}

/**
 * Keep each classic label and description associated with its own field.
 *
 * @param array $fields Filtered Core comment form fields.
 * @return array Scoped fields.
 */
function slateframe_scope_classic_comment_fields( $fields ) {
	if ( ! is_array( $fields ) ) {
		return $fields;
	}

	foreach ( $fields as $key => $html ) {
		$fields[ $key ] = slateframe_scope_classic_comment_field_html( $html );
	}

	return $fields;
}

/**
 * Let the native Core comment submit label wrap at extreme text enlargement.
 *
 * Core's default input cannot wrap its value and visually clips translated
 * labels on narrow screens. Only replace the unchanged Core default template;
 * custom plugin and caller submit markup remain authoritative.
 *
 * @param array $defaults WordPress Core comment form defaults.
 * @return array Unchanged defaults except for the native submit presentation.
 */
function slateframe_comment_form_reflow_defaults( $defaults ) {
	$core_submit = '<input name="%1$s" type="submit" id="%2$s" class="%3$s" value="%4$s" />';

	if ( is_array( $defaults ) && isset( $defaults['submit_button'] ) && $core_submit === $defaults['submit_button'] ) {
		$defaults['submit_button'] = '<button name="%1$s" type="submit" id="%2$s" class="%3$s" value="%4$s">%4$s</button>';
	}

	return $defaults;
}
