<?php
/**
 * Title: Project case study
 * Slug: slateframe/project-case-study
 * Categories: slateframe, slateframe-portfolio
 * Keywords: portfolio, project, case study
 * Description: A portable project overview with context, responsibilities, approach, and outcome.
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:group {"align":"wide","className":"slateframe-pattern slateframe-project-case-study is-style-slateframe-project-feature","layout":{"type":"constrained"}} -->
<div class="wp-block-group alignwide slateframe-pattern slateframe-project-case-study is-style-slateframe-project-feature">
	<!-- wp:columns {"verticalAlignment":"top"} -->
	<div class="wp-block-columns are-vertically-aligned-top">
		<!-- wp:column {"verticalAlignment":"top","width":"62%"} -->
		<div class="wp-block-column is-vertically-aligned-top" style="flex-basis:62%">
			<!-- wp:paragraph {"className":"slateframe-pattern-kicker"} -->
			<p class="slateframe-pattern-kicker"><?php echo esc_html_x( 'Case study', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->

			<!-- wp:heading {"level":2} -->
			<h2 class="wp-block-heading"><?php echo esc_html_x( 'Project title and the result that mattered', 'Pattern content', 'slateframe' ); ?></h2>
			<!-- /wp:heading -->

			<!-- wp:paragraph {"className":"slateframe-pattern-intro"} -->
			<p class="slateframe-pattern-intro"><?php echo esc_html_x( 'Explain what changed because this project existed. Keep the opening concrete enough that a reader can understand the work before reading the details.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column {"verticalAlignment":"top"} -->
		<div class="wp-block-column is-vertically-aligned-top">
			<!-- wp:list {"className":"slateframe-project-meta"} -->
			<ul class="slateframe-project-meta">
				<li><strong><?php echo esc_html_x( 'Role', 'Pattern content', 'slateframe' ); ?></strong><?php echo esc_html_x( 'Describe your responsibility', 'Pattern content', 'slateframe' ); ?></li>
				<li><strong><?php echo esc_html_x( 'Scope', 'Pattern content', 'slateframe' ); ?></strong><?php echo esc_html_x( 'Summarize the part you worked on', 'Pattern content', 'slateframe' ); ?></li>
				<li><strong><?php echo esc_html_x( 'Period', 'Pattern content', 'slateframe' ); ?></strong><?php echo esc_html_x( 'Add a useful time frame', 'Pattern content', 'slateframe' ); ?></li>
			</ul>
			<!-- /wp:list -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->

	<!-- wp:columns {"className":"slateframe-project-sections"} -->
	<div class="wp-block-columns slateframe-project-sections">
		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":3} -->
			<h3 class="wp-block-heading"><?php echo esc_html_x( 'Context', 'Pattern content', 'slateframe' ); ?></h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Describe the constraint, need, or opportunity without turning the section into a long backstory.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":3} -->
			<h3 class="wp-block-heading"><?php echo esc_html_x( 'Approach', 'Pattern content', 'slateframe' ); ?></h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Explain the decisions, trade-offs, and implementation choices that shaped the work.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->

		<!-- wp:column -->
		<div class="wp-block-column">
			<!-- wp:heading {"level":3} -->
			<h3 class="wp-block-heading"><?php echo esc_html_x( 'Outcome', 'Pattern content', 'slateframe' ); ?></h3>
			<!-- /wp:heading -->
			<!-- wp:paragraph -->
			<p><?php echo esc_html_x( 'Close with observable results, what improved, and what you learned from the project.', 'Pattern content', 'slateframe' ); ?></p>
			<!-- /wp:paragraph -->
		</div>
		<!-- /wp:column -->
	</div>
	<!-- /wp:columns -->
</div>
<!-- /wp:group -->
