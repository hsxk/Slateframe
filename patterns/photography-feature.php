<?php
/**
 * Title: Photography feature
 * Slug: slateframe/photography-feature
 * Categories: slateframe, slateframe-photography
 * Keywords: photography, feature, image, caption
 * Description: A single-image photographic feature with restrained context and a natural-ratio presentation.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-photography-feature","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-photography-feature">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
	<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Photography feature', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} -->
	<h2 class="wp-block-heading"><?php echo esc_html_x( 'Give one photograph room to lead', 'Pattern content', 'slateframe' ); ?></h2>
	<!-- /wp:heading -->
	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} -->
	<p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Use a short introduction when the frame needs context, then keep the photograph at its natural proportion.', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->
	<!-- wp:image {"sizeSlug":"large","linkDestination":"none","className":"is-style-slateframe-photo-feature"} -->
	<figure class="wp-block-image size-large is-style-slateframe-photo-feature"></figure>
	<!-- /wp:image -->
</div>
<!-- /wp:group -->
