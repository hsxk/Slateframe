<?php
/**
 * Title: Photography sequence
 * Slug: slateframe/photography-sequence
 * Categories: slateframe-photography
 * Description: An image-led sequence for a short photographic story with an accessible introduction and captions.
 * Keywords: photography, gallery, sequence, essay
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-photography-sequence","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-photography-sequence">
<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'A short visual sequence', 'Pattern heading', 'slateframe' ); ?></h2><!-- /wp:heading -->
<!-- wp:paragraph --><p><?php echo esc_html_x( 'Add three to five images and captions to tell one deliberate visual story.', 'Pattern introduction', 'slateframe' ); ?></p><!-- /wp:paragraph -->
<!-- wp:gallery {"linkTo":"none","sizeSlug":"large","columns":2,"imageCrop":false,"className":"slateframe-gallery-sequence is-style-slateframe-photo-sequence"} -->
<figure class="wp-block-gallery has-nested-images columns-2 is-cropped-false slateframe-gallery-sequence is-style-slateframe-photo-sequence">
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} /-->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} /-->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} /-->
</figure><!-- /wp:gallery -->
</div><!-- /wp:group -->
