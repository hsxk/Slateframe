<?php
/**
 * Site footer.
 *
 * @package Slateframe
 */
$slateframe_footer_has_title       = slateframe_has_readable_label( get_bloginfo( 'name', 'display' ) );
$slateframe_footer_has_description = slateframe_has_readable_label( get_bloginfo( 'description', 'display' ) );
?>
<footer class="slateframe-site-footer">
	<?php if ( is_active_sidebar( 'footer-content' ) ) : ?>
		<div class="slateframe-shell slateframe-footer-content">
			<?php dynamic_sidebar( 'footer-content' ); ?>
		</div>
	<?php endif; ?>

	<div class="slateframe-shell slateframe-footer-inner">
		<div class="slateframe-footer-brand">
			<strong><bdi><?php
				if ( $slateframe_footer_has_title ) {
					bloginfo( 'name' );
				} else {
					esc_html_e( 'Home', 'slateframe' );
				}
				?></bdi></strong>
			<?php if ( $slateframe_footer_has_description ) : ?>
				<p><bdi><?php bloginfo( 'description' ); ?></bdi></p>
			<?php endif; ?>
		</div>

		<?php if ( has_nav_menu( 'footer' ) ) : ?>
			<nav class="slateframe-footer-nav" aria-label="<?php esc_attr_e( 'Footer navigation', 'slateframe' ); ?>">
				<?php
				wp_nav_menu(
					array(
						'theme_location' => 'footer',
						'container'      => false,
						'menu_class'     => 'slateframe-footer-menu',
						'fallback_cb'    => false,
						'depth'          => 0,
					)
				);
				?>
			</nav>
		<?php endif; ?>

		<p class="slateframe-copyright">
			<bdi>&copy; <?php echo esc_html( wp_date( 'Y' ) ); ?></bdi>
			<?php if ( $slateframe_footer_has_title ) : ?>
				<bdi><?php bloginfo( 'name' ); ?></bdi>
			<?php endif; ?>
		</p>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
