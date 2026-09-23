<?php
/**
 * Title: Knowledge checklist
 * Slug: slateframe/knowledge-checklist
 * Categories: slateframe-knowledge
 * Description: A compact lesson checkpoint with prerequisites, practice steps, and a completion prompt.
 * Keywords: learning, checklist, lesson, knowledge
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-knowledge-checklist","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-knowledge-checklist">
<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Before you move on', 'Pattern heading', 'slateframe' ); ?></h2><!-- /wp:heading -->
<!-- wp:paragraph --><p><?php echo esc_html_x( 'Use this checkpoint to turn a lesson into something a reader can verify and practise.', 'Pattern introduction', 'slateframe' ); ?></p><!-- /wp:paragraph -->
<!-- wp:columns {"className":"slateframe-learning-checkpoint"} --><div class="wp-block-columns slateframe-learning-checkpoint">
<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Understand', 'Learning checkpoint heading', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:list --><ul class="wp-block-list"><li><?php echo esc_html_x( 'Explain the central idea in your own words.', 'Learning checklist item', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Identify the assumptions and limits that matter.', 'Learning checklist item', 'slateframe' ); ?></li></ul><!-- /wp:list --></div><!-- /wp:column -->
<!-- wp:column --><div class="wp-block-column"><!-- wp:heading {"level":3} --><h3 class="wp-block-heading"><?php echo esc_html_x( 'Practise', 'Learning checkpoint heading', 'slateframe' ); ?></h3><!-- /wp:heading --><!-- wp:list --><ul class="wp-block-list"><li><?php echo esc_html_x( 'Apply the idea to one concrete example.', 'Learning checklist item', 'slateframe' ); ?></li><li><?php echo esc_html_x( 'Record one question to revisit later.', 'Learning checklist item', 'slateframe' ); ?></li></ul><!-- /wp:list --></div><!-- /wp:column -->
</div><!-- /wp:columns -->
<!-- wp:quote --><blockquote class="wp-block-quote"><p><?php echo esc_html_x( 'A useful checkpoint should reveal what the reader can do now, not only what they have read.', 'Learning checkpoint quote', 'slateframe' ); ?></p></blockquote><!-- /wp:quote -->
</div><!-- /wp:group -->
