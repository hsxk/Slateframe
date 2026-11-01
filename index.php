<?php
/**
 * Main fallback template.
 *
 * @package Slateframe
 */

get_header();
global $wp_query;
?>
<main id="main-content" class="slateframe-main" tabindex="-1">
	<header class="slateframe-page-header">
		<div class="slateframe-shell">
			<?php
			$slateframe_index_title = is_home() && ! is_front_page()
				? single_post_title( '', false )
				: get_bloginfo( 'name', 'display' );
			if ( ! slateframe_has_readable_label( $slateframe_index_title ) ) {
				$slateframe_index_title = __( 'Latest posts', 'slateframe' );
			}
			?>
			<h1 class="slateframe-page-title"><bdi><?php echo esc_html( $slateframe_index_title ); ?></bdi></h1>
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
