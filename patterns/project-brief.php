<?php
/**
 * Title: Project brief
 * Slug: slateframe/project-brief
 * Categories: slateframe, slateframe-portfolio
 * Keywords: portfolio, project, brief, outcome
 * Description: A compact project brief for context, role, constraints, and outcome.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-project-brief-pattern","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-project-brief-pattern">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Project brief', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Explain the work before showing the result', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:group {"className":"is-style-slateframe-project-brief"} -->
	<div class="wp-block-group is-style-slateframe-project-brief">
		<!-- wp:columns --><div class="wp-block-columns">
			<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Context', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Describe the problem, audience, or constraint that shaped the project.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
			<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Role', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'State the responsibilities or decisions you owned.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
			<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Outcome', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Record an observable result, lesson, or current status.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
		</div><!-- /wp:columns -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
