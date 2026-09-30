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
	<!-- wp:columns {"align":"wide","className":"is-style-slateframe-diptych"} -->
	<div class="wp-block-columns alignwide is-style-slateframe-diptych">
		<!-- wp:column -->
		<div class="wp-block-column"><!-- wp:group {"className":"slateframe-photo-placeholder","layout":{"type":"constrained"}} -->
		<div class="wp-block-group slateframe-photo-placeholder"><!-- wp:paragraph --><p><?php echo esc_html_x( 'Add a portrait or landscape image', 'Pattern placeholder', 'slateframe' ); ?></p><!-- /wp:paragraph --></div>
		<!-- /wp:group --></div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column"><!-- wp:group {"className":"slateframe-photo-placeholder","layout":{"type":"constrained"}} -->
		<div class="wp-block-group slateframe-photo-placeholder"><!-- wp:paragraph --><p><?php echo esc_html_x( 'Add a second image to complete the pair', 'Pattern placeholder', 'slateframe' ); ?></p><!-- /wp:paragraph --></div>
		<!-- /wp:group --></div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
</div>
<!-- /wp:group -->
