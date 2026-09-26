<?php
/**
 * Title: Project outcomes
 * Slug: slateframe/project-outcomes
 * Categories: slateframe, slateframe-portfolio
 * Keywords: portfolio, project, metrics, outcomes
 * Description: A compact outcomes row for measurable results, status, or scope.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-project-outcomes","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-project-outcomes">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Outcomes', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:columns {"className":"is-style-slateframe-metrics"} --><div class="wp-block-columns is-style-slateframe-metrics">
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Measure', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Add a meaningful result.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Scope', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Describe reach or scale.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Status', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Record the current state.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
	</div><!-- /wp:columns -->

	<!-- wp:group {"className":"is-style-slateframe-project-brief"} -->
	<div class="wp-block-group is-style-slateframe-project-brief">
		<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Interpretation', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
		<!-- wp:paragraph --><p><?php echo esc_html_x( 'Give each number a baseline, time frame, or source so the result can be understood rather than displayed as an isolated metric.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
