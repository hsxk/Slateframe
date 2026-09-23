<?php
/**
 * Title: Knowledge definition
 * Slug: slateframe/knowledge-definition
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, definition, glossary, term
 * Description: A focused definition callout for a term, concept, or formula.
 * Viewport Width: 960
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"className":"slateframe-pattern slateframe-knowledge-definition is-style-slateframe-definition","layout":{"type":"constrained"}} -->
<div class="wp-block-group slateframe-pattern slateframe-knowledge-definition is-style-slateframe-definition">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Definition', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Term or concept', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Explain the term in plain language, then connect it to the surrounding lesson or reference.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
