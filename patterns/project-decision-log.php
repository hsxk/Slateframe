<?php
/**
 * Title: Project decision log
 * Slug: slateframe/project-decision-log
 * Categories: slateframe, slateframe-portfolio
 * Keywords: portfolio, project, decisions, process
 * Description: An editorial decision trail for explaining constraints, choices, trade-offs, and evidence without a custom project type.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-project-decision-log","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-project-decision-log">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Decision trail', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Show how the project moved from constraint to decision', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} --><p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Use this sequence when the reasoning is as important as the final artifact. Keep each step focused on one consequential choice.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} -->
	<ol class="wp-block-list is-style-slateframe-steps"><li><?php echo esc_html_x( 'Constraint — describe the user need, technical limit, budget, time pressure, or other fact that shaped the decision.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Decision — state what you chose and the meaningful alternative you did not choose.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Consequence — explain what became easier, harder, faster, safer, clearer, or more maintainable afterward.', 'Pattern content', 'slateframe' ); ?></li></ol>
	<!-- /wp:list -->
	<!-- wp:group {"className":"is-style-slateframe-project-brief"} --><div class="wp-block-group is-style-slateframe-project-brief"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Evidence to attach', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Add the benchmark, screenshot, research note, issue, experiment, or shipped result that lets a reader inspect the decision instead of taking it on trust.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:group -->
</div>
<!-- /wp:group -->
