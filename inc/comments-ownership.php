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
 * Check discussion ownership without treating Query Loop posts as this post.
 *
 * Post Template descendants establish a different post context.
 * Comments inside those descendants must not suppress the current singular
 * post's classic form. Resolve published synced references only in branches
 * which retain the current post context; bound reference depth and cycles.
 *
 * @param array[] $blocks Parsed WordPress blocks.
 * @param int[]   $seen   Shallowest synced reference depth per post ID.
 * @param int     $depth  Synced reference depth.
 * @return bool Whether current-post Core discussion is present.
 */
function slateframe_discussion_in_current_post_blocks( $blocks, &$seen, $depth = 0 ) {
	if ( ! is_array( $blocks ) ) {
		return false;
	}

	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}

		$name = isset( $block['blockName'] ) ? $block['blockName'] : '';
		if ( 'core/post-template' === $name ) {
			continue;
		}
		if ( in_array( $name, array( 'core/comments', 'core/post-comments', 'core/post-comments-form' ), true ) ) {
			return true;
		}
		if ( ! empty( $block['innerBlocks'] ) && slateframe_discussion_in_current_post_blocks( $block['innerBlocks'], $seen, $depth ) ) {
			return true;
		}

		if ( 'core/block' !== $name || $depth >= 8 ) {
			continue;
		}
		$attrs   = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$raw_ref = isset( $attrs['ref'] ) ? $attrs['ref'] : null;
		$ref     = ( is_int( $raw_ref ) || ( is_string( $raw_ref ) && ctype_digit( $raw_ref ) ) ) ? (int) $raw_ref : 0;
		if ( 0 >= $ref || ( is_string( $raw_ref ) && ltrim( $raw_ref, '0' ) !== (string) $ref ) ) {
			continue;
		}
		if ( isset( $seen[ $ref ] ) && $seen[ $ref ] <= $depth ) {
			continue;
		}
		$seen[ $ref ] = $depth;
		$post         = get_post( $ref );
		if ( ! $post instanceof WP_Post || 'wp_block' !== $post->post_type || 'publish' !== $post->post_status || ! is_string( $post->post_content ) ) {
			continue;
		}
		if ( slateframe_discussion_in_current_post_blocks( parse_blocks( $post->post_content ), $seen, $depth + 1 ) ) {
			return true;
		}
	}

	return false;
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

	$blocks    = array( 'core/comments', 'core/post-comments', 'core/post-comments-form' );
	$has_context_boundary = has_block( 'core/query', $post_id ) || has_block( 'core/post-template', $post_id );
	if ( ! $has_context_boundary ) {
		foreach ( $blocks as $block ) {
			if ( has_block( $block, $post_id ) ) {
				return true;
			}
		}
	}

	if ( ! is_singular() || post_password_required() || (int) get_the_ID() !== $post_id ) {
		return false;
	}

	$patterns = slateframe_singular_synced_pattern_contents();
	foreach ( $patterns as $content ) {
		if ( is_string( $content ) && ( has_block( 'core/query', $content ) || has_block( 'core/post-template', $content ) ) ) {
			$has_context_boundary = true;
			break;
		}
	}
	if ( $has_context_boundary ) {
		$post = get_post( $post_id );
		if ( ! $post instanceof WP_Post || ! is_string( $post->post_content ) ) {
			return false;
		}
		$seen = array();
		return slateframe_discussion_in_current_post_blocks( parse_blocks( $post->post_content ), $seen );
	}

	foreach ( $patterns as $content ) {
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
