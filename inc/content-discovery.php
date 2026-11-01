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
 * Normalize positive decimal IDs from Core and public adapter arrays.
 *
 * Avoid coercing nested arrays, booleans, objects, decimal strings or
 * overflowing integers into unrelated post/term IDs. Preserve input order.
 *
 * @param mixed $candidates Potential ID array.
 * @return int[] Unique positive IDs.
 */
function slateframe_discovery_positive_ids( $candidates ) {
	if ( ! is_array( $candidates ) ) {
		return array();
	}

	$ids = array();
	foreach ( $candidates as $candidate ) {
		if ( ! is_int( $candidate ) && ! is_string( $candidate ) ) {
			continue;
		}
		if ( ! preg_match( '/^[0-9]+$/D', (string) $candidate ) ) {
			continue;
		}
		$id = (int) $candidate;
		if ( 0 < $id && ltrim( (string) $candidate, '0' ) === (string) $id ) {
			$ids[] = $id;
		}
	}

	return array_values( array_unique( $ids ) );
}

/**
 * Intersect explicit inclusion and exclusion lists before WP_Query.
 *
 * WordPress ignores post__not_in when post__in is present; an empty post__in
 * also means unrestricted. Never widen an adapter's explicit candidate set.
 *
 * @param array $args Query arguments.
 * @param int   $excluded_post_id Source article, if any.
 * @return array
 */
function slateframe_discovery_constrain_post_in( $args, $excluded_post_id = 0 ) {
	if ( ! array_key_exists( 'post__in', $args ) ) {
		return $args;
	}

	$excluded = slateframe_discovery_positive_ids( isset( $args['post__not_in'] ) ? $args['post__not_in'] : array() );
	if ( $excluded_post_id ) {
		$excluded[] = absint( $excluded_post_id );
	}

	$ids              = slateframe_discovery_positive_ids( $args['post__in'] );
	$ids              = array_values( array_diff( $ids, $excluded ) );
	$args['post__in'] = $ids ? $ids : array( 0 );

	return $args;
}

/**
 * Preserve public post-only, published-only, bounded query invariants.
 *
 * @param array $args Query arguments.
 * @param int   $excluded_post_id Source article, if any.
 * @return array
 */
function slateframe_discovery_bound_query_args( $args, $excluded_post_id = 0 ) {
	$args['post_type']           = 'post';
	$args['post_status']         = 'publish';
	$args['posts_per_page']      = 3;
	$args['nopaging']            = false;
	$args['fields']              = 'all';
	$args['no_found_rows']       = true;
	$args['suppress_filters']    = false;
	$args['ignore_sticky_posts'] = true;

	$excluded = slateframe_discovery_positive_ids( isset( $args['post__not_in'] ) ? $args['post__not_in'] : array() );
	if ( $excluded_post_id ) {
		$excluded[] = absint( $excluded_post_id );
	}
	$args['post__not_in'] = array_values( array_unique( $excluded ) );

	return slateframe_discovery_constrain_post_in( $args, $excluded_post_id );
}

/**
 * Normalize taxonomy IDs returned by Core or public taxonomy adapters.
 *
 * WordPress normally returns integer IDs for a fields=ids request, but
 * taxonomy filters can return a WP_Error, null, or mixed array. Ignore
 * malformed members instead of allowing array_map() to throw or producing
 * accidental term 1 from an object/array cast.
 *
 * @param mixed $candidates Taxonomy ID response.
 * @return int[] Positive, unique term IDs in their original order.
 */
function slateframe_discovery_taxonomy_ids( $candidates ) {
	return slateframe_discovery_positive_ids( $candidates );
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
	$tag_ids = slateframe_discovery_taxonomy_ids( wp_get_post_tags( $post_id, array( 'fields' => 'ids' ) ) );
	$cat_ids = slateframe_discovery_taxonomy_ids( wp_get_post_categories( $post_id, array( 'fields' => 'ids' ) ) );

	$base_args = array(
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

	$scopes = array();
	if ( $tag_ids ) {
		$scopes[] = array( 'tag__in' => $tag_ids );
	}
	if ( $cat_ids ) {
		$scopes[] = array( 'category__in' => $cat_ids );
	}
	$scopes[] = array();

	foreach ( $scopes as $scope ) {
		$args = array_merge( $base_args, $scope );
		/**
		 * Filters Slateframe's related-post query at each relevance tier.
		 *
		 * Multilingual adapters must constrain every invocation.
		 *
		 * @param array $args    WP_Query arguments.
		 * @param int   $post_id Source post ID.
		 */
		$filtered = apply_filters( 'slateframe_related_posts_args', $args, $post_id );
		$args     = is_array( $filtered ) && ! empty( $filtered ) ? $filtered : $args;
		$query    = new WP_Query( slateframe_discovery_bound_query_args( $args, $post_id ) );
		if ( $query->have_posts() ) {
			return $query;
		}
	}
	return $query;
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
						<span class="slateframe-related-title"><bdi><?php echo wp_kses_post( slateframe_get_display_title() ); ?></bdi></span>
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
	$filtered = apply_filters( 'slateframe_not_found_posts_args', $args );
	$args     = is_array( $filtered ) && ! empty( $filtered ) ? $filtered : $args;

	return new WP_Query( slateframe_discovery_bound_query_args( $args ) );
}
