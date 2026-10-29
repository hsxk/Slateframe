<?php
/**
 * Title: Knowledge evidence trail
 * Slug: slateframe/knowledge-evidence-trail
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, evidence, source, verification, limitations
 * Description: A source-aware editorial claim, verification and limitations trail using native Core blocks.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-knowledge-evidence-trail","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-knowledge-evidence-trail">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Evidence trail', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'What supports this conclusion?', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} --><p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Separate the statement from its source and from the conditions under which it may not hold.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:columns {"className":"is-style-slateframe-ledger"} --><div class="wp-block-columns is-style-slateframe-ledger">
		<!-- wp:column --><div class="wp-block-column">
			<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Claim', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
			<!-- wp:paragraph --><p><?php echo esc_html_x( 'State one specific observation or conclusion. Distinguish measured facts from interpretation.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
		</div><!-- /wp:column -->
		<!-- wp:column --><div class="wp-block-column">
			<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Source and method', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
			<!-- wp:paragraph --><p><?php echo esc_html_x( 'Identify the original document, dataset, or observation and how the result can be checked. Add an ordinary Core link when available.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
		</div><!-- /wp:column -->
		<!-- wp:column --><div class="wp-block-column">
			<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Limits and uncertainty', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
			<!-- wp:paragraph --><p><?php echo esc_html_x( 'Name the time period, assumptions, missing data, or counterexample that could change the conclusion.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
		</div><!-- /wp:column -->
	</div><!-- /wp:columns -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Before publishing, verify the source date and replace these prompts with your own evidence. Recheck when the underlying information changes.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
