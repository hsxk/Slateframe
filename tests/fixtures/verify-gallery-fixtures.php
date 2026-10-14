<?php
/**
 * Fail-closed structural and rendered Core Gallery preflight in real WordPress.
 *
 * @package Slateframe
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}
$native_id   = absint( $args[0] ?? 0 );
$portrait_id = absint( $args[1] ?? 0 );
$square_id   = absint( $args[2] ?? 0 );
if ( ! $native_id || ! $portrait_id || ! $square_id ) {
	throw new RuntimeException( 'Gallery preflight: missing fixture IDs.' );
}
$cases = array(
	array( get_post( $native_id ), 'browser-native-sequence', 'is-style-slateframe-photo-sequence', array( $portrait_id, $square_id ), true ),
	array( get_page_by_path( 'class-only-gallery-fixture' ), 'browser-class-only-sequence', 'slateframe-gallery-sequence', array( $portrait_id, $square_id ), false ),
	array( get_page_by_path( 'plain-gallery-negative-control' ), '', '', array( $square_id ), false ),
);
foreach ( $cases as $case ) {
	list( $post, $marker, $style, $ids, $lightbox ) = $case;
	if ( ! $post || 'page' !== $post->post_type || 'publish' !== $post->post_status ) {
		throw new RuntimeException( 'Gallery preflight: unpublished or missing page.' );
	}
	$galleries = array_values(
		array_filter(
			parse_blocks( $post->post_content ),
			static function ( $block ) use ( $marker ) {
				if ( 'core/gallery' !== $block['blockName'] ) {
					return false;
				}
				$classes = preg_split( '/\s+/', trim( $block['attrs']['className'] ?? '' ), -1, PREG_SPLIT_NO_EMPTY );
				return $marker ? in_array( $marker, $classes, true ) : array() === $classes;
			}
		)
	);
	if ( 1 !== count( $galleries ) ) {
		throw new RuntimeException( 'Gallery preflight: incorrect Gallery count.' );
	}
	$gallery = $galleries[0];
	$classes = preg_split( '/\s+/', trim( $gallery['attrs']['className'] ?? '' ), -1, PREG_SPLIT_NO_EMPTY );
	if ( (bool) $style !== in_array( $style, $classes, true ) ||
		2 !== (int) ( $gallery['attrs']['columns'] ?? 0 ) ||
		false !== ( $gallery['attrs']['imageCrop'] ?? null ) ||
		count( $ids ) !== count( $gallery['innerBlocks'] ) ) {
		throw new RuntimeException( 'Gallery preflight: incorrect style, crop, columns or images.' );
	}
	foreach ( $gallery['innerBlocks'] as $index => $image ) {
		$id = (int) ( $image['attrs']['id'] ?? 0 );
		if ( 'core/image' !== $image['blockName'] || $id !== $ids[ $index ] ||
			'large' !== ( $image['attrs']['sizeSlug'] ?? '' ) ||
			'none' !== ( $image['attrs']['linkDestination'] ?? '' ) ||
			$lightbox !== (bool) ( $image['attrs']['lightbox']['enabled'] ?? false ) ||
			! wp_attachment_is_image( $id ) ) {
			throw new RuntimeException( 'Gallery preflight: incorrect Core image or Lightbox attributes.' );
		}
	}
	$html = render_block( $gallery );
	if ( ! is_string( $html ) || ! preg_match_all( '/<img\b[^>]*>/i', $html, $matches ) ||
		count( $ids ) !== count( $matches[0] ) ) {
		throw new RuntimeException( 'Gallery preflight: rendered image count mismatch.' );
	}
	$wrappers = preg_match_all( '/class\s*=\s*["\x27][^"\x27]*\bwp-lightbox-container\b[^"\x27]*["\x27]/i', $html );
	if ( $lightbox ? count( $ids ) !== $wrappers : 0 !== $wrappers ) {
		throw new RuntimeException( 'Gallery preflight: Core Lightbox wrapper mismatch.' );
	}
	foreach ( $matches[0] as $index => $tag ) {
		$id = $ids[ $index ];
		$source = wp_get_attachment_image_src( $id, 'large' );
		if ( ! $source || ! preg_match( '/\ssrc=["\x27]([^"\x27]+)["\x27]/i', $tag, $src ) ||
			esc_url( $source[0] ) !== $src[1] ) {
			throw new RuntimeException( 'Gallery preflight: image source differs from attachment.' );
		}
		foreach ( array( 'srcset', 'sizes', 'alt', 'width', 'height' ) as $attribute ) {
			if ( ! preg_match( '/\s' . $attribute . '=["\x27]([^"\x27]+)["\x27]/i', $tag, $value ) ) {
				throw new RuntimeException( 'Gallery preflight: missing image ' . $attribute );
			}
			if ( 'alt' === $attribute && '' === trim( $value[1] ) ) {
				throw new RuntimeException( 'Gallery preflight: empty alt.' );
			}
			if ( 'srcset' === $attribute && substr_count( $value[1], ',' ) < 1 ) {
				throw new RuntimeException( 'Gallery preflight: insufficient responsive candidates.' );
			}
			if ( 'width' === $attribute && (int) $value[1] !== (int) $source[1] ||
				'height' === $attribute && (int) $value[1] !== (int) $source[2] ) {
				throw new RuntimeException( 'Gallery preflight: image dimensions mismatch.' );
			}
		}
	}
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI diagnostic, not HTML.
	echo 'Verified Core Gallery ' . ( $marker ?: 'plain' ) . "\n";
}
