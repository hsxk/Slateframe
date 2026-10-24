# Core media containment

Slateframe keeps WordPress Core Audio and Embed blocks portable without
replacing their players, modifying embed data, or adding JavaScript.

A fixed-width native audio, iframe, object, or embed can escape the article
column on phones. The shared reading layer bounds these elements to the
available column width; the Gutenberg editor receives the matching logical
inline-size rule. Native markup and intrinsic aspect behavior are preserved.

The browser regression exercises 320, 375, 390, 412, 768, 1440 and 1920px,
LTR/RTL, plus 390px RTL at 200% text zoom and forced colors. This validates
container geometry, not the behavior of remote third-party embed providers.

Local checks do not constitute acceptance: require the exact new HEAD SHA
Theme quality and Photography runtime quality GitHub Actions, then inspect
the genuine WordPress/Chromium screenshot artifacts before merging.
