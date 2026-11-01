<?php
/**
 * Core audio/video attachment presentation guard.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
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
 * Shortcode filters may return an empty player shell. Preserve Core's direct
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
	if ( is_string( $src ) && '' !== trim( $src ) ) {
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
		if ( is_string( $src ) && '' !== trim( $src ) ) {
			return true;
		}
	}

	return false;
}
