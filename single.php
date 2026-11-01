<?php
/**
 * Single post template.
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
					<?php slateframe_entry_meta(); ?>
					<h1 class="slateframe-entry-title"><bdi><?php echo wp_kses_post( slateframe_get_display_title() ); ?></bdi></h1>
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

		<?php // Avoid duplicate comment lists, forms and #comments anchors when Core owns the discussion. ?>
		<?php if ( ( comments_open() || get_comments_number() ) && ! slateframe_has_core_discussion_block( get_the_ID() ) ) : ?>
			<?php comments_template(); ?>
		<?php endif; ?>
	<?php endwhile; ?>
</main>
<?php
get_footer();
