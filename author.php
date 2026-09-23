<?php
/**
 * Author archive template.
 *
 * @package Slateframe
 */

get_header();

$author_id  = get_queried_object_id();
$author_bio = get_the_author_meta( 'description', $author_id );
?>
<main id="main-content" class="slateframe-main">
	<header class="slateframe-page-header">
		<div class="slateframe-shell">
			<h1 class="slateframe-page-title"><?php echo esc_html( get_the_author_meta( 'display_name', $author_id ) ); ?></h1>
			<?php if ( $author_bio ) : ?>
				<p class="slateframe-archive-description"><?php echo esc_html( $author_bio ); ?></p>
			<?php endif; ?>
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
