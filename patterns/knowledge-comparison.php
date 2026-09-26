<?php
/**
 * Title: Knowledge comparison
 * Slug: slateframe/knowledge-comparison
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, comparison, decision, tradeoffs
 * Description: A two-option editorial comparison with explicit fit, limits, and a decision rule.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-knowledge-comparison","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-knowledge-comparison">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Comparison', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Compare choices by fit and trade-off, not by feature count', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:columns {"className":"is-style-slateframe-ledger"} --><div class="wp-block-columns is-style-slateframe-ledger">
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Option A', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Best when the first constraint matters most. Explain the cost or limitation that comes with that strength.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --><!-- wp:list {"className":"is-style-slateframe-checklist"} --><ul class="wp-block-list is-style-slateframe-checklist"><li><?php echo esc_html_x( 'Where it fits well', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'What to verify before choosing it', 'Pattern content', 'slateframe' ); ?></li></ul><!-- /wp:list --></div><!-- /wp:column -->
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Option B', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Best when a different constraint dominates. Describe the trade-off using the same dimensions as Option A.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --><!-- wp:list {"className":"is-style-slateframe-checklist"} --><ul class="wp-block-list is-style-slateframe-checklist"><li><?php echo esc_html_x( 'Where it fits well', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'What to verify before choosing it', 'Pattern content', 'slateframe' ); ?></li></ul><!-- /wp:list --></div><!-- /wp:column -->
	</div><!-- /wp:columns -->
	<!-- wp:group {"className":"is-style-slateframe-learning-callout"} --><div class="wp-block-group is-style-slateframe-learning-callout"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Decision rule', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'End with the condition that should change the choice. This keeps the comparison useful when the reader has different priorities.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:group -->
</div>
<!-- /wp:group -->
