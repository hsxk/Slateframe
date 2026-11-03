<?php
/**
 * Title: Knowledge troubleshooting guide
 * Slug: slateframe/knowledge-troubleshooting-guide
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, troubleshooting, support, diagnosis
 * Description: A Core-only diagnostic guide with symptoms, checks, recovery steps and verification.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-knowledge-troubleshooting-guide","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-knowledge-troubleshooting-guide">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Troubleshooting', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Find the cause before changing the solution', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:paragraph {"className":"slateframe-pattern-intro"} --><p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Describe the observable problem, who it affects and how to reproduce it. Replace every prompt with verified instructions.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:group {"className":"is-style-slateframe-learning-callout"} --><div class="wp-block-group is-style-slateframe-learning-callout">
		<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Before you begin', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
		<!-- wp:paragraph --><p><?php echo esc_html_x( 'Record the current state and any data you need to preserve. Identify a safe way to undo changes.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	</div><!-- /wp:group -->
	<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Check the symptoms', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
	<!-- wp:list {"className":"is-style-slateframe-checklist"} --><ul class="wp-block-list is-style-slateframe-checklist"><li><?php echo esc_html_x( 'Confirm the exact message or visible behavior.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Compare with a known working example or expected result.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Identify the smallest repeatable condition.', 'Pattern content', 'slateframe' ); ?></li></ul><!-- /wp:list -->
	<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Try a reversible fix', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
	<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} --><ol class="wp-block-list is-style-slateframe-steps"><li><?php echo esc_html_x( 'Change one relevant setting or input at a time.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Repeat the original steps and record what changed.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'If the check fails, restore the previous state before trying another option.', 'Pattern content', 'slateframe' ); ?></li></ol><!-- /wp:list -->
	<!-- wp:group {"className":"is-style-slateframe-key-facts"} --><div class="wp-block-group is-style-slateframe-key-facts">
		<!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Verify and escalate', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading -->
		<!-- wp:paragraph --><p><?php echo esc_html_x( 'State the observable success criterion. If it is not met, explain what evidence to collect and where to seek further help.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	</div><!-- /wp:group -->
</div>
<!-- /wp:group -->
