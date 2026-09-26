<?php
/**
 * Title: Photography contact sheet
 * Slug: slateframe/photography-contact-sheet
 * Categories: slateframe, slateframe-photography
 * Keywords: photography, gallery, contact sheet
 * Description: A compact image-first sequence for mixed portrait and landscape photographs.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-photo-contact-sheet","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-photo-contact-sheet">
	<!-- wp:columns {"verticalAlignment":"bottom"} -->
	<div class="wp-block-columns are-vertically-aligned-bottom">
		<!-- wp:column {"verticalAlignment":"bottom","width":"34%"} -->
		<div class="wp-block-column is-vertically-aligned-bottom" style="flex-basis:34%">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Contact sheet', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":2} -->
			<h2 class="wp-block-heading"><?php echo esc_html_x( 'A sequence without forced cropping', 'Pattern content', 'slateframe' ); ?></h2>
			<!-- /wp:heading -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column {"verticalAlignment":"bottom"} -->
		<div class="wp-block-column is-vertically-aligned-bottom">
			<!-- wp:paragraph {"className":"slateframe-pattern-intro"} -->
			<p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Use this layout when portrait and landscape photographs should keep their natural proportions and read as one visual set.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

	<!-- wp:gallery {"align":"wide","linkTo":"none","sizeSlug":"large","imageCrop":false,"className":"is-style-slateframe-contact-sheet"} -->
	<figure class="wp-block-gallery alignwide has-nested-images columns-default is-cropped-false is-style-slateframe-contact-sheet"></figure>
	<!-- /wp:gallery -->

	<!-- wp:paragraph {"className":"slateframe-pattern-caption"} -->
	<p class="slateframe-pattern-caption"><?php echo esc_html_x( 'Add a location, date, process note, or short caption only when it helps the sequence.', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
