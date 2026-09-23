<?php
/**
 * Site footer.
 *
 * @package Slateframe
 */
?>
<footer class="slateframe-site-footer">
	<div class="slateframe-shell slateframe-footer-inner">
		<div class="slateframe-footer-brand">
			<strong><?php bloginfo( 'name' ); ?></strong>
			<?php if ( get_bloginfo( 'description' ) ) : ?>
				<p><?php bloginfo( 'description' ); ?></p>
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
						'depth'          => 1,
					)
				);
				?>
			</nav>
		<?php endif; ?>

		<p class="slateframe-copyright">
			&copy; <?php echo esc_html( wp_date( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?>
		</p>
	</div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
