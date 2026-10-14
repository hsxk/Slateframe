<?php
/**
 * Create isolated Core Gallery browser fixtures from real media attachments.
 *
 * @package Slateframe
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}
( static function ( $args ) {
	$ids = array_map( 'absint', array_slice( $args, 0, 3 ) );
	if ( 3 !== count( $ids ) || min( $ids ) < 1 || 3 !== count( array_unique( $ids ) ) ) {
		throw new RuntimeException( 'Gallery fixture requires three distinct IDs.' );
	}
	foreach ( array_slice( $ids, 0, 2 ) as $id ) {
		if ( 'attachment' !== get_post_type( $id ) || ! wp_attachment_is_image( $id ) ) {
			throw new RuntimeException( 'Gallery fixture requires real image attachments.' );
		}
	}
	$portrait = wp_get_attachment_metadata( $ids[0] );
	$square   = wp_get_attachment_metadata( $ids[1] );
	if ( ! is_array( $portrait ) || ! is_array( $square ) ||
		empty( $portrait['width'] ) || empty( $portrait['height'] ) ||
		empty( $square['width'] ) || empty( $square['height'] ) ||
		(int) $portrait['height'] <= (int) $portrait['width'] ||
		abs( (int) $square['width'] - (int) $square['height'] ) > 2 ) {
		throw new RuntimeException( 'Gallery fixture media orientation mismatch.' );
	}
	$raster = get_post( $ids[2] );
	if ( ! $raster || 'page' !== $raster->post_type || 'publish' !== $raster->post_status ||
		false !== strpos( $raster->post_content, 'browser-native-sequence' ) ) {
		throw new RuntimeException( 'Missing raster page or duplicate native Gallery.' );
	}
	$image = static function ( $id, $lightbox ) {
		$attributes = array(
			'id'              => $id,
			'sizeSlug'        => 'large',
			'linkDestination' => 'none',
		);
		if ( $lightbox ) {
			$attributes['lightbox'] = array( 'enabled' => true );
		}
		$html = wp_get_attachment_image( $id, 'large', false, array( 'class' => 'wp-image-' . $id ) );
		if ( ! $html ) {
			throw new RuntimeException( 'Missing Gallery fixture image.' );
		}
		return '<!-- wp:image ' . wp_json_encode( $attributes ) . ' --><figure class="wp-block-image size-large">' .
			$html . '<figcaption class="wp-element-caption">Portrait / Square — 中文 日本語 العربية</figcaption></figure><!-- /wp:image -->';
	};
	$gallery = static function ( $classes, $image_ids, $lightbox ) use ( $image ) {
		$attributes = array( 'columns' => 2, 'imageCrop' => false );
		if ( $classes ) {
			$attributes['className'] = $classes;
		}
		$html = '<figure class="wp-block-gallery has-nested-images columns-2' .
			( $classes ? ' ' . esc_attr( $classes ) : '' ) . '">';
		foreach ( $image_ids as $id ) {
			$html .= $image( $id, $lightbox );
		}
		return '<!-- wp:gallery ' . wp_json_encode( $attributes ) . ' -->' .
			$html . '</figure><!-- /wp:gallery -->';
	};
	$native = $gallery( 'browser-native-sequence is-style-slateframe-photo-sequence', array( $ids[0], $ids[1] ), true );
	$variants = array(
		'SLATEFRAME_CLASS_ONLY_GALLERY_PATH' => array(
			'Class-only Gallery fixture',
			$gallery( 'browser-class-only-sequence slateframe-gallery-sequence', array( $ids[0], $ids[1] ), false ),
		),
		'SLATEFRAME_PLAIN_GALLERY_PATH' => array(
			'Plain Gallery negative control',
			$gallery( '', array( $ids[1] ), false ),
		),
	);
	$created = array();
	try {
		foreach ( $variants as $key => $variant ) {
			$id = wp_insert_post(
				array( 'post_type' => 'page', 'post_status' => 'publish',
					'post_title' => $variant[0], 'post_content' => $variant[1] ),
				true
			);
			if ( is_wp_error( $id ) || ! $id ) {
				throw new RuntimeException( 'Cannot create ' . $key );
			}
			$created[ $key ] = $id;
		}
		$updated = wp_update_post(
			array( 'ID' => $ids[2], 'post_content' => $raster->post_content . $native ),
			true
		);
		if ( is_wp_error( $updated ) || ! $updated ) {
			throw new RuntimeException( 'Cannot append native Gallery.' );
		}
	} catch ( Throwable $error ) {
		foreach ( $created as $id ) {
			wp_delete_post( $id, true );
		}
		throw $error;
	}
	foreach ( $created as $key => $id ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI GITHUB_ENV assignment, not HTML.
		echo $key . '=/?page_id=' . $id . "\n";
	}
} )( $args );
