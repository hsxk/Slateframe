<?php
/**
 * The template for displaying 404 pages.
 *
 * @package Slateframe
 */

get_header();
?>
<main id="main-content" class="slateframe-main">
	<section class="slateframe-page-header">
		<div class="slateframe-shell">
			<p><?php esc_html_e( '404', 'slateframe' ); ?></p>
			<h1 class="slateframe-page-title"><?php esc_html_e( 'Page not found', 'slateframe' ); ?></h1>
			<p><?php esc_html_e( 'The page may have moved or no longer exists. Search the site or return home.', 'slateframe' ); ?></p>
			<?php get_search_form(); ?>
			<p>
				<a href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Return home', 'slateframe' ); ?></a>
			</p>
		</div>
	</section>
</main>
<?php
get_footer();
