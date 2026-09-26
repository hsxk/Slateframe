<?php
/**
 * Site header.
 *
 * @package Slateframe
 */
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="color-scheme" content="light dark">
	<?php
	wp_enqueue_style(
		'slateframe-navigation',
		get_template_directory_uri() . '/assets/css/navigation.css',
		array( 'slateframe-style' ),
		wp_get_theme()->get( 'Version' )
	);
	wp_head();
	?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="screen-reader-text skip-link" href="#main-content"><?php esc_html_e( 'Skip to content', 'slateframe' ); ?></a>

<header class="slateframe-site-header" data-site-header>
	<div class="slateframe-shell slateframe-header-inner">
		<a class="slateframe-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" rel="home">
			<?php slateframe_brand_mark(); ?>
			<span class="slateframe-brand-copy">
				<span class="slateframe-brand-title"><?php bloginfo( 'name' ); ?></span>
				<?php if ( get_bloginfo( 'description' ) ) : ?>
					<span class="slateframe-brand-tagline"><?php bloginfo( 'description' ); ?></span>
				<?php endif; ?>
			</span>
		</a>

		<div class="slateframe-header-spacer"></div>

		<nav id="slateframe-navigation" class="slateframe-primary-nav" aria-label="<?php esc_attr_e( 'Primary navigation', 'slateframe' ); ?>" data-primary-nav>
			<?php
			wp_nav_menu(
				array(
					'theme_location' => 'primary',
					'container'      => false,
					'fallback_cb'    => 'slateframe_menu_fallback',
					'depth'          => 2,
				)
			);
			slateframe_language_switcher();
			?>
		</nav>

		<button class="slateframe-color-toggle" type="button" aria-pressed="false" data-color-toggle>
			<span class="screen-reader-text"><?php esc_html_e( 'Dark mode', 'slateframe' ); ?></span>
			<svg class="slateframe-color-icon slateframe-color-icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
				<circle cx="12" cy="12" r="3.5" fill="currentColor"></circle>
				<path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"></path>
			</svg>
			<svg class="slateframe-color-icon slateframe-color-icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
				<path d="M19.2 15.4A7.8 7.8 0 0 1 8.6 4.8 7.6 7.6 0 1 0 19.2 15.4Z" fill="currentColor"></path>
			</svg>
		</button>

		<button class="slateframe-menu-toggle" type="button" aria-expanded="false" aria-controls="slateframe-navigation" data-menu-toggle>
			<span class="screen-reader-text"><?php esc_html_e( 'Toggle navigation', 'slateframe' ); ?></span>
			<span aria-hidden="true">☰</span>
		</button>
	</div>
</header>
