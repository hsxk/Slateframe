# Readable classic taxonomy footer

Slateframe keeps WordPress Core category/tag lists and the two existing
presentation-only HTML filters. A filter may legitimately hide one group,
return an empty anchor, or supply a Unicode-invisible label. In that case the
classic post footer must not display an orphaned "Filed under" or "Tagged"
label. When both groups are unreadable the entire footer is omitted.

Each group is checked independently using the existing decoded, tag-free
Unicode readable-label helper. Valid Core HTML, URLs, multilingual text,
post-safe escaping, logical RTL isolation, 44px link targets and Gutenberg
Core Post Terms blocks remain unchanged. No custom taxonomy query, SEO
behavior, runtime CSS, JavaScript, dependency or paid feature is introduced.

Validation:
- The executable PHP fixture covers 14 cases: visible, mixed, empty,
  whitespace, HTML-only, invisible entities/fillers, malformed filter returns
  and non-post suppression.
- The isolated real WordPress/Chromium fixture creates one temporary post
  and a request-scoped mu-plugin, then removes both in finally. It checks
  both groups, either group, neither group, seven responsive widths, LTR/RTL,
  100%/400% text, keyboard focus, Axe, forced colors and mandatory screenshots.
- Exact-HEAD Theme quality, Photography, ZIP reproducibility and actual
  screenshot inspection remain required before merging.
