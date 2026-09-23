<?php
/**
 * Search results template.
 *
 * @package Slateframe
 */

get_header();
?>
<main id="main-content" class="slateframe-main">
	<header class="slateframe-page-header">
		<div class="slateframe-shell">
			<h1 class="slateframe-page-title">
				<?php
				/* translators: %s: search query. */
				printf(
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
			?>
			<section class="slateframe-empty-state">
				<h2><?php esc_html_e( 'No results', 'slateframe' ); ?></h2>
				<p><?php esc_html_e( 'Try a different search term.', 'slateframe' ); ?></p>
			</section>
			<?php
		endif;
		?>
	</div>

	<div class="slateframe-shell slateframe-pagination">
		<?php slateframe_pagination(); ?>
	</div>
</main>
<?php
get_footer();
