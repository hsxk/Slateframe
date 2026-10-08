<?php
/**
 * Single post template.
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
					<?php slateframe_entry_meta(); ?>
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

			<div class="slateframe-shell slateframe-entry-context">
				<?php slateframe_entry_footer(); ?>
			</div>
		</article>

		<div class="slateframe-shell">
			<?php slateframe_related_posts(); ?>
		</div>

		<?php if ( apply_filters( 'slateframe_show_post_navigation', true, get_the_ID() ) ) : ?>
		<div class="slateframe-shell slateframe-post-navigation">
			<?php
			the_post_navigation(
				array(
					'prev_text' => '<span class="slateframe-post-navigation-label">' . esc_html__( 'Previous post', 'slateframe' ) . '</span><span>%title</span>',
					'next_text' => '<span class="slateframe-post-navigation-label">' . esc_html__( 'Next post', 'slateframe' ) . '</span><span>%title</span>',
				)
			);
			?>
		</div>
		<?php endif; ?>

		<?php comments_template(); ?>
	<?php endwhile; ?>
</main>
<?php
get_footer();
