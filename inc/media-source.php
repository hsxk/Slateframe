<?php
/**
 * Core image, audio, and video attachment source guards.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Reject media URL tokens made entirely of invisible Unicode.
 *
 * Decode percent escapes for the decision, without modifying Core's URL.
 *
 * @param mixed $url Media URL token.
 * @return bool Whether the decoded URL has readable characters.
 */
function slateframe_has_readable_media_url( $url ) {
	return is_string( $url ) && slateframe_has_readable_label( rawurldecode( $url ) );
}

/**
 * Require usable browser media URLs after Core has sanitized media markup.
 *
 * KSES may allow mail or FTP handlers in attributes, but images, audio and
 * video require HTTP(S). Preserve site-relative, protocol-relative and
 * multilingual web sources without changing Core's original markup.
 *
 * @param mixed $url Media source URL.
 * @return bool Whether the source is usable for a browser media request.
 */
function slateframe_has_web_media_url( $url ) {
	// Fragment-only URLs resolve to the current HTML document, not a media file.
	if ( ! slateframe_has_readable_media_url( $url ) || '#' === substr( ltrim( $url ), 0, 1 ) ) {
		return false;
	}

	$scheme = wp_parse_url( $url, PHP_URL_SCHEME );
	if ( false === $scheme || ( null !== $scheme && ! in_array( strtolower( $scheme ), array( 'http', 'https' ), true ) ) ) {
		return false;
	}

	return null === $scheme || (bool) wp_parse_url( $url, PHP_URL_HOST );
}

/**
 * Keep only a readable, Core-sanitized attachment recovery URL.
 *
 * @param mixed $url WordPress attachment URL.
 * @return string Safe URL or empty string.
 */
function slateframe_attachment_file_url( $url ) {
	if ( ! slateframe_has_readable_media_url( $url ) ) {
		return '';
	}

	// A file-recovery link must not launch mail, FTP, or custom protocol handlers.
	$safe_url = esc_url_raw( $url, array( 'http', 'https' ) );
	// Core's clean_url filter runs after sanitization; recheck the final URL.
	if ( ! slateframe_has_web_media_url( $safe_url ) ) {
		return '';
	}

	return $safe_url;
}

/**
 * Restore Core's explicit empty decorative alt when a filter removes or hides it.
 *
 * @param WP_HTML_Tag_Processor $processor Current image tag.
 * @return void
 */
function slateframe_normalize_image_alt( $processor ) {
	$alt = $processor->get_attribute( 'alt' );
	if ( ! slateframe_has_readable_label( $alt ) ) {
		$processor->set_attribute( 'alt', '' );
	}
}

/**
 * Check actual image URL candidates, not srcset density descriptors.
 *
 * Filtered Core images can contain Unicode-invisible URLs. A readable "2x"
 * descriptor alone cannot make an invisible candidate URL usable. Preserve
 * valid srcset-only images and CJK/RTL paths.
 *
 * @param mixed $src    HTML Tag Processor src attribute.
 * @param mixed $srcset HTML Tag Processor srcset attribute.
 * @return bool Whether at least one URL candidate is readable.
 */
function slateframe_image_has_source( $src, $srcset ) {
	if ( slateframe_has_web_media_url( $src ) ) {
		return true;
	}

	if ( ! is_string( $srcset ) ) {
		return false;
	}

	// Commas within a URL token (notably data URLs) are not new srcset
	// candidates. Parse URL tokens before density/width descriptors.
	$length = strlen( $srcset );
	$offset = 0;
	while ( $offset < $length ) {
		while ( $offset < $length && ( ',' === $srcset[ $offset ] || ctype_space( $srcset[ $offset ] ) ) ) {
			++$offset;
		}
		$start = $offset;
		while ( $offset < $length && ! ctype_space( $srcset[ $offset ] ) ) {
			++$offset;
		}
		$token = substr( $srcset, $start, $offset - $start );
		if ( '' === $token ) {
			break;
		}
		$trailing_comma = ',' === substr( $token, -1 );
		if ( slateframe_has_web_media_url( rtrim( $token, ',' ) ) ) {
			return true;
		}
		if ( ! $trailing_comma ) {
			while ( $offset < $length && ',' !== $srcset[ $offset ] ) {
				++$offset;
			}
		}
	}

	return false;
}

/**
 * Return a usable Core featured image for a classic listing card.
 *
 * A post may retain a thumbnail ID while an image filter returns empty,
 * non-image, or unplayable markup. Do not leave an empty decorative link in
 * the card. Keep Core's responsive attributes and original image filters.
 *
 * @param int $post_id Current listed post.
 * @return string Sanitized image HTML, or an empty string.
 */
function slateframe_card_thumbnail_markup( $post_id ) {
	if ( ! has_post_thumbnail( $post_id ) ) {
		return '';
	}

	$html = get_the_post_thumbnail(
		$post_id,
		'large',
		array(
			'loading'  => 'lazy',
			'decoding' => 'async',
		)
	);
	if ( ! is_string( $html ) || '' === trim( $html ) ) {
		return '';
	}

	$html = wp_kses_post( $html );

	// This card owns a decorative permalink. Filtered thumbnails must not
	// nest another interactive control inside it. Preserve noninteractive
	// wrappers, responsive image candidates, and Core's original attributes.
	$markup_tags       = new WP_HTML_Tag_Processor( $html );
	$interactive_roles = array(
		'button',
		'checkbox',
		'combobox',
		'link',
		'listbox',
		'menuitem',
		'menuitemcheckbox',
		'menuitemradio',
		'option',
		'radio',
		'scrollbar',
		'searchbox',
		'slider',
		'spinbutton',
		'switch',
		'tab',
		'textbox',
		'treeitem',
	);
	$interactive       = array(
		'A',
		'AREA',
		'AUDIO',
		'BUTTON',
		'DETAILS',
		'EMBED',
		'FORM',
		'IFRAME',
		'INPUT',
		'LABEL',
		'OBJECT',
		'SELECT',
		'SUMMARY',
		'TEXTAREA',
		'VIDEO',
	);
	while ( $markup_tags->next_tag() ) {
		$tabindex = $markup_tags->get_attribute( 'tabindex' );
		$editable = $markup_tags->get_attribute( 'contenteditable' );
		$role     = $markup_tags->get_attribute( 'role' );
		if (
			in_array( $markup_tags->get_tag(), $interactive, true ) ||
			( is_string( $role ) && in_array( strtolower( trim( $role ) ), $interactive_roles, true ) ) ||
			( null !== $tabindex && '-1' !== (string) $tabindex ) ||
			( null !== $editable && 'false' !== strtolower( (string) $editable ) )
		) {
			return '';
		}
	}

	$processor = new WP_HTML_Tag_Processor( $html );
	if ( ! $processor->next_tag( 'img' ) ||
		! slateframe_image_has_source( $processor->get_attribute( 'src' ), $processor->get_attribute( 'srcset' ) ) ) {
		return '';
	}

	slateframe_normalize_image_alt( $processor );
	// Post KSES can strip decoding; restore only fixed, safe Core hints.
	$processor->set_attribute( 'loading', 'lazy' );
	$processor->set_attribute( 'decoding', 'async' );
	return $processor->get_updated_html();
}

/**
 * Sanitize native Core media shortcode markup without stripping <source>.
 *
 * Post KSES allows video/audio but omits the source element that Core emits
 * for playable formats. Extend only this shortcode's allowlist, retaining
 * WordPress's attribute and URL protocol validation.
 *
 * @param mixed $html Core media shortcode output.
 * @return string Sanitized player HTML.
 */
function slateframe_sanitize_media_shortcode( $html ) {
	if ( ! is_string( $html ) ) {
		return '';
	}

	$allowed           = wp_kses_allowed_html( 'post' );
	$allowed['source'] = array(
		'src'   => true,
		'type'  => true,
		'media' => true,
	);

	return wp_kses( $html, $allowed );
}

/**
 * Check that a sanitized Core video/audio player has a usable media source.
 *
 * Shortcode filters may return an empty player shell or Unicode-invisible URL. Preserve Core's direct
 * src and nested source candidates, but never emit a source-less figure or
 * its orphaned caption.
 *
 * @param string $html Sanitized Core shortcode markup.
 * @param string $tag  Expected media element: video or audio.
 * @return bool Whether a usable media source exists.
 */
function slateframe_media_has_source( $html, $tag ) {
	if ( ! is_string( $html ) || ! in_array( $tag, array( 'video', 'audio' ), true ) ) {
		return false;
	}

	$processor = new WP_HTML_Tag_Processor( $html );
	if ( ! $processor->next_tag( $tag ) ) {
		return false;
	}

	$src = $processor->get_attribute( 'src' );
	if ( slateframe_has_web_media_url( $src ) ) {
		return true;
	}

	// Core can render nested <source> candidates instead of a player src.
	// Stop at this player's closing tag: a later sibling's source is not playable.
	while ( $processor->next_tag( array( 'tag_closers' => 'visit' ) ) ) {
		$current_tag = $processor->get_tag();
		if ( strtoupper( $tag ) === $current_tag && $processor->is_tag_closer() ) {
			break;
		}
		if ( 'SOURCE' !== $current_tag || $processor->is_tag_closer() ) {
			continue;
		}
		$src = $processor->get_attribute( 'src' );
		if ( slateframe_has_web_media_url( $src ) ) {
			return true;
		}
	}

	return false;
}
