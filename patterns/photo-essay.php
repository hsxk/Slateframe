<?php
/**
 * Title: Photo essay
 * Slug: slateframe/photo-essay
 * Categories: slateframe, slateframe-photography, featured
 * Keywords: photography, gallery, editorial
 * Description: A restrained wide layout for a photographic story or visual sequence.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-photo-essay","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-photo-essay">
	<!-- wp:columns {"verticalAlignment":"bottom"} -->
	<div class="wp-block-columns are-vertically-aligned-bottom">
		<!-- wp:column {"verticalAlignment":"bottom","width":"38%"} -->
		<div class="wp-block-column is-vertically-aligned-bottom" style="flex-basis:38%">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Photo essay', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->

			<!-- wp:heading {"level":2} -->
			<h2 class="wp-block-heading"><?php echo esc_html_x( 'Let the sequence carry the story', 'Pattern content', 'slateframe' ); ?></h2>
			<!-- /wp:heading -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"bottom"} -->
		<div class="wp-block-column is-vertically-aligned-bottom">
			<!-- wp:paragraph {"className":"slateframe-pattern-intro"} -->
			<p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Introduce the place, moment, or idea briefly, then allow the images to take over.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

	<!-- wp:gallery {"align":"wide","linkTo":"none","sizeSlug":"large","className":"is-style-slateframe-photo-sequence"} -->
	<figure class="wp-block-gallery alignwide has-nested-images columns-default is-cropped is-style-slateframe-photo-sequence"></figure>
	<!-- /wp:gallery -->

	<!-- wp:paragraph {"className":"slateframe-pattern-caption"} -->
	<p class="slateframe-pattern-caption"><?php echo esc_html_x( 'Add a short closing note, location, date, or technical context only when it helps the photographs.', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
