<?php
/**
 * Site-neutral content discovery helpers.
 *
 * @package Slateframe
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Build a conservative related-post query for the current article.
 *
 * Tags are preferred, categories are the fallback, and recent posts are the
 * final fallback. Multilingual plugins may constrain the query through normal
 * WordPress query filters or the public Slateframe args filter.
 *
 * @param int $post_id Source post ID.
 * @return WP_Query
 */
function slateframe_related_posts_query( $post_id ) {
	$post_id = absint( $post_id );
	$tag_ids = wp_get_post_tags( $post_id, array( 'fields' => 'ids' ) );
	$cat_ids = wp_get_post_categories( $post_id, array( 'fields' => 'ids' ) );

	$args = array(
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'posts_per_page'      => 3,
		'post__not_in'        => array( $post_id ),
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
		'suppress_filters'    => false,
		'orderby'             => 'date',
		'order'               => 'DESC',
	);

	if ( ! is_wp_error( $tag_ids ) && $tag_ids ) {
		$args['tag__in'] = array_map( 'absint', $tag_ids );
	} elseif ( $cat_ids ) {
		$args['category__in'] = array_map( 'absint', $cat_ids );
	}

	/**
	 * Filters Slateframe's related-post query.
	 *
	 * This is the intended adapter point for language plugins, editorial
	 * relevance plugins, or sites with custom taxonomy relationships.
	 *
	 * @param array $args    WP_Query arguments.
	 * @param int   $post_id Source post ID.
	 */
	$args = apply_filters( 'slateframe_related_posts_args', $args, $post_id );

	if ( ! is_array( $args ) ) {
		$args = array();
	}

	return new WP_Query( $args );
}

/**
 * Render related reading after a single post.
 */
function slateframe_related_posts() {
	if ( ! is_singular( 'post' ) ) {
		return;
	}

	$post_id = get_the_ID();

	/**
	 * Filters whether Slateframe renders its related-reading section.
	 *
	 * @param bool $show    Whether to render the section.
	 * @param int  $post_id Current post ID.
	 */
	if ( ! apply_filters( 'slateframe_show_related_posts', true, $post_id ) ) {
		return;
	}

	$query = slateframe_related_posts_query( $post_id );

	if ( ! $query->have_posts() ) {
		return;
	}

	?>
	<section class="slateframe-related" aria-labelledby="slateframe-related-title">
		<div class="slateframe-related-heading">
			<p class="slateframe-related-kicker"><?php esc_html_e( 'Continue reading', 'slateframe' ); ?></p>
			<h2 id="slateframe-related-title"><?php esc_html_e( 'Related posts', 'slateframe' ); ?></h2>
		</div>
		<div class="slateframe-related-list">
			<?php
			while ( $query->have_posts() ) :
				$query->the_post();
				?>
				<article <?php post_class( 'slateframe-related-item' ); ?>>
					<a href="<?php the_permalink(); ?>">
						<span class="slateframe-related-title"><?php the_title(); ?></span>
						<time datetime="<?php echo esc_attr( get_the_date( DATE_W3C ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
					</a>
				</article>
				<?php
			endwhile;
			?>
		</div>
	</section>
	<?php

	wp_reset_postdata();
}

/**
 * Query recent posts for the 404 recovery surface.
 *
 * @return WP_Query
 */
function slateframe_not_found_posts_query() {
	$args = array(
		'post_type'           => 'post',
		'post_status'         => 'publish',
		'posts_per_page'      => 3,
		'ignore_sticky_posts' => true,
		'no_found_rows'       => true,
		'suppress_filters'    => false,
		'orderby'             => 'date',
		'order'               => 'DESC',
	);

	/**
	 * Filters the recent-content query used on Slateframe's 404 template.
	 *
	 * @param array $args WP_Query arguments.
	 */
	$args = apply_filters( 'slateframe_not_found_posts_args', $args );

	return new WP_Query( is_array( $args ) ? $args : array() );
}
