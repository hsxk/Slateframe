<?php
/**
 * Slateframe theme bootstrap.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once get_template_directory() . '/inc/template-tags.php';
require_once get_template_directory() . '/inc/content-discovery.php';
require_once get_template_directory() . '/inc/customizer.php';

/**
 * Register theme supports and navigation locations.
 */
function slateframe_setup() {
	load_theme_textdomain( 'slateframe', get_template_directory() . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'editor-styles' );
	add_editor_style( array( 'style.css', 'assets/css/forms.css', 'assets/css/form-content.css', 'assets/css/reading.css', 'assets/css/photography.css', 'assets/css/content-modes.css', 'assets/css/query-loop.css', 'assets/css/editor.css' ) );

	add_theme_support(
		'html5',
		array(
			'search-form',
			'comment-form',
			'comment-list',
			'gallery',
			'caption',
			'style',
			'script',
		)
	);

	add_theme_support(
		'custom-logo',
		array(
			'height'      => 96,
			'width'       => 96,
			'flex-height' => true,
			'flex-width'  => true,
		)
	);

	register_nav_menus(
		array(
			'primary' => __( 'Primary navigation', 'slateframe' ),
			'footer'  => __( 'Footer navigation', 'slateframe' ),
		)
	);
}
add_action( 'after_setup_theme', 'slateframe_setup' );

/**
 * Register optional block/widget regions.
 *
 * Footer content is deliberately content-owned: sites can compose Core blocks,
 * subscription widgets, project links, or multilingual widgets without the
 * theme hard-coding a footer information architecture.
 */
function slateframe_register_widget_areas() {
	register_sidebar(
		array(
			'name'          => __( 'Footer content', 'slateframe' ),
			'id'            => 'footer-content',
			'description'   => __( 'Optional block or widget content displayed above the footer navigation.', 'slateframe' ),
			'before_widget' => '<div id="%1$s" class="slateframe-footer-widget %2$s">',
			'after_widget'  => '</div>',
			'before_title'  => '<h2 class="slateframe-footer-widget-title">',
			'after_title'   => '</h2>',
		)
	);
}
add_action( 'widgets_init', 'slateframe_register_widget_areas' );

/**
 * Check stored post content for exact CSS class markers.
 *
 * Marker detection is intentionally class-aware instead of substring-based so
 * prose, code samples, or translated copy that mention a marker name do not
 * accidentally load contextual assets.
 *
 * @param string   $content Stored post content.
 * @param string[] $markers Class markers to detect.
 * @return bool
 */
function slateframe_content_has_class_marker( $content, $markers ) {
	if ( '' === trim( (string) $content ) || ! is_array( $markers ) || empty( $markers ) ) {
		return false;
	}

	$processor = new WP_HTML_Tag_Processor( $content );

	while ( $processor->next_tag() ) {
		foreach ( $markers as $marker ) {
			if ( is_string( $marker ) && '' !== $marker && $processor->has_class( $marker ) ) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Determine whether stored content contains an actual HTML form element.
 *
 * @param string $content Stored post content.
 * @return bool
 */
function slateframe_content_has_form( $content ) {
	// Avoid constructing the HTML processor for ordinary text and block markup.
	if ( false === stripos( (string) $content, '<form' ) ) {
		return false;
	}

	$processor = new WP_HTML_Tag_Processor( $content );

	return (bool) $processor->next_tag( array( 'tag_name' => 'FORM' ) );
}

/**
 * Recognize Core's legacy Search block without depending on its widget ID.
 *
 * @param array[] $blocks Parsed blocks, including nested groups.
 * @return bool
 */
function slateframe_blocks_have_legacy_search( $blocks ) {
	foreach ( $blocks as $block ) {
		if (
			'core/legacy-widget' === ( isset( $block['blockName'] ) ? $block['blockName'] : '' ) &&
			'search' === ( isset( $block['attrs']['idBase'] ) ? $block['attrs']['idBase'] : '' )
		) {
			return true;
		}

		if ( ! empty( $block['innerBlocks'] ) && slateframe_blocks_have_legacy_search( $block['innerBlocks'] ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Collect published Core synced-pattern content without rendering blocks.
 *
 * Only core/block references are followed. Ordinary Group/Columns nesting
 * does not consume the eight-reference depth budget. Track the shallowest depth
 * across sibling branches so a repeated reference is fetched only when a
 * shorter path can reveal descendants beyond the original depth budget.
 *
 * @param array[] $blocks Parsed blocks, including nested containers.
 * @param int[]   $seen   Shallowest reference depth per ID, by reference.
 * @param int     $depth Current synced-reference depth.
 * @return string[] Published pattern contents in discovery order.
 */
function slateframe_synced_pattern_contents( $blocks, &$seen, $depth = 0 ) {
	$contents = array();

	if ( ! is_array( $blocks ) || $depth >= 8 ) {
		return $contents;
	}

	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}

		if ( ! empty( $block['innerBlocks'] ) ) {
			$contents = array_merge( $contents, slateframe_synced_pattern_contents( $block['innerBlocks'], $seen, $depth ) );
		}

		if ( 'core/block' !== ( isset( $block['blockName'] ) ? $block['blockName'] : '' ) ) {
			continue;
		}

		$raw_ref = isset( $block['attrs']['ref'] ) ? $block['attrs']['ref'] : null;
		$ref     = ( is_int( $raw_ref ) || ( is_string( $raw_ref ) && ctype_digit( $raw_ref ) ) ) ? (int) $raw_ref : 0;
		if ( $ref <= 0 || ( isset( $seen[ $ref ] ) && $seen[ $ref ] <= $depth ) ) {
			continue;
		}

		$seen[ $ref ] = $depth;
		$post         = get_post( $ref );
		if ( ! $post instanceof WP_Post || 'wp_block' !== $post->post_type || 'publish' !== $post->post_status ) {
			continue;
		}

		$contents[] = $post->post_content;
		if ( has_block( 'core/block', $post->post_content ) ) {
			$contents = array_merge(
				$contents,
				slateframe_synced_pattern_contents( parse_blocks( $post->post_content ), $seen, $depth + 1 )
			);
		}
	}

	return $contents;
}

/**
 * Derive form stylesheet flags from resolved published pattern content.
 *
 * @param string[] $contents Published pattern contents.
 * @return array<string,bool> Required form stylesheet flags.
 */
function slateframe_pattern_form_assets( $contents ) {
	$needed = array(
		'forms'        => false,
		'search_form'  => false,
		'form_content' => false,
	);

	foreach ( $contents as $content ) {
		if ( has_block( 'core/search', $content ) ) {
			$needed['forms'] = true;
		}
		if (
			has_block( 'core/legacy-widget', $content ) &&
			slateframe_blocks_have_legacy_search( parse_blocks( $content ) )
		) {
			$needed['forms']       = true;
			$needed['search_form'] = true;
		}
		if ( slateframe_content_has_form( $content ) ) {
			$needed['forms']        = true;
			$needed['form_content'] = true;
		}
	}

	return $needed;
}

/**
 * Discover form assets in published Core synced patterns.
 *
 * @param array[] $blocks Parsed blocks containing Core pattern references.
 * @param bool[]  $seen   Already visited pattern IDs.
 * @param int     $depth Current synced-reference depth.
 * @return array<string,bool> Required form stylesheet flags.
 */
function slateframe_synced_form_assets( $blocks, $seen = array(), $depth = 0 ) {
	return slateframe_pattern_form_assets( slateframe_synced_pattern_contents( $blocks, $seen, $depth ) );
}

/**
 * Resolve patterns in the current singular post once per request.
 *
 * Shared by form, Photography, Portfolio, Knowledge, and Query Loop asset
 * detection. Does not render arbitrary blocks or execute shortcodes.
 *
 * @return string[] Published synced-pattern content.
 */
function slateframe_singular_synced_pattern_contents() {
	static $cache = array();

	if ( ! is_singular() ) {
		return array();
	}

	$post = get_post();
	if ( ! $post instanceof WP_Post || ! has_block( 'core/block', $post->post_content ) ) {
		return array();
	}

	$key = (int) $post->ID . ':' . md5( $post->post_content );
	if ( ! isset( $cache[ $key ] ) ) {
		$seen          = array();
		$cache[ $key ] = slateframe_synced_pattern_contents( parse_blocks( $post->post_content ), $seen );
	}

	return $cache[ $key ];
}

/**
 * Discover forms in active Core/classic footer widgets before assets enqueue.
 *
 * The footer is content-owned, so checking only the current post misses Core
 * Search blocks and classic Search widgets inserted through Appearance >
 * Widgets. Inactive widgets must not load any CSS. Dynamic third-party forms
 * may opt in through the existing stylesheet filters.
 *
 * @return array<string,bool> Flags for forms, the theme search form, and form states.
 */
function slateframe_footer_form_assets() {
	static $cache = null;

	if ( null !== $cache ) {
		return $cache;
	}

	$needed   = array(
		'forms'        => false,
		'search_form'  => false,
		'form_content' => false,
	);
	$sidebars = wp_get_sidebars_widgets();

	if ( ! is_array( $sidebars ) || empty( $sidebars['footer-content'] ) || ! is_array( $sidebars['footer-content'] ) ) {
		$cache = $needed;
		return $cache;
	}

	$block_widgets = get_option( 'widget_block', array() );
	$block_widgets = is_array( $block_widgets ) ? $block_widgets : array();

	foreach ( $sidebars['footer-content'] as $widget_id ) {
		if ( ! is_string( $widget_id ) ) {
			continue;
		}

		if ( preg_match( '/^search-[1-9][0-9]*$/', $widget_id ) ) {
			$needed['forms']       = true;
			$needed['search_form'] = true;
			continue;
		}

		if ( preg_match( '/^block-([1-9][0-9]*)$/', $widget_id, $matches ) ) {
			$number  = (int) $matches[1];
			$content = isset( $block_widgets[ $number ]['content'] ) ? $block_widgets[ $number ]['content'] : '';

			if ( ! is_string( $content ) || '' === trim( $content ) ) {
				continue;
			}

			if ( has_block( 'core/search', $content ) ) {
				$needed['forms'] = true;
			}

			if (
				has_block( 'core/legacy-widget', $content ) &&
				slateframe_blocks_have_legacy_search( parse_blocks( $content ) )
			) {
				$needed['forms']       = true;
				$needed['search_form'] = true;
			}

			// Core synced patterns store their actual markup in separate wp_block posts.
			if ( has_block( 'core/block', $content ) ) {
				$synced = slateframe_synced_form_assets( parse_blocks( $content ) );
				foreach ( $needed as $key => $value ) {
					$needed[ $key ] = $value || $synced[ $key ];
				}
			}
		} elseif ( preg_match( '/^(custom_html|text)-([1-9][0-9]*)$/', $widget_id, $matches ) ) {
			$option  = get_option( 'widget_' . $matches[1], array() );
			$number  = (int) $matches[2];
			$field   = 'text' === $matches[1] ? 'text' : 'content';
			$content = is_array( $option ) && isset( $option[ $number ][ $field ] ) ? $option[ $number ][ $field ] : '';
		} else {
			continue;
		}

		if ( is_string( $content ) && slateframe_content_has_form( $content ) ) {
			$needed['forms']        = true;
			$needed['form_content'] = true;
		}
	}

	$cache = $needed;
	return $cache;
}

/**
 * Discover synced-pattern forms referenced by the current singular post.
 *
 * @return array<string,bool> Required form stylesheet flags.
 */
function slateframe_singular_synced_form_assets() {
	static $cache = array();

	if ( ! is_singular() ) {
		return slateframe_pattern_form_assets( array() );
	}

	$post = get_post();
	if ( ! $post instanceof WP_Post ) {
		return slateframe_pattern_form_assets( array() );
	}

	$key = (int) $post->ID . ':' . md5( $post->post_content );
	if ( ! isset( $cache[ $key ] ) ) {
		$cache[ $key ] = slateframe_pattern_form_assets( slateframe_singular_synced_pattern_contents() );
	}

	return $cache[ $key ];
}

/**
 * Determine whether the current request renders Slateframe's theme search form.
 *
 * @return bool
 */
function slateframe_search_form_styles_needed() {
	$footer = slateframe_footer_form_assets();
	$needed = is_search() || is_404() || $footer['search_form'] || slateframe_singular_synced_form_assets()['search_form'];

	global $wp_query;

	if (
		! $needed &&
		( is_home() || is_archive() || is_author() ) &&
		isset( $wp_query ) &&
		0 === (int) $wp_query->post_count
	) {
		$needed = true;
	}

	return $needed;
}

/**
 * Determine whether the current request needs the shared form-control layer.
 *
 * Search, recovery, empty-state, comments, Core Search, and author-owned forms
 * all use the same geometry without making form CSS a global request cost.
 *
 * @return bool
 */
function slateframe_forms_styles_needed() {
	$footer = slateframe_footer_form_assets();
	$needed = slateframe_search_form_styles_needed() || $footer['forms'] || slateframe_singular_synced_form_assets()['forms'];

	if ( ! $needed && is_singular() ) {
		$needed = comments_open() || (bool) get_comments_number();
		$post   = get_post();

		if ( ! $needed && $post instanceof WP_Post ) {
			$needed = has_block( 'core/search', $post ) || slateframe_content_has_form( $post->post_content );
		}
	}

	/**
	 * Filters whether Slateframe's shared form-control stylesheet is needed.
	 *
	 * Integrations that render forms outside post content may opt in without
	 * coupling the theme to a plugin, widget ID, locale, or URL structure.
	 *
	 * @param bool $needed Whether the form-control layer is needed.
	 */
	return (bool) apply_filters( 'slateframe_forms_styles_needed', $needed );
}

/**
 * Determine whether authored content needs the richer form-state layer.
 *
 * @return bool
 */
function slateframe_form_content_styles_needed() {
	$footer = slateframe_footer_form_assets();
	$needed = $footer['form_content'] || slateframe_singular_synced_form_assets()['form_content'];

	if ( is_singular() ) {
		$post = get_post();

		if ( $post instanceof WP_Post ) {
			$needed = $needed || slateframe_content_has_form( $post->post_content );
		}
	}

	/**
	 * Filters whether Slateframe's authored form-state stylesheet is needed.
	 *
	 * @param bool $needed Whether readonly, invalid, grouping, and help states are needed.
	 */
	return (bool) apply_filters( 'slateframe_form_content_styles_needed', $needed );
}

/**
 * Determine whether a parsed block tree enables WordPress Core's native lightbox.
 *
 * @param array[] $blocks Parsed blocks.
 * @return bool
 */
function slateframe_blocks_have_lightbox( $blocks ) {
	foreach ( $blocks as $block ) {
		$block_name = isset( $block['blockName'] ) ? $block['blockName'] : '';

		if (
			in_array( $block_name, array( 'core/image', 'core/gallery' ), true ) &&
			! empty( $block['attrs']['lightbox']['enabled'] )
		) {
			return true;
		}

		if ( ! empty( $block['innerBlocks'] ) && slateframe_blocks_have_lightbox( $block['innerBlocks'] ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Determine whether the current singular document needs Photography styles.
 *
 * New integrations should use the narrow Photography filter. Markers added
 * through the older broad content-mode filter are also honored so documented
 * extension callbacks keep their pre-split behavior.
 *
 * @return bool
 */
function slateframe_photography_styles_needed() {
	if ( ! is_singular() ) {
		return false;
	}

	$post = get_post();

	if ( ! $post instanceof WP_Post ) {
		return false;
	}

	$markers = array(
		'is-style-slateframe-contact-sheet',
		'is-style-slateframe-diptych',
		'is-style-slateframe-photo-feature',
		'is-style-slateframe-photo-sequence',
		'slateframe-photography-sequence',
	);

	$legacy_markers = apply_filters( 'slateframe_content_mode_markers', array() );

	if ( is_array( $legacy_markers ) ) {
		$markers = array_merge( $markers, $legacy_markers );
	}

	/**
	 * Filters class markers that opt a document into Slateframe Photography presentation.
	 *
	 * @param string[] $markers Photography presentation markers.
	 */
	$markers = apply_filters( 'slateframe_photography_markers', $markers );

	$contents = array_merge( array( $post->post_content ), slateframe_singular_synced_pattern_contents() );
	foreach ( $contents as $content ) {
		if ( is_array( $markers ) && slateframe_content_has_class_marker( $content, array_unique( $markers ) ) ) {
			return true;
		}
		if ( slateframe_blocks_have_lightbox( parse_blocks( $content ) ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Determine whether the current singular document needs Portfolio/Knowledge styles.
 *
 * @return bool
 */
function slateframe_content_modes_needed() {
	if ( ! is_singular() ) {
		return false;
	}

	$post = get_post();

	if ( ! $post instanceof WP_Post ) {
		return false;
	}

	$markers = array(
		'is-style-slateframe-project-feature',
		'is-style-slateframe-learning-path',
		'slateframe-project-grid',
		'slateframe-knowledge-checklist',
		'is-style-slateframe-steps',
		'is-style-slateframe-checklist',
		'is-style-slateframe-key-facts',
		'is-style-slateframe-learning-callout',
		'is-style-slateframe-definition',
		'is-style-slateframe-metrics',
		'is-style-slateframe-ledger',
		'is-style-slateframe-project-brief',
	);

	/**
	 * Filters the content markers that trigger Slateframe's shared contextual styles.
	 *
	 * Integrations may append site-neutral markers for content that reuses the
	 * theme's Portfolio or Knowledge presentation layer.
	 *
	 * @param string[] $markers Content markers to scan for.
	 */
	$markers = apply_filters( 'slateframe_content_mode_markers', $markers );

	if ( ! is_array( $markers ) ) {
		return false;
	}

	foreach ( array_merge( array( $post->post_content ), slateframe_singular_synced_pattern_contents() ) as $content ) {
		if ( slateframe_content_has_class_marker( $content, $markers ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Determine whether the current document contains Slateframe's native Query Loop grid.
 *
 * @return bool
 */
function slateframe_query_loop_styles_needed() {
	if ( ! is_singular() ) {
		return false;
	}

	$post = get_post();

	if ( ! $post instanceof WP_Post ) {
		return false;
	}

	/**
	 * Filters class markers that opt a document into Slateframe Query Loop presentation.
	 *
	 * Integrations may append portable markers without coupling the theme to a post
	 * type, taxonomy, page ID, slug, or multilingual URL structure.
	 *
	 * @param string[] $markers Query Loop presentation markers.
	 */
	$markers = apply_filters( 'slateframe_query_loop_markers', array( 'slateframe-project-grid' ) );

	foreach ( array_merge( array( $post->post_content ), slateframe_singular_synced_pattern_contents() ) as $content ) {
		if ( slateframe_content_has_class_marker( $content, $markers ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Enqueue the intentionally small frontend asset layer.
 */
function slateframe_assets() {
	$version              = wp_get_theme()->get( 'Version' );
	$photography_needed   = slateframe_photography_styles_needed();
	$content_modes_needed = slateframe_content_modes_needed();
	$query_loop_needed    = slateframe_query_loop_styles_needed();
	$forms_needed         = slateframe_forms_styles_needed();
	$form_content_needed  = slateframe_form_content_styles_needed();
	$search_form_needed   = slateframe_search_form_styles_needed();

	wp_enqueue_style( 'slateframe-style', get_stylesheet_uri(), array(), $version );
	wp_enqueue_style(
		'slateframe-navigation',
		get_template_directory_uri() . '/assets/css/navigation.css',
		array( 'slateframe-style' ),
		$version
	);
	wp_enqueue_style(
		'slateframe-footer',
		get_template_directory_uri() . '/assets/css/footer.css',
		array( 'slateframe-style' ),
		$version
	);

	if ( $forms_needed ) {
		wp_enqueue_style(
			'slateframe-forms',
			get_template_directory_uri() . '/assets/css/forms.css',
			array( 'slateframe-style' ),
			$version
		);
	}

	if ( $search_form_needed ) {
		wp_enqueue_style(
			'slateframe-search-form',
			get_template_directory_uri() . '/assets/css/search-form.css',
			array( 'slateframe-forms' ),
			$version
		);
	}

	if ( is_singular() ) {
		wp_enqueue_style(
			'slateframe-reading',
			get_template_directory_uri() . '/assets/css/reading.css',
			array( 'slateframe-style' ),
			$version
		);
	}

	global $wp_query;
	$empty_state_needed = ( is_home() || is_archive() || is_search() ) && isset( $wp_query ) && 0 === (int) $wp_query->post_count;

	if ( $empty_state_needed ) {
		wp_enqueue_style(
			'slateframe-empty-state',
			get_template_directory_uri() . '/assets/css/empty-state.css',
			array( 'slateframe-style' ),
			$version
		);
	}

	if ( is_singular() || is_author() || is_404() ) {
		$publishing_dependencies = is_singular() ? array( 'slateframe-reading' ) : array( 'slateframe-style' );

		wp_enqueue_style(
			'slateframe-publishing',
			get_template_directory_uri() . '/assets/css/publishing.css',
			$publishing_dependencies,
			$version
		);
	}

	if ( $form_content_needed ) {
		wp_enqueue_style(
			'slateframe-form-content',
			get_template_directory_uri() . '/assets/css/form-content.css',
			array( 'slateframe-forms' ),
			$version
		);
	}

	if ( $photography_needed ) {
		wp_enqueue_style(
			'slateframe-photography',
			get_template_directory_uri() . '/assets/css/photography.css',
			array( 'slateframe-reading' ),
			$version
		);
	}

	if ( $content_modes_needed || $query_loop_needed ) {
		wp_enqueue_style(
			'slateframe-content-modes',
			get_template_directory_uri() . '/assets/css/content-modes.css',
			array( 'slateframe-reading' ),
			$version
		);
	}

	if ( $query_loop_needed ) {
		wp_enqueue_style(
			'slateframe-query-loop',
			get_template_directory_uri() . '/assets/css/query-loop.css',
			array( 'slateframe-content-modes' ),
			$version
		);
	}

	if ( is_singular() && ( comments_open() || get_comments_number() ) ) {
		wp_enqueue_style(
			'slateframe-comments',
			get_template_directory_uri() . '/assets/css/comments.css',
			array( 'slateframe-reading', 'slateframe-forms' ),
			$version
		);
	}

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}

	if ( is_rtl() ) {
		wp_enqueue_style(
			'slateframe-rtl',
			get_template_directory_uri() . '/rtl.css',
			array( 'slateframe-style' ),
			$version
		);
	}

	wp_enqueue_script(
		'slateframe-theme',
		get_template_directory_uri() . '/assets/js/theme.js',
		array(),
		$version,
		array(
			'in_footer' => true,
			'strategy'  => 'defer',
		)
	);
}
add_action( 'wp_enqueue_scripts', 'slateframe_assets' );

/**
 * Keep potentially scrollable Core table blocks reachable from the keyboard.
 *
 * The wrapper owns horizontal overflow at narrow widths and text zoom, so it
 * needs a focus stop even when the table happens to fit at the current width.
 * Preserve an author-supplied tabindex when one is present.
 *
 * @param string $block_content Rendered Core table block markup.
 * @return string
 */
function slateframe_focusable_table_block( $block_content ) {
	if ( '' === $block_content ) {
		return $block_content;
	}

	$processor = new WP_HTML_Tag_Processor( $block_content );

	while ( $processor->next_tag() ) {
		if ( ! $processor->has_class( 'wp-block-table' ) ) {
			continue;
		}

		if ( null === $processor->get_attribute( 'tabindex' ) ) {
			$processor->set_attribute( 'tabindex', '0' );
		}

		break;
	}

	return $processor->get_updated_html();
}
add_filter( 'render_block_core/table', 'slateframe_focusable_table_block' );

/**
 * Keep direct TablePress output reachable when the table itself becomes the
 * horizontal scroll owner inside Slateframe's reading measure.
 *
 * TablePress shortcodes are expanded before this priority. The fast string
 * guard avoids parsing ordinary content and the theme does not depend on the
 * plugin being installed.
 *
 * @param string $content Rendered post content.
 * @return string
 */
function slateframe_focusable_tablepress_tables( $content ) {
	if ( false === strpos( $content, 'tablepress' ) ) {
		return $content;
	}

	$processor = new WP_HTML_Tag_Processor( $content );

	while ( $processor->next_tag( 'table' ) ) {
		if ( ! $processor->has_class( 'tablepress' ) ) {
			continue;
		}

		if ( null === $processor->get_attribute( 'tabindex' ) ) {
			$processor->set_attribute( 'tabindex', '0' );
		}
	}

	return $processor->get_updated_html();
}
add_filter( 'the_content', 'slateframe_focusable_tablepress_tables', 20 );

/**
 * Render only the custom-logo image inside Slateframe's own brand link.
 *
 * Core get_custom_logo() includes its own anchor. Rendering the attachment
 * directly avoids invalid nested links in the header.
 */
function slateframe_brand_mark() {
	$logo_id = (int) get_theme_mod( 'custom_logo' );

	if ( ! $logo_id ) {
		return;
	}

	echo wp_kses_post(
		wp_get_attachment_image(
			$logo_id,
			'full',
			false,
			array(
				'class'       => 'slateframe-brand-logo',
				'alt'         => '',
				'aria-hidden' => 'true',
				'loading'     => 'eager',
				'decoding'    => 'async',
			)
		)
	);
}

/**
 * Render an optional language selector supplied by an integration plugin.
 *
 * Core remains language-agnostic: no locale list, URL pattern, or plugin is
 * assumed here.
 */
function slateframe_language_switcher() {
	$html = apply_filters( 'slateframe_language_switcher_html', '' );

	if ( ! $html ) {
		return;
	}

	echo '<div class="slateframe-language-slot">';
	echo wp_kses_post( $html );
	echo '</div>';
}

/**
 * Register reusable editorial block styles.
 */
function slateframe_register_block_styles() {
	$styles = array(
		array( 'core/quote', 'slateframe-note', __( 'Editorial note', 'slateframe' ) ),
		array( 'core/paragraph', 'slateframe-lead', __( 'Editorial lead', 'slateframe' ) ),
		array( 'core/group', 'slateframe-project-feature', __( 'Project feature', 'slateframe' ) ),
		array( 'core/group', 'slateframe-learning-path', __( 'Learning path', 'slateframe' ) ),
		array( 'core/image', 'slateframe-frame', __( 'Editorial frame', 'slateframe' ) ),
		array( 'core/gallery', 'slateframe-photo-sequence', __( 'Photo sequence', 'slateframe' ) ),
		array( 'core/table', 'slateframe-data', __( 'Data table', 'slateframe' ) ),
		array( 'core/details', 'slateframe-disclosure', __( 'Editorial disclosure', 'slateframe' ) ),
		array( 'core/gallery', 'slateframe-contact-sheet', __( 'Contact sheet', 'slateframe' ) ),
		array( 'core/gallery', 'slateframe-diptych', __( 'Photography diptych', 'slateframe' ) ),
		array( 'core/image', 'slateframe-photo-feature', __( 'Photography feature', 'slateframe' ) ),
		array( 'core/list', 'slateframe-steps', __( 'Numbered steps', 'slateframe' ) ),
		array( 'core/list', 'slateframe-checklist', __( 'Editorial checklist', 'slateframe' ) ),
		array( 'core/group', 'slateframe-key-facts', __( 'Key facts', 'slateframe' ) ),
		array( 'core/group', 'slateframe-project-brief', __( 'Project brief', 'slateframe' ) ),
		array( 'core/group', 'slateframe-learning-callout', __( 'Learning callout', 'slateframe' ) ),
		array( 'core/group', 'slateframe-definition', __( 'Definition', 'slateframe' ) ),
		array( 'core/columns', 'slateframe-metrics', __( 'Project metrics', 'slateframe' ) ),
		array( 'core/columns', 'slateframe-ledger', __( 'Editorial ledger', 'slateframe' ) ),
	);

	foreach ( $styles as $style ) {
		register_block_style(
			$style[0],
			array(
				'name'  => $style[1],
				'label' => $style[2],
			)
		);
	}
}
add_action( 'init', 'slateframe_register_block_styles' );

/**
 * Register Slateframe's pattern category.
 */
function slateframe_pattern_category() {
	$categories = array(
		'slateframe'             => __( 'Slateframe', 'slateframe' ),
		'slateframe-photography' => __( 'Slateframe: Photography', 'slateframe' ),
		'slateframe-portfolio'   => __( 'Slateframe: Portfolio', 'slateframe' ),
		'slateframe-knowledge'   => __( 'Slateframe: Knowledge', 'slateframe' ),
	);

	foreach ( $categories as $slug => $label ) {
		register_block_pattern_category(
			$slug,
			array(
				'label' => $label,
			)
		);
	}
}
add_action( 'init', 'slateframe_pattern_category' );
