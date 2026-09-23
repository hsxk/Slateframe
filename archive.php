<?php
/**
 * Archive template.
 *
 * @package Slateframe
 */

get_header();
?>
<main id="main-content" class="slateframe-main">
	<header class="slateframe-page-header">
		<div class="slateframe-shell">
			<?php
			the_archive_title( '<h1 class="slateframe-page-title">', '</h1>' );
			the_archive_description( '<div class="slateframe-archive-description">', '</div>' );
			?>
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
			<p><?php esc_html_e( 'Nothing found.', 'slateframe' ); ?></p>
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
