<?php
/**
 * Card used by post lists, archives, author pages, and search.
 *
 * @package Slateframe
 */
?>
<article <?php post_class( 'slateframe-card' ); ?>>
	<?php if ( has_post_thumbnail() ) : ?>
		<a class="slateframe-card-media" href="<?php the_permalink(); ?>" aria-hidden="true" tabindex="-1">
			<?php
			the_post_thumbnail(
				'large',
				array(
					'loading'  => 'lazy',
					'decoding' => 'async',
				)
			);
			?>
		</a>
	<?php endif; ?>

	<div class="slateframe-card-body">
		<?php slateframe_entry_meta(); ?>
		<h2 class="slateframe-card-title">
			<a href="<?php the_permalink(); ?>" rel="bookmark"><?php the_title(); ?></a>
		</h2>
		<div class="slateframe-card-excerpt">
			<?php the_excerpt(); ?>
		</div>
	</div>
</article>
