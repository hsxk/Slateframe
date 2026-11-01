# Core adjacent-post navigation: mixed-direction titles

The classic single-post template delegates adjacent-post selection, links,
order, permalinks and accessible navigation structure to WordPress Core via
`the_post_navigation()`. The localized **Previous post** and **Next post**
labels remain visible even if an adjacent post has no title.

Only the `%title` replacement slot is enclosed in native HTML `<bdi>`
for mixed Arabic/CJK/Latin titles. This does not alter the Core title,
filters, serialized Gutenberg blocks, query behavior, CSS or JavaScript.

Regression: `python -m unittest discover -s tests -p test_post_navigation_bidi.py`
checks the real template's Core arguments and PHP syntax. The real
WordPress/Chromium fixture creates three dated posts and checks both links,
keyboard focus, 320–1920px, LTR/RTL, 100%/400% text, Axe, forced colors and
two exact-HEAD screenshots. Temporary posts are removed in `finally`.
Human screenshot inspection is required before merge.
