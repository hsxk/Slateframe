<?php
/**
 * Title: Photography sequence
 * Slug: slateframe/photography-sequence
 * Categories: slateframe, slateframe-photography
 * Description: A natural-ratio three-image narrative using native Gallery and optional Core lightbox.
 * Keywords: photography, gallery, sequence, essay
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-photography-sequence","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-photography-sequence">
<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'A short visual sequence', 'Pattern heading', 'slateframe' ); ?></h2><!-- /wp:heading -->
<!-- wp:paragraph --><p><?php echo esc_html_x( 'Replace these sample images with three photographs. Add meaningful alternative text and captions where they help tell the story.', 'Pattern introduction', 'slateframe' ); ?></p><!-- /wp:paragraph -->
<!-- wp:gallery {"align":"wide","linkTo":"none","sizeSlug":"large","columns":2,"imageCrop":false,"className":"slateframe-gallery-sequence is-style-slateframe-photo-sequence"} -->
<figure class="wp-block-gallery alignwide has-nested-images columns-2 is-cropped-false slateframe-gallery-sequence is-style-slateframe-photo-sequence">
<!-- wp:image {"url":"<?php echo esc_url( get_theme_file_uri( '/assets/images/pattern-placeholder-landscape.svg' ) ); ?>","alt":"","sizeSlug":"large","linkDestination":"none","lightbox":{"enabled":true}} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_theme_file_uri( '/assets/images/pattern-placeholder-landscape.svg' ) ); ?>" alt=""/></figure>
<!-- /wp:image -->
<!-- wp:image {"url":"<?php echo esc_url( get_theme_file_uri( '/assets/images/pattern-placeholder-portrait.svg' ) ); ?>","alt":"","sizeSlug":"large","linkDestination":"none","lightbox":{"enabled":true}} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_theme_file_uri( '/assets/images/pattern-placeholder-portrait.svg' ) ); ?>" alt=""/></figure>
<!-- /wp:image -->
<!-- wp:image {"url":"<?php echo esc_url( get_theme_file_uri( '/assets/images/pattern-placeholder-square.svg' ) ); ?>","alt":"","sizeSlug":"large","linkDestination":"none","lightbox":{"enabled":true}} -->
<figure class="wp-block-image size-large"><img src="<?php echo esc_url( get_theme_file_uri( '/assets/images/pattern-placeholder-square.svg' ) ); ?>" alt=""/></figure>
<!-- /wp:image -->
</figure><!-- /wp:gallery -->
</div><!-- /wp:group -->
