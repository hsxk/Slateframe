<?php
/**
 * Title: Knowledge diagnostic decision log
 * Slug: slateframe/knowledge-troubleshooting
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, troubleshooting, decision, log
 * Description: A compact, editable diagnostic decision record for comparing hypotheses and outcomes.
 * Viewport Width: 960
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"className":"slateframe-pattern slateframe-knowledge-troubleshooting","layout":{"type":"constrained"}} -->
<div class="wp-block-group slateframe-pattern slateframe-knowledge-troubleshooting">
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Diagnostic decision log', 'Pattern heading', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Use this record alongside a troubleshooting guide to compare checks, evidence and decisions without losing earlier results.', 'Pattern introduction', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Question and baseline', 'Pattern heading', 'slateframe' ); ?></h3><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Record the question being investigated, the expected outcome and the observed starting state.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:table {"hasFixedLayout":false} -->
	<figure class="wp-block-table"><table><thead><tr><th scope="col"><?php echo esc_html_x( 'Hypothesis', 'Diagnostic table heading', 'slateframe' ); ?></th><th scope="col"><?php echo esc_html_x( 'Check and evidence', 'Diagnostic table heading', 'slateframe' ); ?></th><th scope="col"><?php echo esc_html_x( 'Result and decision', 'Diagnostic table heading', 'slateframe' ); ?></th></tr></thead><tbody><tr><td><?php echo esc_html_x( 'Possible cause to verify', 'Diagnostic table example', 'slateframe' ); ?></td><td><?php echo esc_html_x( 'Safe check and observable result', 'Diagnostic table example', 'slateframe' ); ?></td><td><?php echo esc_html_x( 'Supported, ruled out or needs more evidence', 'Diagnostic table example', 'slateframe' ); ?></td></tr><tr><td><?php echo esc_html_x( 'Alternative hypothesis', 'Diagnostic table example', 'slateframe' ); ?></td><td><?php echo esc_html_x( 'Independent check and dated observation', 'Diagnostic table example', 'slateframe' ); ?></td><td><?php echo esc_html_x( 'Decision, confidence and next check', 'Diagnostic table example', 'slateframe' ); ?></td></tr></tbody></table><figcaption class="wp-element-caption"><?php echo esc_html_x( 'Compare evidence before choosing a next action; replace these example rows with observations.', 'Diagnostic table caption', 'slateframe' ); ?></figcaption></figure>
	<!-- /wp:table -->
	<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Verification criteria', 'Pattern heading', 'slateframe' ); ?></h3><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Before changing anything, record a measurable success condition, a time to check it and a safe rollback condition. Compare the outcome against the original baseline.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Decision and follow-up', 'Pattern heading', 'slateframe' ); ?></h3><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Summarize the evidence, the next safe action, the person responsible and the condition for revisiting the decision. Remove secrets and personal data before sharing.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
