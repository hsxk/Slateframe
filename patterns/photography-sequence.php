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
<!-- wp:paragraph --><p><?php echo esc_html_x( 'Use a small, deliberate set of images to tell one story. Replace every image and caption with your own work.', 'Pattern introduction', 'slateframe' ); ?></p><!-- /wp:paragraph -->
<!-- wp:gallery {"linkTo":"none","sizeSlug":"large","columns":2,"imageCrop":false,"className":"slateframe-gallery-sequence"} -->
<figure class="wp-block-gallery has-nested-images columns-2 is-cropped-false slateframe-gallery-sequence">
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} --><figure class="wp-block-image size-large"><img src="https://s.w.org/images/core/5.8/architecture-01.jpg" alt=""/><figcaption class="wp-element-caption"><?php echo esc_html_x( 'Opening frame — establish place, scale, or atmosphere.', 'Example image caption', 'slateframe' ); ?></figcaption></figure><!-- /wp:image -->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} --><figure class="wp-block-image size-large"><img src="https://s.w.org/images/core/5.8/architecture-02.jpg" alt=""/><figcaption class="wp-element-caption"><?php echo esc_html_x( 'Detail frame — move closer and reveal texture or context.', 'Example image caption', 'slateframe' ); ?></figcaption></figure><!-- /wp:image -->
<!-- wp:image {"sizeSlug":"large","linkDestination":"none"} --><figure class="wp-block-image size-large"><img src="https://s.w.org/images/core/5.8/architecture-03.jpg" alt=""/><figcaption class="wp-element-caption"><?php echo esc_html_x( 'Closing frame — leave the sequence with a distinct final beat.', 'Example image caption', 'slateframe' ); ?></figcaption></figure><!-- /wp:image -->
</figure><!-- /wp:gallery -->
</div><!-- /wp:group -->
