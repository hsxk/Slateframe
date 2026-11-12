<?php
/**
 * Title: Knowledge troubleshooting steps
 * Slug: slateframe/knowledge-troubleshooting
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, troubleshooting, diagnosis, steps
 * Description: A reusable, accessible diagnostic sequence with a reversible next step.
 * Viewport Width: 960
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"className":"slateframe-pattern slateframe-knowledge-troubleshooting","layout":{"type":"constrained"}} -->
<div class="wp-block-group slateframe-pattern slateframe-knowledge-troubleshooting">
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Troubleshoot the problem', 'Pattern heading', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Start with an observable symptom. Change one thing at a time and check the result before continuing.', 'Pattern introduction', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:list {"ordered":true} -->
	<ol class="wp-block-list">
		<!-- wp:list-item --><li><?php echo esc_html_x( 'Describe what happened and what you expected instead.', 'Troubleshooting step', 'slateframe' ); ?></li><!-- /wp:list-item -->
		<!-- wp:list-item --><li><?php echo esc_html_x( 'Check the simplest likely cause without changing unrelated settings.', 'Troubleshooting step', 'slateframe' ); ?></li><!-- /wp:list-item -->
		<!-- wp:list-item --><li><?php echo esc_html_x( 'Try one reversible change, then repeat the original check.', 'Troubleshooting step', 'slateframe' ); ?></li><!-- /wp:list-item -->
		<!-- wp:list-item --><li><?php echo esc_html_x( 'Record the outcome and restore the previous state if the change did not help.', 'Troubleshooting step', 'slateframe' ); ?></li><!-- /wp:list-item -->
	</ol>
	<!-- /wp:list -->
	<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'If the problem remains', 'Pattern heading', 'slateframe' ); ?></h3><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Note the steps you tried, the result of each check, and the information needed to investigate further.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
