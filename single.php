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
					<h1 class="slateframe-entry-title"><?php the_title(); ?></h1>
				</div>
			</header>

			<?php if ( has_post_thumbnail() ) : ?>
				<figure class="slateframe-shell slateframe-entry-hero">
					<?php
					the_post_thumbnail(
						'full',
						array(
							'class'         => 'slateframe-entry-hero-image',
							'loading'       => 'eager',
							'decoding'      => 'async',
							'fetchpriority' => 'high',
						)
					);
					?>
				</figure>
			<?php endif; ?>

			<div class="slateframe-prose">
				<?php
				the_content();
				wp_link_pages();
				?>
			</div>

			<div class="slateframe-shell slateframe-entry-context">
				<?php slateframe_entry_footer(); ?>
			</div>
		</article>

		<div class="slateframe-shell">
			<?php slateframe_related_posts(); ?>
		</div>

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

		<?php comments_template(); ?>
	<?php endwhile; ?>
</main>
<?php
get_footer();
