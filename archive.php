<?php
/**
 * Archive template.
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
			// Core and taxonomy filters may return a blank or invisible archive
			// label. Keep the native archive context without an unnamed H1.
			$slateframe_archive_title = get_the_archive_title();
			if ( ! slateframe_has_readable_label( $slateframe_archive_title ) ) {
				if ( is_category() ) {
					$slateframe_archive_title = __( 'Category archive', 'slateframe' );
				} elseif ( is_tag() ) {
					$slateframe_archive_title = __( 'Tag archive', 'slateframe' );
				} elseif ( is_date() ) {
					$slateframe_archive_title = __( 'Date archive', 'slateframe' );
				} elseif ( is_post_type_archive() ) {
					$slateframe_archive_title = __( 'Content archive', 'slateframe' );
				} else {
					$slateframe_archive_title = __( 'Archive', 'slateframe' );
				}
			}
			?>
			<h1 class="slateframe-page-title"><bdi><?php echo wp_kses_post( $slateframe_archive_title ); ?></bdi></h1>
			<?php the_archive_description( '<div class="slateframe-archive-description">', '</div>' ); ?>
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
