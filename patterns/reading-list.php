<?php
/**
 * Title: Curated reading list
 * Slug: slateframe/reading-list
 * Categories: slateframe
 * Description: A simple editorial reading list with an introduction and links.
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"className":"slateframe-pattern slateframe-reading-list","layout":{"type":"constrained"}} -->
<div class="wp-block-group slateframe-pattern slateframe-reading-list"><!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
<p class="slateframe-pattern-kicker"><?php esc_html_e( 'Further reading', 'slateframe' ); ?></p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading"><?php esc_html_e( 'Continue exploring', 'slateframe' ); ?></h2>
<!-- /wp:heading -->

<!-- wp:list -->
<ul class="wp-block-list"><!-- wp:list-item -->
<li><?php esc_html_e( 'Replace this item with a useful article, reference, or related page.', 'slateframe' ); ?></li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><?php esc_html_e( 'Add another resource without turning the section into a card grid.', 'slateframe' ); ?></li>
<!-- /wp:list-item -->

<!-- wp:list-item -->
<li><?php esc_html_e( 'Keep descriptions short so the links remain easy to scan.', 'slateframe' ); ?></li>
<!-- /wp:list-item --></ul>
<!-- /wp:list --></div>
<!-- /wp:group -->
