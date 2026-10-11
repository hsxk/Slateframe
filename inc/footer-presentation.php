<?php
/**
 * Active footer widget presentation discovery.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Read active footer widget content once for form and presentation discovery.
 *
 * Preserve the widget type: raw Classic HTML must not be interpreted as a
 * Gutenberg block tree. Synced Core patterns are resolved only for block
 * widgets and only when their referenced wp_block posts are published.
 *
 * @return array{search_widget:bool,contents:array<int,array{block:bool,content:string}>} Active widget sources.
 */
function slateframe_footer_widget_sources() {
	static $cache = null;

	if ( null !== $cache ) {
		return $cache;
	}

	$cache = array(
		'search_widget' => false,
		'contents'      => array(),
	);
	$sidebars = wp_get_sidebars_widgets();

	if ( ! is_array( $sidebars ) || empty( $sidebars['footer-content'] ) || ! is_array( $sidebars['footer-content'] ) ) {
		return $cache;
	}

	$block_widgets = null;

	foreach ( $sidebars['footer-content'] as $widget_id ) {
		if ( ! is_string( $widget_id ) ) {
			continue;
		}

		if ( preg_match( '/^search-[1-9][0-9]*$/', $widget_id ) ) {
			$cache['search_widget'] = true;
			continue;
		}

		if ( preg_match( '/^block-([1-9][0-9]*)$/', $widget_id, $matches ) ) {
			if ( null === $block_widgets ) {
				$block_widgets = get_option( 'widget_block', array() );
				$block_widgets = is_array( $block_widgets ) ? $block_widgets : array();
			}
			$number  = (int) $matches[1];
			$content = isset( $block_widgets[ $number ]['content'] ) ? $block_widgets[ $number ]['content'] : '';
			if ( ! is_string( $content ) || '' === trim( $content ) ) {
				continue;
			}
			$cache['contents'][] = array(
				'block'   => true,
				'content' => $content,
			);
			if ( has_block( 'core/block', $content ) ) {
				$seen = array();
				foreach ( slateframe_synced_pattern_contents( parse_blocks( $content ), $seen ) as $synced_content ) {
					$cache['contents'][] = array(
						'block'   => true,
						'content' => $synced_content,
					);
				}
			}
		} elseif ( preg_match( '/^(custom_html|text)-([1-9][0-9]*)$/', $widget_id, $matches ) ) {
			$option  = get_option( 'widget_' . $matches[1], array() );
			$number  = (int) $matches[2];
			$field   = 'text' === $matches[1] ? 'text' : 'content';
			$content = is_array( $option ) && isset( $option[ $number ][ $field ] ) ? $option[ $number ][ $field ] : '';
			if ( is_string( $content ) && '' !== trim( $content ) ) {
				$cache['contents'][] = array(
					'block'   => false,
					'content' => $content,
				);
			}
		}
	}

	return $cache;
}

/**
 * Discover contextual presentation in active footer widgets.
 *
 * Footer content is available on archives and search results as well as
 * singular pages. Only active Core Block, Custom HTML, and Text widgets are
 * inspected. Synced patterns are resolved through the same published-only,
 * cycle-safe, eight-reference traversal used by form discovery. This never
 * renders blocks or evaluates shortcodes while enqueueing styles.
 *
 * @return array<string,bool> Photography, content-mode, and Query Loop flags.
 */
function slateframe_footer_presentation_assets() {
	static $cache = null;

	if ( null !== $cache ) {
		return $cache;
	}

	$cache = array(
		'photography'   => false,
		'content_modes' => false,
		'query_loop'    => false,
	);
	$sources = slateframe_footer_widget_sources();

	if ( empty( $sources['contents'] ) ) {
		return $cache;
	}

	$photo_markers   = slateframe_photography_marker_classes();
	$content_markers = slateframe_content_mode_marker_classes();
	$query_markers   = slateframe_query_loop_marker_classes();

	foreach ( $sources['contents'] as $source ) {
		$content = $source['content'];
		if ( ! $cache['photography'] ) {
			$cache['photography'] = is_array( $photo_markers ) &&
				slateframe_content_has_class_marker( $content, $photo_markers, $source['block'] );
			if ( ! $cache['photography'] && $source['block'] && false !== strpos( $content, '"lightbox"' ) ) {
				$cache['photography'] = slateframe_blocks_have_lightbox( parse_blocks( $content ) );
			}
		}
		if ( ! $cache['content_modes'] ) {
			$cache['content_modes'] = is_array( $content_markers ) &&
				slateframe_content_has_class_marker( $content, $content_markers, $source['block'] );
		}
		if ( ! $cache['query_loop'] ) {
			$cache['query_loop'] = is_array( $query_markers ) &&
				slateframe_content_has_class_marker( $content, $query_markers, $source['block'] );
		}
		if ( $cache['photography'] && $cache['content_modes'] && $cache['query_loop'] ) {
			break;
		}
	}

	return $cache;
}