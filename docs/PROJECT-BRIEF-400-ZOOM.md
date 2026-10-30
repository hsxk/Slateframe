# Core Project Brief and Case Study at 400% enlargement

The existing Core Project Brief Group used `clamp(1.25rem,3vw,2rem)` for block padding. At a 64px root font this created 80px per side. The native Case Study's `slateframe-project-sections` columns started with `clamp(1.75rem,4vw,3rem)`, creating 112px of leading margin. Both are vertical rhythm rather than readable content; neither should consume a proportional 400% text enlargement.

The conditional `content-modes.css` presentation now caps the Project Brief's block padding and the Case Study's sections margin at 40px through 781px viewport width and 64px above that breakpoint. At the default 16px root, existing 20px/28px mobile values and fluid desktop values are unchanged. Native Core Group, Columns, heading, text, editing and responsive stacking remain author-controlled. No additional JavaScript, CSS request, framework, custom data type or business logic.

The real WordPress browser regression creates both registered patterns and checks 320, 375, 390, 412, 768, 1440 and 1920px, LTR/RTL and 16/32/64px roots (42 states). It asserts computed padding/margin, element containment, no document overflow, the 44–56px Appearance control bound, CJK/Arabic/long identifier wrapping, Axe, forced colors and Gutenberg block validity. Exact-HEAD 390×900 screenshots are mandatory and rejected when missing, symlinked, truncated, corrupt or incorrectly sized. 1440px LTR evidence is also captured. Isolated browser checks are not substitutes for GitHub Actions success and visual inspection.

The strict `content-modes.css` 7,000-byte budget and existing aggregate performance budgets remain unchanged. Production deployment and personal-site code are out of scope.
