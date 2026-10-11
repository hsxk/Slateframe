<?php
/**
 * Title: Editorial pathways
 * Slug: slateframe/editorial-pathways
 * Categories: slateframe, slateframe-knowledge, slateframe-portfolio
 * Keywords: homepage, navigation, editorial, discovery
 * Description: A calm three-direction editorial overview made from native Core blocks.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-editorial-pathways","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-editorial-pathways">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
	<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Find a direction', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:heading {"level":2} -->
	<h2 class="wp-block-heading"><?php echo esc_html_x( 'Start with what you came to explore', 'Pattern content', 'slateframe' ); ?></h2>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} -->
	<p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Offer a few clear ways into your work. Keep the descriptions short, then add your own links when the destinations are ready.', 'Pattern content', 'slateframe' ); ?></p>
	<!-- /wp:paragraph -->

	<!-- wp:columns {"className":"is-style-slateframe-ledger"} -->
	<div class="wp-block-columns is-style-slateframe-ledger">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( '01 / Read', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":3} -->
			<h3 class="wp-block-heading"><?php echo esc_html_x( 'Ideas and explanations', 'Pattern content', 'slateframe' ); ?></h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Guide readers toward articles, notes, or lessons that develop an idea step by step.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( '02 / Make', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":3} -->
			<h3 class="wp-block-heading"><?php echo esc_html_x( 'Projects and outcomes', 'Pattern content', 'slateframe' ); ?></h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Introduce selected work through the problem, the approach, and what changed.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( '03 / Observe', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
			<!-- wp:heading {"level":3} -->
			<h3 class="wp-block-heading"><?php echo esc_html_x( 'Images and field notes', 'Pattern content', 'slateframe' ); ?></h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Give photographs, sketches, or visual research a quiet entry point of their own.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
</div>
<!-- /wp:group -->
