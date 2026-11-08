<?php
/**
 * Search results template.
 *
 * @package Slateframe
 */

get_header();
global $wp_query;
?>
<main id="main-content" class="slateframe-main" tabindex="-1">
	<header class="slateframe-page-header">
		<div class="slateframe-shell">
			<h1 class="slateframe-page-title">
				<?php
				$slateframe_search_query = get_search_query( false );
				if ( slateframe_has_readable_label( $slateframe_search_query ) ) {
					printf(
						/* translators: %s: search query. */
						esc_html__( 'Search results for: %s', 'slateframe' ),
						'<bdi>' . esc_html( $slateframe_search_query ) . '</bdi>'
					);
				} else {
					esc_html_e( 'Search results', 'slateframe' );
				}
				?>
			</h1>
			<p class="slateframe-archive-description">
				<?php
				printf(
					esc_html(
						/* translators: %s: number of search results. */
						_n( '%s result found', '%s results found', (int) $wp_query->found_posts, 'slateframe' )
					),
					'<bdi>' . esc_html( number_format_i18n( (int) $wp_query->found_posts ) ) . '</bdi>'
				);
				?>
			</p>
			<?php get_search_form(); ?>
		</div>
	</header>

	<div class="slateframe-shell slateframe-grid">
		<?php
		if ( have_posts() ) :
			while ( have_posts() ) :
				the_post();
				get_template_part( 'template-parts/content', 'card' );
			endwhile;
		else :
			get_template_part( 'template-parts/content', 'none' );
		endif;
		?>
	</div>


	<?php
	// Offer a useful next step when a search has no matches, without changing its results.
	if ( 0 === (int) $wp_query->found_posts ) :
		// The isolated listing harness does not load discovery helpers or WordPress classes.
		if ( function_exists( 'slateframe_search_recent_posts_query' ) && class_exists( 'WP_Query', false ) ) :
			$slateframe_recent_posts = slateframe_search_recent_posts_query();
			if ( $slateframe_recent_posts->have_posts() ) :
				?>
			<section class="slateframe-shell" aria-labelledby="slateframe-recent-posts-heading">
				<h2 id="slateframe-recent-posts-heading"><?php esc_html_e( 'Recent posts', 'slateframe' ); ?></h2>
				<div class="slateframe-grid">
					<?php
					while ( $slateframe_recent_posts->have_posts() ) :
						$slateframe_recent_posts->the_post();
						get_template_part( 'template-parts/content', 'card' );
					endwhile;
					?>
				</div>
			</section>
				<?php
			endif;
			wp_reset_postdata();
		endif;
	endif;
	?>

	<?php if ( $wp_query->max_num_pages > 1 ) : ?>
		<div class="slateframe-shell slateframe-pagination">
			<?php slateframe_pagination(); ?>
		</div>
	<?php endif; ?>
</main>
<?php
get_footer();
