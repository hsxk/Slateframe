<?php
/**
 * Title: Portfolio case study
 * Slug: slateframe/portfolio-case-study
 * Categories: slateframe, slateframe-portfolio
 * Keywords: portfolio, case study, project, outcome
 * Description: A portable project story covering the brief, approach, evidence and outcome using only WordPress Core blocks.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-portfolio-case-study","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-portfolio-case-study">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Case study', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Explain the work, not just the finished result', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} --><p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Replace this introduction with the problem, audience and outcome in two or three sentences.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:columns {"className":"is-style-slateframe-ledger"} -->
	<div class="wp-block-columns is-style-slateframe-ledger">
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Brief', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Who needed this work, and what constraint or unmet need made it necessary?', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Approach', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Describe the important trade-off and the reasoning behind your chosen direction.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
		<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Outcome', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'State the observed result, its limitations and what still needs verification.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
	<!-- wp:group {"className":"is-style-slateframe-project-brief"} --><div class="wp-block-group is-style-slateframe-project-brief">
		<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Evidence and next iteration', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
		<!-- wp:paragraph --><p><?php echo esc_html_x( 'Add an accessible screenshot, a measurable result or a source that supports the outcome. Explain what you would test or change next.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	</div><!-- /wp:group -->
</div>
<!-- /wp:group -->
