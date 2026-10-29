<?php
/**
 * Title: Knowledge article Query Loop
 * Slug: slateframe/knowledge-query-loop
 * Categories: slateframe, slateframe-knowledge
 * Block Types: core/query
 * Description: A portable article reading list for the native Query Loop chooser.
 * Keywords: knowledge, articles, reading, query
 * Viewport Width: 1280
 * Inserter: yes
 *
 * @package Slateframe
 */
?>
<!-- wp:query {"queryId":0,"query":{"perPage":6,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"exclude","inherit":false},"align":"wide","className":"slateframe-knowledge-query"} -->
<div class="wp-block-query alignwide slateframe-knowledge-query">
<!-- wp:post-template -->
<!-- wp:group {"layout":{"type":"constrained"}} -->
<div class="wp-block-group">
<!-- wp:post-title {"isLink":true,"fontSize":"lead"} /-->
<!-- wp:post-date /-->
<!-- wp:post-excerpt {"moreText":""} /-->
</div>
<!-- /wp:group -->
<!-- /wp:post-template -->
<!-- wp:query-pagination {"layout":{"type":"flex","justifyContent":"space-between"}} -->
<!-- wp:query-pagination-previous /-->
<!-- wp:query-pagination-numbers /-->
<!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination -->
<!-- wp:query-no-results -->
<!-- wp:paragraph -->
<p><?php echo esc_html_x( 'No articles are available yet.', 'Empty knowledge Query Loop message', 'slateframe' ); ?></p>
<!-- /wp:paragraph -->
<!-- /wp:query-no-results -->
</div><!-- /wp:query -->
