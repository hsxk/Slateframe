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
require_once get_template_directory() . '/inc/footer-presentation.php';
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
	add_editor_style( array( 'style.css', 'assets/css/footer.css', 'assets/css/core-buttons.css', 'assets/css/core-query-pagination.css', 'assets/css/core-navigation.css', 'assets/css/core-post-navigation.css', 'assets/css/core-video.css', 'assets/css/core-audio.css', 'assets/css/core-embed.css', 'assets/css/core-latest-posts.css', 'assets/css/core-latest-comments.css', 'assets/css/core-categories.css', 'assets/css/core-archives.css', 'assets/css/core-tag-cloud.css', 'assets/css/core-page-list.css', 'assets/css/core-post-terms.css', 'assets/css/core-post-comments-link.css', 'assets/css/core-comments-title.css', 'assets/css/core-post-comments-count.css', 'assets/css/core-query-no-results.css', 'assets/css/core-post-comments-form.css', 'assets/css/core-file.css', 'assets/css/core-loginout.css', 'assets/css/core-post-date.css', 'assets/css/core-post-author-name.css', 'assets/css/core-post-author-biography.css', 'assets/css/core-avatar.css', 'assets/css/core-image.css', 'assets/css/core-site-logo.css', 'assets/css/core-site-title.css', 'assets/css/core-site-tagline.css', 'assets/css/core-columns.css', 'assets/css/core-group.css', 'assets/css/core-details.css', 'assets/css/core-separator.css', 'assets/css/core-quote.css', 'assets/css/core-pullquote.css', 'assets/css/core-post-excerpt.css', 'assets/css/core-read-more.css', 'assets/css/core-post-title.css', 'assets/css/core-post-featured-image.css', 'assets/css/forms.css', 'assets/css/form-content.css', 'assets/css/reading.css', 'assets/css/photography.css', 'assets/css/content-modes.css', 'assets/css/query-loop.css', 'assets/css/editor.css' ) );

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
 * Load Core Button enhancements only for rendered native Button blocks.
 *
 * Keep the universal runtime below its existing strict CSS budgets while
 * letting WordPress enqueue the small block stylesheet in content, synced
 * patterns, and block widget areas. The editor also receives this stylesheet
 * through add_editor_style() for consistent appearance.
 */
function slateframe_register_core_button_styles() {
	wp_enqueue_block_style(
		'core/button',
		array(
			'handle' => 'slateframe-core-buttons',
			'src'    => get_template_directory_uri() . '/assets/css/core-buttons.css',
			'path'   => get_template_directory() . '/assets/css/core-buttons.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_button_styles', 20 );

/**
 * Enqueue Core Query Pagination refinements only where WordPress renders it.
 *
 * The base theme already provides 44px targets. Keep active-page and
 * multilingual refinements out of the universal stylesheet and preserve
 * Gutenberg parity through add_editor_style().
 */
function slateframe_register_core_query_pagination_styles() {
	wp_enqueue_block_style(
		'core/query-pagination',
		array(
			'handle' => 'slateframe-core-query-pagination',
			'src'    => get_template_directory_uri() . '/assets/css/core-query-pagination.css',
			'path'   => get_template_directory() . '/assets/css/core-query-pagination.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_query_pagination_styles', 20 );

/**
 * Give authored Core Navigation links and overlays bounded touch targets.
 *
 * Keep WordPress in charge of menu structure and interactivity, and avoid
 * loading the stylesheet on pages without a native Navigation block.
 */
function slateframe_register_core_navigation_styles() {
	wp_enqueue_block_style(
		'core/navigation',
		array(
			'handle' => 'slateframe-core-navigation',
			'src'    => get_template_directory_uri() . '/assets/css/core-navigation.css',
			'path'   => get_template_directory() . '/assets/css/core-navigation.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_navigation_styles', 20 );

/**
 * Keep authored Core Previous/Next Post links readable and touch accessible.
 *
 * WordPress retains ownership of adjacent-post resolution and link markup.
 * Register only a presentation stylesheet, loaded with the rendered block.
 */
function slateframe_register_core_post_navigation_styles() {
	wp_enqueue_block_style(
		'core/post-navigation-link',
		array(
			'handle' => 'slateframe-core-post-navigation',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-navigation.css',
			'path'   => get_template_directory() . '/assets/css/core-post-navigation.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_navigation_styles', 20 );

/**
 * Keep native Core Video and Audio media within the authored content column.
 *
 * These tiny presentation-only assets load only for their respective blocks.
 * Playback, tracks, captions and media URLs remain owned by WordPress/Core.
 */
function slateframe_register_core_av_styles() {
	foreach ( array( 'video', 'audio' ) as $block ) {
		wp_enqueue_block_style(
			'core/' . $block,
			array(
				'handle' => 'slateframe-core-' . $block,
				'src'    => get_template_directory_uri() . '/assets/css/core-' . $block . '.css',
				'path'   => get_template_directory() . '/assets/css/core-' . $block . '.css',
				'ver'    => wp_get_theme()->get( 'Version' ),
			)
		);
	}
}
add_action( 'init', 'slateframe_register_core_av_styles', 20 );





/**
 * Bound native Core Embed media and multilingual captions.
 *
 * WordPress Core owns provider resolution, iframe markup and playback.
 */
function slateframe_register_core_embed_styles() {
	wp_enqueue_block_style(
		'core/embed',
		array(
			'handle' => 'slateframe-core-embed',
			'src'    => get_template_directory_uri() . '/assets/css/core-embed.css',
			'path'   => get_template_directory() . '/assets/css/core-embed.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_embed_styles', 20 );

/**
 * Keep native Latest Posts list/grid links and metadata inside their column.
 *
 * Core owns the post query, categories, dates, excerpts and layout selection.
 */
function slateframe_register_core_latest_posts_styles() {
	wp_enqueue_block_style(
		'core/latest-posts',
		array(
			'handle' => 'slateframe-core-latest-posts',
			'src'    => get_template_directory_uri() . '/assets/css/core-latest-posts.css',
			'path'   => get_template_directory() . '/assets/css/core-latest-posts.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_latest_posts_styles', 20 );

/**
 * Keep native Latest Comments metadata and excerpts readable in every locale.
 *
 * WordPress remains responsible for comment queries, approval, and markup.
 */
function slateframe_register_core_latest_comments_styles() {
	wp_enqueue_block_style(
		'core/latest-comments',
		array(
			'handle' => 'slateframe-core-latest-comments',
			'src'    => get_template_directory_uri() . '/assets/css/core-latest-comments.css',
			'path'   => get_template_directory() . '/assets/css/core-latest-comments.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_latest_comments_styles', 20 );


/**
 * Bound native Core Categories lists, hierarchy and dropdown controls.
 * Core owns taxonomy queries, counts, archive URLs and select navigation.
 */
function slateframe_register_core_categories_styles() {
	wp_enqueue_block_style(
		'core/categories',
		array(
			'handle' => 'slateframe-core-categories',
			'src'    => get_template_directory_uri() . '/assets/css/core-categories.css',
			'path'   => get_template_directory() . '/assets/css/core-categories.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_categories_styles', 20 );

/**
 * Keep native Core Archives month links and dropdown controls bounded.
 * Core owns dates, queries, counts, URLs and native select navigation.
 */
function slateframe_register_core_archives_styles() {
	wp_enqueue_block_style(
		'core/archives',
		array(
			'handle' => 'slateframe-core-archives',
			'src'    => get_template_directory_uri() . '/assets/css/core-archives.css',
			'path'   => get_template_directory() . '/assets/css/core-archives.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_archives_styles', 20 );

/**
 * Keep native Core Tag Cloud term links and count-based sizes accessible.
 * WordPress owns term queries, weights, counts, URLs and markup.
 */
function slateframe_register_core_tag_cloud_styles() {
	wp_enqueue_block_style(
		'core/tag-cloud',
		array(
			'handle' => 'slateframe-core-tag-cloud',
			'src'    => get_template_directory_uri() . '/assets/css/core-tag-cloud.css',
			'path'   => get_template_directory() . '/assets/css/core-tag-cloud.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_tag_cloud_styles', 20 );


/**
 * Keep native Core Page List hierarchies readable and touch accessible.
 *
 * WordPress owns published-page queries, parent/child links and navigation.
 */
function slateframe_register_core_page_list_styles() {
	wp_enqueue_block_style(
		'core/page-list',
		array(
			'handle' => 'slateframe-core-page-list',
			'src'    => get_template_directory_uri() . '/assets/css/core-page-list.css',
			'path'   => get_template_directory() . '/assets/css/core-page-list.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_page_list_styles', 20 );

/**
 * Bound native Post Terms taxonomy links without changing Core term queries.
 *
 * WordPress owns term selection, URLs, separators and block markup.
 */
function slateframe_register_core_post_terms_styles() {
	wp_enqueue_block_style(
		'core/post-terms',
		array(
			'handle' => 'slateframe-core-post-terms',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-terms.css',
			'path'   => get_template_directory() . '/assets/css/core-post-terms.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_terms_styles', 20 );

/**
 * Give native Core Post Comments Link a bounded, accessible touch target.
 *
 * Core owns comment counts, status, post context, URLs and link labels.
 * This conditional presentation-only asset is shared with Gutenberg.
 */
function slateframe_register_core_post_comments_link_styles() {
	wp_enqueue_block_style(
		'core/post-comments-link',
		array(
			'handle' => 'slateframe-core-post-comments-link',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-comments-link.css',
			'path'   => get_template_directory() . '/assets/css/core-post-comments-link.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_comments_link_styles', 20 );

/**
 * Preserve Core Comments Title semantics and multilingual heading reflow.
 *
 * WordPress owns comment approval, counts, labels, post titles and levels.
 * This presentation-only asset is shared with Gutenberg.
 */
function slateframe_register_core_comments_title_styles() {
	wp_enqueue_block_style(
		'core/comments-title',
		array(
			'handle' => 'slateframe-core-comments-title',
			'src'    => get_template_directory_uri() . '/assets/css/core-comments-title.css',
			'path'   => get_template_directory() . '/assets/css/core-comments-title.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_comments_title_styles', 20 );

/**
 * Bound the native Core Post Comments Form without owning submissions.
 *
 * Core retains nonce handling, comment moderation, login rules and labels.
 * The stylesheet is conditional and shared with the block editor.
 */
function slateframe_register_core_post_comments_form_styles() {
	wp_enqueue_block_style(
		'core/post-comments-form',
		array(
			'handle' => 'slateframe-core-post-comments-form',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-comments-form.css',
			'path'   => get_template_directory() . '/assets/css/core-post-comments-form.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_comments_form_styles', 20 );

/**
 * Bound native Core File links without owning downloads or media previews.
 *
 * Core retains file URLs, names, preview controls and download semantics.
 */
function slateframe_register_core_file_styles() {
	wp_enqueue_block_style(
		'core/file',
		array(
			'handle' => 'slateframe-core-file',
			'src'    => get_template_directory_uri() . '/assets/css/core-file.css',
			'path'   => get_template_directory() . '/assets/css/core-file.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_file_styles', 20 );

/**
 * Bound native Core Login/out links and optional login forms.
 *
 * WordPress owns login/logout URLs, nonces, redirects and authentication.
 */
function slateframe_register_core_loginout_styles() {
	wp_enqueue_block_style(
		'core/loginout',
		array(
			'handle' => 'slateframe-core-loginout',
			'src'    => get_template_directory_uri() . '/assets/css/core-loginout.css',
			'path'   => get_template_directory() . '/assets/css/core-loginout.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_loginout_styles', 20 );

/**
 * Bound native Core Post Date links without rewriting published metadata.
 *
 * Core retains ownership of date selection, permalink and time markup.
 */
function slateframe_register_core_post_date_styles() {
	wp_enqueue_block_style(
		'core/post-date',
		array(
			'handle' => 'slateframe-core-post-date',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-date.css',
			'path'   => get_template_directory() . '/assets/css/core-post-date.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_date_styles', 20 );

/**
 * Keep native Core Post Author Name links readable and touch accessible.
 *
 * WordPress retains ownership of author identity, URLs and link behavior.
 */
function slateframe_register_core_post_author_name_styles() {
	wp_enqueue_block_style(
		'core/post-author-name',
		array(
			'handle' => 'slateframe-core-post-author-name',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-author-name.css',
			'path'   => get_template_directory() . '/assets/css/core-post-author-name.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_author_name_styles', 20 );

/**
 * Keep native Core Avatar images bounded and linked targets accessible.
 *
 * Core retains author/comment context, avatar providers and link semantics.
 */
function slateframe_register_core_avatar_styles() {
	wp_enqueue_block_style(
		'core/avatar',
		array(
			'handle' => 'slateframe-core-avatar',
			'src'    => get_template_directory_uri() . '/assets/css/core-avatar.css',
			'path'   => get_template_directory() . '/assets/css/core-avatar.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_avatar_styles', 20 );

/**
 * Bound native Core Site Logo media and home links without altering Core.
 */
function slateframe_register_core_site_logo_styles() {
	wp_enqueue_block_style(
		'core/site-logo',
		array(
			'handle' => 'slateframe-core-site-logo',
			'src'    => get_template_directory_uri() . '/assets/css/core-site-logo.css',
			'path'   => get_template_directory() . '/assets/css/core-site-logo.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_site_logo_styles', 20 );

/**
 * Bound native Core Site Title links and multilingual brand text.
 *
 * WordPress owns the site name, heading level, home URL and link behavior.
 */
function slateframe_register_core_site_title_styles() {
	wp_enqueue_block_style(
		'core/site-title',
		array(
			'handle' => 'slateframe-core-site-title',
			'src'    => get_template_directory_uri() . '/assets/css/core-site-title.css',
			'path'   => get_template_directory() . '/assets/css/core-site-title.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_site_title_styles', 20 );

/**
 * Keep native Core Site Tagline readable across writing systems.
 *
 * WordPress retains ownership of the site description and block markup.
 */
function slateframe_register_core_site_tagline_styles() {
	wp_enqueue_block_style(
		'core/site-tagline',
		array(
			'handle' => 'slateframe-core-site-tagline',
			'src'    => get_template_directory_uri() . '/assets/css/core-site-tagline.css',
			'path'   => get_template_directory() . '/assets/css/core-site-tagline.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_site_tagline_styles', 20 );

/**
 * Bound native Core Author Biography text without changing user profiles.
 *
 * Core owns the author lookup, biography content and empty-profile behavior.
 */
function slateframe_register_core_post_author_biography_styles() {
	wp_enqueue_block_style(
		'core/post-author-biography',
		array(
			'handle' => 'slateframe-core-post-author-biography',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-author-biography.css',
			'path'   => get_template_directory() . '/assets/css/core-post-author-biography.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_author_biography_styles', 20 );


/**
 * Keep Core's approved comment count legible without owning moderation.
 *
 * WordPress resolves the post context and count. Only conditional,
 * editor-shared presentation is registered here.
 */
function slateframe_register_core_post_comments_count_styles() {
	wp_enqueue_block_style(
		'core/post-comments-count',
		array(
			'handle' => 'slateframe-core-post-comments-count',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-comments-count.css',
			'path'   => get_template_directory() . '/assets/css/core-post-comments-count.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_comments_count_styles', 20 );

/**
 * Bound native Core Post Excerpt text and optional Read More links.
 *
 * WordPress owns excerpt selection, length, permalinks and labels.
 * The editor shares this conditional, presentation-only stylesheet.
 */
function slateframe_register_core_post_excerpt_styles() {
	wp_enqueue_block_style(
		'core/post-excerpt',
		array(
			'handle' => 'slateframe-core-post-excerpt',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-excerpt.css',
			'path'   => get_template_directory() . '/assets/css/core-post-excerpt.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_excerpt_styles', 20 );

/**
 * Bound native Read More links without taking ownership of post context.
 * Core retains the permalink, accessible title and link target.
 */
function slateframe_register_core_read_more_styles() {
	wp_enqueue_block_style(
		'core/read-more',
		array(
			'handle' => 'slateframe-core-read-more',
			'src'    => get_template_directory_uri() . '/assets/css/core-read-more.css',
			'path'   => get_template_directory() . '/assets/css/core-read-more.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_read_more_styles', 20 );

/**
 * Bound native Core Post Title links without changing heading semantics.
 *
 * WordPress owns title text, heading level, post context and permalinks.
 * The editor shares this conditional, presentation-only stylesheet.
 */
function slateframe_register_core_post_title_styles() {
	wp_enqueue_block_style(
		'core/post-title',
		array(
			'handle' => 'slateframe-core-post-title',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-title.css',
			'path'   => get_template_directory() . '/assets/css/core-post-title.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_title_styles', 20 );

/**
 * Bound native Core Post Featured Image and its optional permalink target.
 *
 * Core owns the attachment, alternative text, srcset, crop and aspect ratio.
 * Only conditional presentation is added, with Gutenberg editor parity.
 */
function slateframe_register_core_post_featured_image_styles() {
	wp_enqueue_block_style(
		'core/post-featured-image',
		array(
			'handle' => 'slateframe-core-post-featured-image',
			'src'    => get_template_directory_uri() . '/assets/css/core-post-featured-image.css',
			'path'   => get_template_directory() . '/assets/css/core-post-featured-image.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_post_featured_image_styles', 20 );


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
 * Return Photography markers, preserving the legacy broad-filter contract.
 *
 * @return string[] Class tokens that opt into Photography presentation.
 */
function slateframe_photography_marker_classes() {
	$markers        = array(
		'is-style-slateframe-contact-sheet',
		'is-style-slateframe-diptych',
		'is-style-slateframe-photo-feature',
		'is-style-slateframe-photo-sequence',
		'slateframe-photography-sequence',
		'slateframe-gallery-sequence',
	);
	$legacy_markers = apply_filters( 'slateframe_content_mode_markers', array() );
	if ( is_array( $legacy_markers ) ) {
		$markers = array_merge( $markers, $legacy_markers );
	}

	/**
	 * Filters class markers that opt a document into Slateframe Photography.
	 *
	 * @param string[] $markers Photography presentation markers.
	 */
	return apply_filters( 'slateframe_photography_markers', $markers );
}

/**
 * Return site-neutral Portfolio and Knowledge presentation markers.
 *
 * @return string[] Content-mode class tokens.
 */
function slateframe_content_mode_marker_classes() {
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
	 * Filters class markers that trigger Slateframe's contextual styles.
	 *
	 * @param string[] $markers Content markers to scan for.
	 */
	return apply_filters( 'slateframe_content_mode_markers', $markers );
}

/**
 * Return markers for the optional Core Query Loop presentation layer.
 *
 * @return string[] Query Loop class tokens.
 */
function slateframe_query_loop_marker_classes() {
	/**
	 * Filters class markers that opt a document into Query Loop presentation.
	 *
	 * @param string[] $markers Query Loop markers.
	 */
	return apply_filters( 'slateframe_query_loop_markers', array( 'slateframe-project-grid' ) );
}

/**
 * Check stored post content for exact CSS class markers.
 *
 * Marker detection is intentionally class-aware instead of substring-based so
 * prose, code samples, or translated copy that mention a marker name do not
 * accidentally load contextual assets.
 *
 * @param string   $content Stored post content.
 * @param string[] $markers      Class markers to detect.
 * @param bool     $parse_blocks Whether to inspect Gutenberg comments (false for Classic widgets).
 * @return bool
 */
function slateframe_content_has_class_marker( $content, $markers, $parse_blocks = true ) {
	if ( ! is_string( $content ) || '' === trim( $content ) || ! is_array( $markers ) || empty( $markers ) ) {
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

	// Dynamic Core blocks may store their className without HTML markup.
	if ( $parse_blocks && false !== strpos( $content, '<!-- wp:' ) && false !== strpos( $content, '"className"' ) ) {
		static $block_cache = array();
		$key                = md5( $content );
		if ( ! isset( $block_cache[ $key ] ) ) {
			if ( 8 <= count( $block_cache ) ) {
				array_shift( $block_cache );
			}
			$block_cache[ $key ] = parse_blocks( $content );
		}
		return slateframe_blocks_have_class_marker( $block_cache[ $key ], $markers );
	}

	return false;
}

/**
 * Detect exact Core block className tokens, including nested blocks.
 *
 * @param array[]  $blocks  Parsed Core blocks.
 * @param string[] $markers Requested markers.
 * @return bool
 */
function slateframe_blocks_have_class_marker( $blocks, $markers ) {
	if ( ! is_array( $blocks ) || ! is_array( $markers ) ) {
		return false;
	}
	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}
		$attrs      = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$class_name = isset( $attrs['className'] ) ? $attrs['className'] : '';
		if ( is_string( $class_name ) && '' !== trim( $class_name ) ) {
			$classes = preg_split( '/\\s+/', trim( $class_name ) );
			foreach ( $markers as $marker ) {
				if ( is_string( $marker ) && '' !== $marker && in_array( $marker, $classes, true ) ) {
					return true;
				}
			}
		}
		if ( ! empty( $block['innerBlocks'] ) && slateframe_blocks_have_class_marker( $block['innerBlocks'], $markers ) ) {
			return true;
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
	if ( ! is_string( $content ) || false === stripos( $content, '<form' ) ) {
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
	if ( ! is_array( $blocks ) ) {
		return false;
	}

	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}
		$attrs = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		if (
			'core/legacy-widget' === ( isset( $block['blockName'] ) ? $block['blockName'] : '' ) &&
			'search' === ( isset( $attrs['idBase'] ) ? $attrs['idBase'] : '' )
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

		$attrs   = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$raw_ref = isset( $attrs['ref'] ) ? $attrs['ref'] : null;
		$ref     = ( is_int( $raw_ref ) || ( is_string( $raw_ref ) && ctype_digit( $raw_ref ) ) ) ? (int) $raw_ref : 0;
		// Decimal strings outside PHP's integer range must never resolve to a
		// different published pattern ID after a saturating integer cast.
		if ( is_string( $raw_ref ) && $ref > 0 && ltrim( $raw_ref, '0' ) !== (string) $ref ) {
			continue;
		}
		if ( $ref <= 0 || ( isset( $seen[ $ref ] ) && $seen[ $ref ] <= $depth ) ) {
			continue;
		}

		$seen[ $ref ] = $depth;
		$post         = get_post( $ref );
		if ( ! $post instanceof WP_Post || 'wp_block' !== $post->post_type || 'publish' !== $post->post_status ) {
			continue;
		}

		// Filters and importers may supply malformed content; only inspect text.
		if ( ! is_string( $post->post_content ) ) {
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

	if ( ! is_array( $contents ) ) {
		return $needed;
	}

	foreach ( $contents as $content ) {
		if ( ! is_string( $content ) ) {
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
 * detection. Never inspects locked Core post content before postpass.
 * Does not render arbitrary blocks or execute shortcodes.
 *
 * @return string[] Published synced-pattern content.
 */
function slateframe_singular_synced_pattern_contents() {
	static $cache = array();

	if ( ! is_singular() || post_password_required() ) {
		return array();
	}

	$post = get_post();
	if ( ! $post instanceof WP_Post || ! is_string( $post->post_content ) || ! has_block( 'core/block', $post->post_content ) ) {
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

	$sources = slateframe_footer_widget_sources();
	$needed  = array(
		'forms'        => $sources['search_widget'],
		'search_form'  => $sources['search_widget'],
		'form_content' => false,
	);

	foreach ( $sources['contents'] as $source ) {
		$content = $source['content'];
		if ( $source['block'] ) {
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
		}
		if ( slateframe_content_has_form( $content ) ) {
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

	if ( ! is_singular() || post_password_required() ) {
		return slateframe_pattern_form_assets( array() );
	}

	$post = get_post();
	if ( ! $post instanceof WP_Post || ! is_string( $post->post_content ) ) {
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
		$needed = post_password_required() || comments_open() || (bool) get_comments_number();
		$post   = get_post();

		if ( ! $needed && $post instanceof WP_Post && is_string( $post->post_content ) ) {
			$needed = has_block( 'core/search', $post->post_content ) || slateframe_content_has_form( $post->post_content );
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

	if ( is_singular() && ! post_password_required() ) {
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
	if ( ! is_array( $blocks ) ) {
		return false;
	}

	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}
		$block_name = isset( $block['blockName'] ) ? $block['blockName'] : '';
		$attrs      = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$lightbox   = isset( $attrs['lightbox'] ) && is_array( $attrs['lightbox'] ) ? $attrs['lightbox'] : array();

		if (
			in_array( $block_name, array( 'core/image', 'core/gallery' ), true ) &&
			isset( $lightbox['enabled'] ) && true === $lightbox['enabled']
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
	if ( ! is_singular() || post_password_required() ) {
		return false;
	}

	$post = get_post();

	if ( ! $post instanceof WP_Post ) {
		return false;
	}

	$markers = slateframe_photography_marker_classes();

	$contents = array_merge( array( $post->post_content ), slateframe_singular_synced_pattern_contents() );
	foreach ( $contents as $content ) {
		if ( is_array( $markers ) && slateframe_content_has_class_marker( $content, $markers ) ) {
			return true;
		}
		if ( is_string( $content ) && false !== strpos( $content, '"lightbox"' ) && slateframe_blocks_have_lightbox( parse_blocks( $content ) ) ) {
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
	if ( ! is_singular() || post_password_required() ) {
		return false;
	}

	$post = get_post();

	if ( ! $post instanceof WP_Post ) {
		return false;
	}

	$markers = slateframe_content_mode_marker_classes();

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
	if ( ! is_singular() || post_password_required() ) {
		return false;
	}

	$post = get_post();

	if ( ! $post instanceof WP_Post ) {
		return false;
	}

	$markers = slateframe_query_loop_marker_classes();

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
	$footer_presentation  = slateframe_footer_presentation_assets();
	$photography_needed   = slateframe_photography_styles_needed() || $footer_presentation['photography'];
	$content_modes_needed = slateframe_content_modes_needed() || $footer_presentation['content_modes'];
	$query_loop_needed    = slateframe_query_loop_styles_needed() || $footer_presentation['query_loop'];
	// Dynamic plugin output (for example, a shortcode) is not present in
	// stored Core blocks. These opt-in filters cannot suppress required native
	// assets: a false plugin result must never override detected content.
	/**
	 * Filters whether dynamically rendered Photography needs its CSS layer.
	 *
	 * @param bool $photography_needed Existing native-content requirement.
	 */
	$photography_needed = (bool) apply_filters(
		'slateframe_photography_styles_needed',
		$photography_needed
	) || $photography_needed;

	/**
	 * Filters whether dynamically rendered Knowledge/Portfolio needs its CSS.
	 *
	 * @param bool $content_modes_needed Existing native-content requirement.
	 */
	$content_modes_needed = (bool) apply_filters(
		'slateframe_content_modes_styles_needed',
		$content_modes_needed
	) || $content_modes_needed;

	/**
	 * Filters whether a dynamically rendered Core Query Loop needs its CSS.
	 *
	 * @param bool $query_loop_needed Existing native-content requirement.
	 */
	$query_loop_needed = (bool) apply_filters(
		'slateframe_query_loop_styles_needed',
		$query_loop_needed
	) || $query_loop_needed;

	$forms_needed        = slateframe_forms_styles_needed();
	$form_content_needed = slateframe_form_content_styles_needed();
	$search_form_needed  = slateframe_search_form_styles_needed();
	// Core replaces protected content with a password form. Hidden comments
	// must not load their CSS or reply script until the password is accepted.
	$password_form_needed = is_singular() && post_password_required();
	$comments_visible     = is_singular() && ! $password_form_needed;
	$comments_open        = $comments_visible && comments_open();
	// Closed but unlocked threads still render their historical comments.
	$comments_needed = $comments_open || ( $comments_visible && (bool) get_comments_number() );
	// Preserve CSS dependency closure even when extension filters disagree.
	$forms_needed = $forms_needed || $form_content_needed || $search_form_needed || $comments_needed;
	$forms_needed = $forms_needed || $password_form_needed;

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
			is_singular() ? array( 'slateframe-reading' ) : array( 'slateframe-style' ),
			$version
		);
	}

	if ( $content_modes_needed || $query_loop_needed ) {
		wp_enqueue_style(
			'slateframe-content-modes',
			get_template_directory_uri() . '/assets/css/content-modes.css',
			is_singular() ? array( 'slateframe-reading' ) : array( 'slateframe-style' ),
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

	if ( $comments_needed ) {
		wp_enqueue_style(
			'slateframe-comments',
			get_template_directory_uri() . '/assets/css/comments.css',
			array( 'slateframe-reading', 'slateframe-forms' ),
			$version
		);
	}

	if ( $comments_open && get_option( 'thread_comments' ) ) {
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

	wp_enqueue_style(
		'slateframe-print',
		get_template_directory_uri() . '/assets/css/print.css',
		array( 'slateframe-style' ),
		$version,
		'print'
	);

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
 * Preserve native list semantics for markerless Slateframe Core List styles.
 *
 * WebKit can omit list semantics when CSS removes the native marker. Only the
 * two explicitly markerless Core List styles need a role; ordinary lists and
 * author-provided roles must remain untouched. This changes rendered HTML,
 * not Gutenberg's stored block attributes or nested list markup.
 *
 * @param string $block_content Rendered Core List markup.
 * @return string
 */
function slateframe_preserve_styled_list_semantics( $block_content ) {
	if ( ! is_string( $block_content ) || '' === $block_content ) {
		return $block_content;
	}

	if (
		false === strpos( $block_content, 'is-style-slateframe-steps' ) &&
		false === strpos( $block_content, 'is-style-slateframe-checklist' )
	) {
		return $block_content;
	}

	$processor = new WP_HTML_Tag_Processor( $block_content );

	if ( ! $processor->next_tag() || ! in_array( $processor->get_tag(), array( 'OL', 'UL' ), true ) ) {
		return $block_content;
	}

	if (
		! $processor->has_class( 'is-style-slateframe-steps' ) &&
		! $processor->has_class( 'is-style-slateframe-checklist' )
	) {
		return $block_content;
	}

	if ( null === $processor->get_attribute( 'role' ) ) {
		$processor->set_attribute( 'role', 'list' );
	}

	return $processor->get_updated_html();
}
add_filter( 'render_block_core/list', 'slateframe_preserve_styled_list_semantics' );

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

	while ( $processor->next_tag( array( 'tag_name' => 'FIGURE' ) ) ) {
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
 * Make Core Calendar's horizontal scroll container keyboard reachable.
 *
 * Calendar renders a seven-column table inside a Core-owned wrapper. At
 * narrow widths or text zoom, the wrapper scrolls instead of changing the
 * table semantics. Keep author-supplied tabindex values untouched.
 *
 * @param string $block_content Rendered Core Calendar markup.
 * @return string
 */
function slateframe_focusable_calendar_block( $block_content ) {
	if ( '' === $block_content || false === strpos( $block_content, 'wp-block-calendar' ) ) {
		return $block_content;
	}

	$processor = new WP_HTML_Tag_Processor( $block_content );

	while ( $processor->next_tag( array( 'tag_name' => 'DIV' ) ) ) {
		if ( ! $processor->has_class( 'wp-block-calendar' ) ) {
			continue;
		}

		if ( null === $processor->get_attribute( 'tabindex' ) ) {
			$processor->set_attribute( 'tabindex', '0' );
		}

		break;
	}

	return $processor->get_updated_html();
}
add_filter( 'render_block_core/calendar', 'slateframe_focusable_calendar_block' );

/**
 * Keep native Code and Preformatted scroll containers keyboard reachable.
 *
 * Their rendered PRE can scroll at narrow widths or increased text size. Add a
 * focus stop to the exact Core root without changing saved Gutenberg markup,
 * nested PRE elements, or an author-provided tabindex.
 *
 * @param string $block_content Rendered Core code/preformatted block markup.
 * @return string
 */
function slateframe_focusable_preformatted_block( $block_content ) {
	if ( ! is_string( $block_content ) || '' === $block_content || false === strpos( $block_content, 'wp-block-' ) ) {
		return $block_content;
	}

	$processor = new WP_HTML_Tag_Processor( $block_content );

	if ( ! $processor->next_tag() || 'PRE' !== $processor->get_tag() ) {
		return $block_content;
	}

	if ( ! $processor->has_class( 'wp-block-code' ) && ! $processor->has_class( 'wp-block-preformatted' ) ) {
		return $block_content;
	}

	if ( null === $processor->get_attribute( 'tabindex' ) ) {
		$processor->set_attribute( 'tabindex', '0' );
	}

	return $processor->get_updated_html();
}
add_filter( 'render_block_core/code', 'slateframe_focusable_preformatted_block' );
add_filter( 'render_block_core/preformatted', 'slateframe_focusable_preformatted_block' );


/**
 * Keep scrollable Classic blocks accessible without changing saved markup.
 *
 * Core Freeform preserves author HTML rather than generating block wrappers.
 * Its native PRE and TABLE elements can overflow at narrow widths and zoom,
 * so expose the scroll container to keyboard users. Preserve author tabindex
 * and avoid making Verse a redundant focus stop (Verse wraps in Slateframe).
 *
 * @param string $block_content Rendered Core Freeform markup.
 * @return string
 */
function slateframe_focusable_freeform_scrollers( $block_content ) {
	if (
		! is_string( $block_content ) ||
		'' === $block_content ||
		( false === stripos( $block_content, '<pre' ) && false === stripos( $block_content, '<table' ) )
	) {
		return $block_content;
	}

	$processor = new WP_HTML_Tag_Processor( $block_content );

	while ( $processor->next_tag() ) {
		$tag = $processor->get_tag();
		if ( 'PRE' !== $tag && 'TABLE' !== $tag ) {
			continue;
		}

		if ( 'PRE' === $tag && $processor->has_class( 'wp-block-verse' ) ) {
			continue;
		}

		if ( null === $processor->get_attribute( 'tabindex' ) ) {
			$processor->set_attribute( 'tabindex', '0' );
		}
	}

	return $processor->get_updated_html();
}
add_filter( 'render_block_core/freeform', 'slateframe_focusable_freeform_scrollers' );


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

	if ( ! is_string( $html ) || '' === trim( $html ) ) {
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

/**
 * Bound native Core Columns without overriding WordPress stacking choices.
 *
 * WordPress owns column widths, mobile stacking and block serialization.
 * Only intrinsic width containment and multilingual reflow are theme-owned.
 */
function slateframe_register_core_columns_styles() {
	wp_enqueue_block_style(
		'core/columns',
		array(
			'handle' => 'slateframe-core-columns',
			'src'    => get_template_directory_uri() . '/assets/css/core-columns.css',
			'path'   => get_template_directory() . '/assets/css/core-columns.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_columns_styles', 20 );

/**
 * Keep native Core Group containers bounded without changing authored layouts.
 *
 * WordPress owns Group layout, alignwide/alignfull, spacing and inner blocks.
 * The same small conditional stylesheet is registered for Gutenberg.
 */
function slateframe_register_core_group_styles() {
	wp_enqueue_block_style(
		'core/group',
		array(
			'handle' => 'slateframe-core-group',
			'src'    => get_template_directory_uri() . '/assets/css/core-group.css',
			'path'   => get_template_directory() . '/assets/css/core-group.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_group_styles', 20 );

/**
 * Keep native Core Details disclosures accessible at small viewports.
 *
 * The browser and WordPress retain summary, open state and keyboard behavior.
 * Only presentation is registered; no custom disclosure JavaScript is used.
 */
function slateframe_register_core_details_styles() {
	wp_enqueue_block_style(
		'core/details',
		array(
			'handle' => 'slateframe-core-details',
			'src'    => get_template_directory_uri() . '/assets/css/core-details.css',
			'path'   => get_template_directory() . '/assets/css/core-details.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_details_styles', 20 );

/**
 * Bound native Core Separator rules without replacing authored variants.
 *
 * WordPress owns the semantic horizontal rule, wide/dots styles, and colors.
 * The stylesheet is conditional on rendered Core blocks and editor-shared.
 */
function slateframe_register_core_separator_styles() {
	wp_enqueue_block_style(
		'core/separator',
		array(
			'handle' => 'slateframe-core-separator',
			'src'    => get_template_directory_uri() . '/assets/css/core-separator.css',
			'path'   => get_template_directory() . '/assets/css/core-separator.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_separator_styles', 20 );

/**
 * Preserve native Core Quote presentation and authored plain variants.
 *
 * WordPress retains semantic markup, citations, styles, and serialization.
 */
function slateframe_register_core_quote_styles() {
	wp_enqueue_block_style(
		'core/quote',
		array(
			'handle' => 'slateframe-core-quote',
			'src'    => get_template_directory_uri() . '/assets/css/core-quote.css',
			'path'   => get_template_directory() . '/assets/css/core-quote.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_quote_styles', 20 );


/**
 * Bound native Core Pullquote presentation without replacing authored variants.
 *
 * WordPress retains the semantic figure/blockquote, citation, colors, and serialization.
 */
function slateframe_register_core_pullquote_styles() {
	wp_enqueue_block_style(
		'core/pullquote',
		array(
			'handle' => 'slateframe-core-pullquote',
			'src'    => get_template_directory_uri() . '/assets/css/core-pullquote.css',
			'path'   => get_template_directory() . '/assets/css/core-pullquote.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_pullquote_styles', 20 );

/**
 * Bound authored Core Query Loop empty-state content without changing queries.
 *
 * Core owns result detection, wrapper markup, nested blocks and navigation.
 */
function slateframe_register_core_query_no_results_styles() {
	wp_enqueue_block_style(
		'core/query-no-results',
		array(
			'handle' => 'slateframe-core-query-no-results',
			'src'    => get_template_directory_uri() . '/assets/css/core-query-no-results.css',
			'path'   => get_template_directory() . '/assets/css/core-query-no-results.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_query_no_results_styles', 20 );

/**
 * Bound native Core Image captions without changing media or lightbox behavior.
 *
 * Core owns links, alt text, attachment sources, sizes and gallery markup.
 */
function slateframe_register_core_image_styles() {
	wp_enqueue_block_style(
		'core/image',
		array(
			'handle' => 'slateframe-core-image',
			'src'    => get_template_directory_uri() . '/assets/css/core-image.css',
			'path'   => get_template_directory() . '/assets/css/core-image.css',
			'ver'    => wp_get_theme()->get( 'Version' ),
		)
	);
}
add_action( 'init', 'slateframe_register_core_image_styles', 20 );
