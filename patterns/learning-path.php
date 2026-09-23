<?php
/**
 * Title: Learning path
 * Slug: slateframe/learning-path
 * Categories: slateframe, slateframe-knowledge
 * Keywords: learning, guide, course, steps
 * Description: A compact three-stage learning path that keeps prerequisites and progression visible.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-learning-path-pattern is-style-slateframe-learning-path","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-learning-path-pattern is-style-slateframe-learning-path">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
	<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Learning path', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:heading {"level":2} -->
	<h2 class="wp-block-heading"><?php echo esc_html_x( 'Build understanding in a deliberate order', 'Pattern content', 'slateframe' ); ?></h2>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} -->
	<p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Use each stage for one meaningful jump in understanding. Replace these examples with the prerequisites and next steps that fit your subject.', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:columns -->
	<div class="wp-block-columns">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"slateframe-learning-step"} -->
			<div class="wp-block-group slateframe-learning-step">
				<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
				<p class="slateframe-pattern-kicker"><?php echo esc_html_x( '01 · Foundation', 'Pattern content', 'slateframe' ); ?></p>
				<!-- /wp:paragraph -->
				<!-- wp:heading {"level":3} -->
				<h3 class="wp-block-heading"><?php echo esc_html_x( 'Learn the essential idea', 'Pattern content', 'slateframe' ); ?></h3>
				<!-- /wp:heading -->
				<!-- wp:paragraph -->
				<p><?php echo esc_html_x( 'Define the concept and the minimum context a reader needs before moving forward.', 'Pattern content', 'slateframe' ); ?></p>
				<!-- /wp:paragraph -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"slateframe-learning-step"} -->
			<div class="wp-block-group slateframe-learning-step">
				<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
				<p class="slateframe-pattern-kicker"><?php echo esc_html_x( '02 · Practice', 'Pattern content', 'slateframe' ); ?></p>
				<!-- /wp:paragraph -->
				<!-- wp:heading {"level":3} -->
				<h3 class="wp-block-heading"><?php echo esc_html_x( 'Apply it to a concrete task', 'Pattern content', 'slateframe' ); ?></h3>
				<!-- /wp:heading -->
				<!-- wp:paragraph -->
				<p><?php echo esc_html_x( 'Turn explanation into an action, worked example, exercise, or decision the reader can make.', 'Pattern content', 'slateframe' ); ?></p>
				<!-- /wp:paragraph -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:group {"className":"slateframe-learning-step"} -->
			<div class="wp-block-group slateframe-learning-step">
				<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
				<p class="slateframe-pattern-kicker"><?php echo esc_html_x( '03 · Extend', 'Pattern content', 'slateframe' ); ?></p>
				<!-- /wp:paragraph -->
				<!-- wp:heading {"level":3} -->
				<h3 class="wp-block-heading"><?php echo esc_html_x( 'Connect the next idea', 'Pattern content', 'slateframe' ); ?></h3>
				<!-- /wp:heading -->
				<!-- wp:paragraph -->
				<p><?php echo esc_html_x( 'Point to the next concept and explain why it is the natural continuation rather than a random related link.', 'Pattern content', 'slateframe' ); ?></p>
				<!-- /wp:paragraph -->
			</div>
			<!-- /wp:group -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
</div>
<!-- /wp:group -->
