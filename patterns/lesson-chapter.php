<?php
/**
 * Title: Lesson chapter
 * Slug: slateframe/lesson-chapter
 * Categories: slateframe, slateframe-knowledge
 * Keywords: lesson, guide, learning, chapter
 * Description: A lesson chapter with an objective, practice steps, and a continuation callout.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-lesson-chapter","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-lesson-chapter">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Lesson chapter', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Move from explanation to practice', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:group {"className":"is-style-slateframe-learning-callout"} --><div class="wp-block-group is-style-slateframe-learning-callout"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Objective', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Write one observable thing the reader should understand or be able to do after this chapter.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:group -->
	<!-- wp:list {"ordered":true,"className":"is-style-slateframe-steps"} --><ol class="is-style-slateframe-steps"><li><?php echo esc_html_x( 'Explain the smallest useful concept.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Apply it to a concrete example or task.', 'Pattern content', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Check the result and connect it to the next concept.', 'Pattern content', 'slateframe' ); ?></li></ol><!-- /wp:list -->
	<!-- wp:group {"className":"is-style-slateframe-learning-callout"} --><div class="wp-block-group is-style-slateframe-learning-callout"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Continue', 'Pattern content', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:paragraph --><p><?php echo esc_html_x( 'Point to the next useful chapter, exercise, or reference instead of ending with a dead stop.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph --></div><!-- /wp:group -->
</div>
<!-- /wp:group -->
