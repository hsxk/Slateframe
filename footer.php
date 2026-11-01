<?php
/**
 * Site footer.
 *
 * @package Slateframe
 */
?>
<footer class="slateframe-site-footer">
	<?php if ( is_active_sidebar( 'footer-content' ) ) : ?>
		<div class="slateframe-shell slateframe-footer-content">
			<?php dynamic_sidebar( 'footer-content' ); ?>
		</div>
	<?php endif; ?>

	<div class="slateframe-shell slateframe-footer-inner">
		<div class="slateframe-footer-brand">
			<strong><bdi><?php bloginfo( 'name' ); ?></bdi></strong>
			<?php if ( get_bloginfo( 'description' ) ) : ?>
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
			<bdi>&copy; <?php echo esc_html( wp_date( 'Y' ) ); ?></bdi> <bdi><?php bloginfo( 'name' ); ?></bdi>
		</p>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
