<?php
/**
 * Title: Knowledge outline
 * Slug: slateframe/knowledge-outline
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, guide, tutorial, outline
 * Description: A guide opening with prerequisites, outcomes, and an ordered learning sequence.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-knowledge-outline","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-knowledge-outline">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
	<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Guide outline', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} -->
	<h2 class="wp-block-heading"><?php echo esc_html_x( 'Make prerequisites and outcomes visible before the lesson begins', 'Pattern content', 'slateframe' ); ?></h2>
	<!-- /wp:heading -->

	<!-- wp:columns {"className":"is-style-slateframe-ledger"} -->
	<div class="wp-block-columns is-style-slateframe-ledger">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"is-style-slateframe-key-facts"} -->
			<div class="wp-block-group is-style-slateframe-key-facts">
				<!-- wp:heading {"level":3} -->
				<h3 class="wp-block-heading"><?php echo esc_html_x( 'Before you start', 'Pattern content', 'slateframe' ); ?></h3>
				<!-- /wp:heading -->
				<!-- wp:list {"className":"is-style-slateframe-checklist"} -->
				<ul class="is-style-slateframe-checklist">
					<li><?php echo esc_html_x( 'Name the prerequisite knowledge or tools a reader really needs.', 'Pattern content', 'slateframe' ); ?></li>
					<li><?php echo esc_html_x( 'Remove assumptions that are not required for the first step.', 'Pattern content', 'slateframe' ); ?></li>
				</ul>
				<!-- /wp:list -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"is-style-slateframe-key-facts"} -->
			<div class="wp-block-group is-style-slateframe-key-facts">
				<!-- wp:heading {"level":3} -->
				<h3 class="wp-block-heading"><?php echo esc_html_x( 'By the end', 'Pattern content', 'slateframe' ); ?></h3>
				<!-- /wp:heading -->
				<!-- wp:list {"className":"is-style-slateframe-checklist"} -->
				<ul class="is-style-slateframe-checklist">
					<li><?php echo esc_html_x( 'State the thing a reader should be able to explain, build, or decide.', 'Pattern content', 'slateframe' ); ?></li>
					<li><?php echo esc_html_x( 'Keep outcomes specific enough to verify after reading.', 'Pattern content', 'slateframe' ); ?></li>
				</ul>
				<!-- /wp:list -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

	<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} -->
	<ol class="is-style-slateframe-steps">
		<li><?php echo esc_html_x( 'Introduce the core idea and define the terms that matter.', 'Pattern content', 'slateframe' ); ?></li>
		<li><?php echo esc_html_x( 'Work through a concrete example or task.', 'Pattern content', 'slateframe' ); ?></li>
		<li><?php echo esc_html_x( 'Connect the result to the next concept or decision.', 'Pattern content', 'slateframe' ); ?></li>
	</ol>
	<!-- /wp:list -->
</div>
<!-- /wp:group -->
