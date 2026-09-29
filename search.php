<?php
/**
 * Search results template.
 *
 * @package Slateframe
 */

get_header();
global $wp_query;
?>
<main id="main-content" class="slateframe-main">
	<header class="slateframe-page-header">
		<div class="slateframe-shell">
			<h1 class="slateframe-page-title">
				<?php
				printf(
					/* translators: %s: search query. */
					esc_html__( 'Search results for: %s', 'slateframe' ),
					esc_html( get_search_query() )
				);
				?>
			</h1>
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

	<?php if ( $wp_query->max_num_pages > 1 ) : ?>
		<div class="slateframe-shell slateframe-pagination">
			<?php slateframe_pagination(); ?>
		</div>
	<?php endif; ?>
</main>
<?php
get_footer();
