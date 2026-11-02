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
 * Keep only a readable, Core-sanitized attachment recovery URL.
 *
 * @param mixed $url WordPress attachment URL.
 * @return string Safe URL or empty string.
 */
function slateframe_attachment_file_url( $url ) {
	if ( ! slateframe_has_readable_media_url( $url ) ) {
		return '';
	}

	$safe_url = esc_url_raw( $url );
	return is_string( $safe_url ) && slateframe_has_readable_media_url( $safe_url ) ? $safe_url : '';
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
	if ( slateframe_has_readable_media_url( $src ) ) {
		return true;
	}

	if ( ! is_string( $srcset ) ) {
		return false;
	}

	foreach ( explode( ',', $srcset ) as $candidate ) {
		$candidate = trim( $candidate );
		if ( '' === $candidate ) {
			continue;
		}

		// Ignore density/width descriptors: only the first token is a URL.
		$parts = preg_split( '/\s+/u', $candidate, 2 );
		if ( is_array( $parts ) && slateframe_has_readable_media_url( $parts[0] ) ) {
			return true;
		}
	}

	return false;
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
	if ( slateframe_has_readable_media_url( $src ) ) {
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
		if ( slateframe_has_readable_media_url( $src ) ) {
			return true;
		}
	}

	return false;
}
