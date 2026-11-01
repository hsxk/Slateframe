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
 * Check whether theme-owned presentation text has a readable character.
 *
 * Use a decoded, tag-free copy for the decision; callers retain the original
 * Core string and its escaping. Empty entities, combining-only text and
 * invisible Unicode fillers must not create nameless links.
 *
 * @param mixed $text Candidate text from WordPress Core or a display filter.
 * @return bool Whether the label has a readable character.
 */
function slateframe_has_readable_label( $text ) {
	if ( ! is_string( $text ) ) {
		return false;
	}

	$plain = html_entity_decode( wp_strip_all_tags( $text ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	return 1 === preg_match( '/[^\p{Z}\p{Cc}\p{Cf}\p{M}\x{115F}\x{1160}\x{3164}\x{FFA0}\x{2800}\s]/u', $plain );
}

/**
 * Output the Core footer name or a localized visible fallback.
 *
 * @param bool $has_readable_name Whether the display-filtered site title is readable.
 * @return void
 */
function slateframe_footer_display_name( $has_readable_name ) {
	if ( $has_readable_name ) {
		bloginfo( 'name' );
		return;
	}

	esc_html_e( 'Home', 'slateframe' );
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

	if ( ! slateframe_has_readable_label( $title ) ) {
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

	if ( slateframe_has_readable_label( $caption ) ) {
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
		$filtered = $details;
	}

	$safe_details = array();
	foreach ( $filtered as $label => $value ) {
		// Public metadata filters may return HTML-only or Unicode-invisible
		// labels/values. Never render an unnamed definition row.
		if ( ! slateframe_has_readable_label( $label ) || ! slateframe_has_readable_label( $value ) ) {
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
		'<time class="slateframe-published" datetime="%1$s"><bdi>%2$s</bdi></time>',
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

	if ( slateframe_has_readable_label( $author_name ) ) {
		// Keep punctuation and the author together when metadata wraps.
		echo '<span class="slateframe-meta-byline"><span class="slateframe-meta-separator" aria-hidden="true">·</span>';

		if ( $author_url ) {
			printf(
				'<span class="slateframe-byline"><span class="screen-reader-text">%1$s </span><a href="%2$s"><bdi>%3$s</bdi></a></span>',
				esc_html__( 'By', 'slateframe' ),
				esc_url( $author_url ),
				esc_html( $author_name )
			);
		} else {
			printf(
				'<span class="slateframe-byline"><span class="screen-reader-text">%1$s </span><bdi>%2$s</bdi></span>',
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

	// Filters can return whitespace, empty anchors or invisible Unicode.
	// Omit those groups rather than exposing an orphaned taxonomy label.
	if ( ! slateframe_has_readable_label( $categories ) ) {
		$categories = '';
	}
	if ( ! slateframe_has_readable_label( $tags ) ) {
		$tags = '';
	}

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
	$front_page_id = 0;
	if ( 'page' === get_option( 'show_on_front' ) ) {
		$front_page_id = slateframe_positive_int( get_option( 'page_on_front' ) );
	}

	$pages = wp_list_pages(
		array(
			'echo'     => false,
			'title_li' => '',
		)
	);

	$home              = '';
	$front_page_listed = false;
	// A filtered Core page list may still contain other pages while omitting
	// the configured front page. Check the actual list before hiding Home.
	if ( $front_page_id && is_string( $pages ) && '' !== trim( $pages ) ) {
		$slateframe_page_tags = new WP_HTML_Tag_Processor( $pages );
		while ( $slateframe_page_tags->next_tag( 'li' ) ) {
			if ( $slateframe_page_tags->has_class( 'page-item-' . $front_page_id ) ) {
				$front_page_listed = true;
				break;
			}
		}
	}
	if ( ! $front_page_listed ) {
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
 * Track an actually rendered Core form owned by a different queried post.
 *
 * Empty Query Loops keep canonical classic form IDs and native JS replies.
 * This does not alter Core markup, query content or post ownership.
 *
 * @param string   $content  Rendered Core block HTML.
 * @param array    $block    Parsed Core block.
 * @param WP_Block $instance Core block instance with post context.
 * @return string Unmodified HTML.
 */
function slateframe_track_nested_core_comment_form( $content, $block, $instance ) {
	if ( ! is_singular() || ! is_string( $content ) || false === strpos( $content, 'id="respond"' ) || ! $instance instanceof WP_Block || ! isset( $instance->context['postId'] ) ) {
		return $content;
	}

	$outer_id  = slateframe_positive_int( get_queried_object_id() );
	$nested_id = slateframe_positive_int( $instance->context['postId'] );
	if ( $outer_id && $nested_id && $outer_id !== $nested_id ) {
		$GLOBALS['slateframe_nested_core_comment_form_rendered'] = $outer_id;
	}

	return $content;
}

/**
 * Use Core's no-JavaScript reply URL fallback for the second comment form.
 *
 * Core's comment-reply script can manage only one canonical responder. Do
 * not let it move the queried post's form into the outer post's thread.
 *
 * @param string     $link    Reply link HTML.
 * @param array      $args    Core reply arguments.
 * @param WP_Comment $comment Replied-to comment.
 * @param WP_Post    $post    Comment's owning post.
 * @return string Fallback link to the outer form.
 */
function slateframe_scope_outer_comment_reply_link( $link, $args, $comment, $post ) {
	$outer_id = isset( $GLOBALS['slateframe_nested_core_comment_form_rendered'] ) ? slateframe_positive_int( $GLOBALS['slateframe_nested_core_comment_form_rendered'] ) : 0;
	if ( ! $outer_id || ! $post instanceof WP_Post || (int) $post->ID !== $outer_id || ! is_string( $link ) ) {
		return $link;
	}

	$tags = new WP_HTML_Tag_Processor( $link );
	while ( $tags->next_tag( 'a' ) ) {
		if ( ! $tags->has_class( 'comment-reply-link' ) ) {
			continue;
		}
		$tags->remove_class( 'comment-reply-link' );
		// Core's reply script may also be bound through an inline handler.
		// Removing only the class leaves addComment.moveForm() active and
		// can move the queried post's responder into the outer thread.
		$tags->remove_attribute( 'onclick' );
		$href = $tags->get_attribute( 'href' );
		if ( is_string( $href ) && '#respond' === substr( $href, -8 ) ) {
			$tags->set_attribute( 'href', substr( $href, 0, -8 ) . '#slateframe-outer-' . $outer_id . '-respond' );
		}
	}

	return $tags->get_updated_html();
}

/**
 * Scope Core's hardcoded reply container IDs in the theme's second form.
 *
 * Only the outer form is buffered and rewritten. Preserve submission names,
 * values, Core's queried-post form and arbitrary plugin field markup.
 *
 * @param string $html    Classic form markup.
 * @param int    $post_id Outer singular post ID.
 * @return string Scoped form markup.
 */
function slateframe_scope_outer_comment_form_html( $html, $post_id ) {
	$post_id = slateframe_positive_int( $post_id );
	if ( ! is_string( $html ) || ! $post_id ) {
		return $html;
	}

	$prefix = 'slateframe-outer-' . $post_id . '-';
	$ids    = array( 'respond', 'reply-title', 'cancel-comment-reply-link', 'comment_parent', 'comment_post_ID' );
	$map    = array();
	foreach ( $ids as $id ) {
		$map[ $id ] = $prefix . $id;
	}

	$tags = new WP_HTML_Tag_Processor( $html );
	while ( $tags->next_tag() ) {
		foreach ( array( 'id', 'for' ) as $attribute ) {
			$value = $tags->get_attribute( $attribute );
			if ( is_string( $value ) && isset( $map[ $value ] ) ) {
				$tags->set_attribute( $attribute, $map[ $value ] );
			}
		}
		foreach ( array( 'aria-labelledby', 'aria-describedby' ) as $attribute ) {
			$value = $tags->get_attribute( $attribute );
			if ( ! is_string( $value ) || '' === trim( $value ) ) {
				continue;
			}
			$tokens = preg_split( '/\s+/', trim( $value ) );
			if ( is_array( $tokens ) ) {
				$tokens = array_map(
					static function ( $token ) use ( $map ) {
						return isset( $map[ $token ] ) ? $map[ $token ] : $token;
					},
					$tokens
				);
				$tags->set_attribute( $attribute, implode( ' ', $tokens ) );
			}
		}
		$href = $tags->get_attribute( 'href' );
		if ( is_string( $href ) && '#respond' === substr( $href, -8 ) ) {
			$tags->set_attribute( 'href', substr( $href, 0, -8 ) . '#' . $prefix . 'respond' );
		}
	}

	return $tags->get_updated_html();
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

	$ids  = array( 'comment', 'author', 'email', 'url', 'wp-comment-cookies-consent', 'email-notes' );
	$map  = array();
	$scan = new WP_HTML_Tag_Processor( $html );
	while ( $scan->next_tag() ) {
		$id = $scan->get_attribute( 'id' );
		// A plugin may replace a Core field with its own ID. Do not rewrite
		// a label unless its corresponding canonical control is present.
		if ( is_string( $id ) && in_array( $id, $ids, true ) ) {
			$map[ $id ] = 'slateframe-outer-' . $post_id . '-' . $id;
		}
	}
	// The email note is rendered separately from its field. Preserve
	// cross-field aria-describedby references only when that note was scoped.
	if ( ! empty( $GLOBALS['slateframe_classic_comment_note_scoped'] ) ) {
		$map['email-notes'] = 'slateframe-outer-' . $post_id . '-email-notes';
	}
	if ( ! $map ) {
		return $html;
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
	$GLOBALS['slateframe_classic_comment_note_scoped'] = false;
	if ( isset( $defaults['comment_notes_before'] ) && is_string( $defaults['comment_notes_before'] ) && false !== strpos( $defaults['comment_notes_before'], 'id="email-notes"' ) ) {
		$defaults['comment_notes_before']                  = slateframe_scope_classic_comment_field_html( $defaults['comment_notes_before'] );
		$GLOBALS['slateframe_classic_comment_note_scoped'] = true;
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
		$scoped = slateframe_scope_classic_comment_field_html( $html );
		if ( 'email' === $key && ! empty( $GLOBALS['slateframe_classic_comment_note_scoped'] ) && is_string( $scoped ) ) {
			$processor = new WP_HTML_Tag_Processor( $scoped );
			while ( $processor->next_tag( 'input' ) ) {
				if ( 'slateframe-outer-' . absint( get_the_ID() ) . '-email' === $processor->get_attribute( 'id' ) && ! $processor->get_attribute( 'aria-describedby' ) ) {
					$processor->set_attribute( 'aria-describedby', 'slateframe-outer-' . absint( get_the_ID() ) . '-email-notes' );
				}
			}
			$scoped = $processor->get_updated_html();
		}
		$fields[ $key ] = $scoped;
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
