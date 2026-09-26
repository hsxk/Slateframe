<?php
/**
 * Author archive template.
 *
 * @package Slateframe
 */

get_header();

$slateframe_author_id  = get_queried_object_id();
$slateframe_author_bio = get_the_author_meta( 'description', $slateframe_author_id );
?>
<main id="main-content" class="slateframe-main">
	<header class="slateframe-page-header">
		<div class="slateframe-shell slateframe-author-header">
			<div class="slateframe-author-avatar">
				<?php echo get_avatar( $slateframe_author_id, 96, '', '', array( 'loading' => 'eager' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</div>
			<div class="slateframe-author-copy">
			<h1 class="slateframe-page-title"><?php echo esc_html( get_the_author_meta( 'display_name', $slateframe_author_id ) ); ?></h1>
			<?php if ( $slateframe_author_bio ) : ?>
				<p class="slateframe-archive-description"><?php echo esc_html( $slateframe_author_bio ); ?></p>
			<?php endif; ?>
			</div>
		</div>
	</header>

	<div class="slateframe-shell slateframe-grid">
		<?php
		while ( have_posts() ) :
			the_post();
			get_template_part( 'template-parts/content', 'card' );
		endwhile;
		?>
	</div>

	<div class="slateframe-shell slateframe-pagination">
		<?php slateframe_pagination(); ?>
	</div>
</main>
<?php
get_footer();
