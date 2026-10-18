<?php
/**
 * Title: Knowledge questions and answers
 * Slug: slateframe/knowledge-faq
 * Categories: slateframe, slateframe-knowledge
 * Keywords: knowledge, faq, questions, answers, reference
 * Description: Three editable questions with native Core Details disclosure and an evidence reminder.
 * Viewport Width: 960
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"className":"slateframe-pattern slateframe-knowledge-faq","layout":{"type":"constrained"}} -->
<div class="wp-block-group slateframe-pattern slateframe-knowledge-faq">
	<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} --><p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Questions and answers', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:heading {"level":2} --><h2 class="wp-block-heading"><?php echo esc_html_x( 'Questions worth answering', 'Pattern content', 'slateframe' ); ?></h2><!-- /wp:heading -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Start with the questions readers ask before they can apply the idea.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	<!-- wp:details {"className":"is-style-slateframe-disclosure"} -->
	<details class="wp-block-details is-style-slateframe-disclosure"><summary><?php echo esc_html_x( 'What does this mean?', 'Pattern question', 'slateframe' ); ?></summary>
		<!-- wp:paragraph --><p><?php echo esc_html_x( 'Give a concise definition in everyday language. Explain any term the reader needs to understand first.', 'Pattern answer', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	</details><!-- /wp:details -->
	<!-- wp:details -->
	<details class="wp-block-details"><summary><?php echo esc_html_x( 'When is it useful?', 'Pattern question', 'slateframe' ); ?></summary>
		<!-- wp:paragraph --><p><?php echo esc_html_x( 'Describe a situation where this idea helps, including the limits of the example.', 'Pattern answer', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	</details><!-- /wp:details -->
	<!-- wp:details -->
	<details class="wp-block-details"><summary><?php echo esc_html_x( 'How can I check the result?', 'Pattern question', 'slateframe' ); ?></summary>
		<!-- wp:paragraph --><p><?php echo esc_html_x( 'Name an observable result and what to investigate if the result differs.', 'Pattern answer', 'slateframe' ); ?></p><!-- /wp:paragraph -->
	</details><!-- /wp:details -->
	<!-- wp:paragraph --><p><?php echo esc_html_x( 'Keep answers specific, update them when the underlying information changes, and add sources where readers need to verify a claim.', 'Pattern content', 'slateframe' ); ?></p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
