<?php
/**
 * Title: Knowledge procedure
 * Slug: slateframe/knowledge-procedure
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, tutorial, procedure, steps
 * Description: A practical procedure with a goal, ordered actions, verification, and a recovery hint.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-knowledge-procedure","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-knowledge-procedure">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Procedure', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Turn an explanation into a repeatable task', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:group {"className":"is-style-slateframe-learning-callout"} --><div class="wp-block-group is-style-slateframe-learning-callout"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Goal', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Describe the observable end state before listing the actions that lead there.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:group -->
	<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} --><ol class="wp-block-list is-style-slateframe-steps"><li><?php echo esc_html_x( 'Prepare the minimum input, tool, or context required for the task.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Perform the action and explain the signal the reader should pay attention to.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Verify the result before moving to the next dependent task.', 'Pattern content', 'slateframe' ); ?></li></ol><!-- /wp:list -->
	<!-- wp:group {"className":"is-style-slateframe-key-facts"} --><div class="wp-block-group is-style-slateframe-key-facts"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'If the result differs', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:list {"className":"is-style-slateframe-checklist"} --><ul class="wp-block-list is-style-slateframe-checklist"><li><?php echo esc_html_x( 'Check the earliest step whose expected signal is missing.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Record what changed before repeating the procedure.', 'Pattern content', 'slateframe' ); ?></li></ul><!-- /wp:list --></div><!-- /wp:group -->
</div>
<!-- /wp:group -->
