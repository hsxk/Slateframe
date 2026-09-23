<?php
/**
 * Title: Portfolio index
 * Slug: slateframe/portfolio-index
 * Categories: slateframe, slateframe-portfolio
 * Keywords: portfolio, projects, index
 * Description: A typography-led portfolio overview with editable project summaries.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-portfolio-index","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-portfolio-index">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
	<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Selected work', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} -->
	<h2 class="wp-block-heading"><?php echo esc_html_x( 'Projects with context, not a wall of cards', 'Pattern content', 'slateframe' ); ?></h2>
	<!-- /wp:heading -->
	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} -->
	<p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Use each row for one project: what it is, why it mattered, your role, and where a reader can continue.', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:columns {"className":"is-style-slateframe-ledger"} -->
	<div class="wp-block-columns is-style-slateframe-ledger">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":3} -->
			<h3 class="wp-block-heading"><?php echo esc_html_x( 'Project one', 'Pattern content', 'slateframe' ); ?></h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'State the problem, audience, or purpose in one clear sentence.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Role / scope', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Summarize the responsibility, discipline, or part of the system you owned.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Outcome', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Describe an observable result, lesson, or current status.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

	<!-- wp:columns {"className":"is-style-slateframe-ledger"} -->
	<div class="wp-block-columns is-style-slateframe-ledger">
		<!-- wp:column -->
		<div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Project two', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --></div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column"><!-- wp:paragraph --><p><?php echo esc_html_x( 'Add another project without changing the overall information rhythm.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div>
		<!-- /wp:column -->
		<!-- wp:column -->
		<div class="wp-block-column"><!-- wp:paragraph --><p><?php echo esc_html_x( 'Link to a case study, repository, article, or live result when useful.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
</div>
<!-- /wp:group -->
