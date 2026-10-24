# Classic Search large-text reflow

The native WordPress search form must remain usable at 400% text zoom in
Chinese, Japanese, Arabic and English, including RTL. Previously the action
was limited to 45% width above 640px and could become extremely tall.

The revised 295-byte CSS retains shared Spatial tokens, the 36rem width
limit and the mobile full-width grid. It allows intrinsic flex wrapping at
large font sizes without introducing JS or a framework.

The WordPress Playwright regression checks seven viewports, LTR/RTL, three
root font sizes, 44px controls, FormData, keyboard focus, forced colors, axe
and screenshot evidence. Local synthetic browser tests are not a substitute
for exact-SHA GitHub Actions and real WordPress screenshots.
