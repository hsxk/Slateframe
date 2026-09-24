<?php
/**
 * Title: Photography diptych
 * Slug: slateframe/photography-diptych
 * Categories: slateframe, slateframe-photography
 * Keywords: photography, gallery, diptych, images
 * Description: Two natural-ratio photographs presented as a responsive visual pair.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-photography-diptych","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-photography-diptych">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Diptych', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:gallery {"align":"wide","linkTo":"none","className":"is-style-slateframe-diptych"} -->
	<figure class="wp-block-gallery alignwide has-nested-images columns-2 is-style-slateframe-diptych">
		<!-- wp:image {"sizeSlug":"large","linkDestination":"none","lightbox":{"enabled":true}} --><figure class="wp-block-image size-large"></figure><!-- /wp:image -->
		<!-- wp:image {"sizeSlug":"large","linkDestination":"none","lightbox":{"enabled":true}} --><figure class="wp-block-image size-large"></figure><!-- /wp:image -->
	</figure>
	<!-- /wp:gallery -->
</div>
<!-- /wp:group -->
