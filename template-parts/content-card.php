<?php
/**
 * Card used by post lists, archives, author pages, and search.
 *
 * @package Slateframe
 */
$slateframe_card_image = slateframe_card_thumbnail_markup( get_the_ID() );
?>
<article <?php post_class( 'slateframe-card' ); ?>>
	<?php if ( '' !== $slateframe_card_image ) : ?>
		<a class="slateframe-card-media" href="<?php the_permalink(); ?>" aria-hidden="true" tabindex="-1">
			<?php echo $slateframe_card_image; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</a>
	<?php endif; ?>

	<div class="slateframe-card-body">
		<?php slateframe_entry_meta(); ?>
		<?php if ( is_sticky() && is_home() && ! is_paged() ) : ?>
			<p class="slateframe-pattern-kicker"><?php esc_html_e( 'Featured', 'slateframe' ); ?></p>
		<?php endif; ?>
		<h2 class="slateframe-card-title">
			<a href="<?php the_permalink(); ?>" rel="bookmark"><bdi><?php echo wp_kses_post( slateframe_get_display_title() ); ?></bdi></a>
		</h2>
		<div class="slateframe-card-excerpt">
			<?php the_excerpt(); ?>
		</div>
	</div>
</article>
