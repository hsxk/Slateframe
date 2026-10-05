<?php
/**
 * Title: Photography diptych
 * Slug: slateframe/photography-diptych
 * Categories: slateframe, slateframe-photography
 * Keywords: photography, gallery, diptych, images
 * Description: A native two-column Gallery starter for pairing natural-ratio photographs.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-photography-diptych","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-photography-diptych">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Diptych', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:gallery {"align":"wide","columns":2,"linkTo":"none","sizeSlug":"large","imageCrop":false,"className":"is-style-slateframe-diptych"} -->
	<figure class="wp-block-gallery alignwide has-nested-images columns-2 is-style-slateframe-diptych">
		<!-- wp:image {"sizeSlug":"large","linkDestination":"none","lightbox":{"enabled":true}} /-->
		<!-- wp:image {"sizeSlug":"large","linkDestination":"none","lightbox":{"enabled":true}} /-->
	</figure>
	<!-- /wp:gallery -->
</div>
<!-- /wp:group -->
