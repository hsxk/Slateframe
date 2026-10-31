<?php
/**
 * Page template.
 *
 * @package Slateframe
 */

get_header();
?>
<main id="main-content" class="slateframe-main" tabindex="-1">
	<?php
	while ( have_posts() ) :
		the_post();
		?>
		<article <?php post_class( 'slateframe-entry' ); ?>>
			<header class="slateframe-page-header">
				<div class="slateframe-shell">
					<h1 class="slateframe-entry-title"><?php echo wp_kses_post( slateframe_get_display_title() ); ?></h1>
				</div>
			</header>

			<?php slateframe_featured_media(); ?>

			<div class="slateframe-prose">
				<?php
				the_content();
				slateframe_content_pagination();
				?>
			</div>
		</article>

		<?php
		// Core-owned discussion blocks must not be followed by a duplicate classic form.
		if ( ( comments_open() || get_comments_number() ) && ! slateframe_has_core_discussion_block( get_the_ID() ) ) {
			comments_template();
		}
		?>
	<?php endwhile; ?>
</main>
<?php
get_footer();
