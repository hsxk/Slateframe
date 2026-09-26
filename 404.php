<?php
/**
 * 404 template.
 *
 * @package Slateframe
 */

get_header();
$slateframe_recent = slateframe_not_found_posts_query();
?>
<main id="main-content" class="slateframe-main">
	<section class="slateframe-page-header slateframe-not-found">
		<div class="slateframe-shell">
			<p class="slateframe-not-found-code" aria-hidden="true"><?php esc_html_e( '404', 'slateframe' ); ?></p>
			<h1 class="slateframe-page-title"><?php esc_html_e( 'Page not found', 'slateframe' ); ?></h1>
			<p class="slateframe-not-found-lead"><?php esc_html_e( 'The page may have moved or no longer exists. Search the site, return home, or continue with recent writing.', 'slateframe' ); ?></p>
			<?php get_search_form(); ?>
			<div class="slateframe-not-found-actions">
				<a class="slateframe-action-link" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Return home', 'slateframe' ); ?></a>
			</div>
		</div>
	</section>

	<?php if ( $slateframe_recent->have_posts() ) : ?>
		<section class="slateframe-shell slateframe-not-found-recent" aria-labelledby="slateframe-not-found-recent-title">
			<div class="slateframe-related-heading">
				<p class="slateframe-related-kicker"><?php esc_html_e( 'Explore', 'slateframe' ); ?></p>
				<h2 id="slateframe-not-found-recent-title"><?php esc_html_e( 'Recent posts', 'slateframe' ); ?></h2>
			</div>
			<div class="slateframe-related-list">
				<?php
				while ( $slateframe_recent->have_posts() ) :
					$slateframe_recent->the_post();
					?>
					<article <?php post_class( 'slateframe-related-item' ); ?>>
						<a href="<?php the_permalink(); ?>">
							<span class="slateframe-related-title"><?php the_title(); ?></span>
							<time datetime="<?php echo esc_attr( get_the_date( DATE_W3C ) ); ?>"><?php echo esc_html( get_the_date() ); ?></time>
						</a>
					</article>
					<?php
				endwhile;
				?>
			</div>
		</section>
		<?php wp_reset_postdata(); ?>
	<?php endif; ?>
</main>
<?php
get_footer();
