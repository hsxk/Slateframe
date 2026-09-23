<?php
/**
 * Page template.
 *
 * @package Slateframe
 */

get_header();
?>
<main id="main-content" class="slateframe-main">
	<?php
	while ( have_posts() ) :
		the_post();
		?>
		<article <?php post_class( 'slateframe-entry' ); ?>>
			<header class="slateframe-page-header">
				<div class="slateframe-shell">
					<h1 class="slateframe-entry-title"><?php the_title(); ?></h1>
				</div>
			</header>

			<div class="slateframe-prose">
				<?php
				the_content();
				wp_link_pages();
				?>
			</div>
		</article>

		<?php
		if ( comments_open() || get_comments_number() ) {
			comments_template();
		}
		?>
	<?php endwhile; ?>
</main>
<?php
get_footer();
