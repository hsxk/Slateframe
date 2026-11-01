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
	while ( $processor->next_tag( 'source' ) ) {
		$src = $processor->get_attribute( 'src' );
		if ( is_string( $src ) && '' !== trim( $src ) ) {
			return true;
		}
	}

	return false;
}

