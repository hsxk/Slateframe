<?php
/**
 * Preserve WordPress Core ownership of authored discussion blocks.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Detect native discussion in the current post and its published synced patterns.
 *
 * has_block() does not resolve core/block references. A Core Comments block in
 * a published synced pattern renders with the content, so the theme must not
 * append its classic comments template as a second form. Reuse the existing
 * published-only, cycle-safe, depth-bounded pattern resolver. Password-locked
 * content must not suppress the classic fallback based on hidden patterns.
 *
 * @param int $post_id Current singular post ID.
 * @return bool Whether native Core blocks own the discussion.
 */
function slateframe_has_core_discussion_block( $post_id = 0 ) {
	$post_id = absint( $post_id ? $post_id : get_the_ID() );
	if ( ! $post_id ) {
		return false;
	}

	$blocks = array( 'core/comments', 'core/post-comments', 'core/post-comments-form' );
	foreach ( $blocks as $block ) {
		if ( has_block( $block, $post_id ) ) {
			return true;
		}
	}

	if ( ! is_singular() || post_password_required() || (int) get_the_ID() !== $post_id ) {
		return false;
	}

	foreach ( slateframe_singular_synced_pattern_contents() as $content ) {
		if ( ! is_string( $content ) ) {
			continue;
		}
		foreach ( $blocks as $block ) {
			if ( has_block( $block, $content ) ) {
				return true;
			}
		}
	}

	return false;
}
