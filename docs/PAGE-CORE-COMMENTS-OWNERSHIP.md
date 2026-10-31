# Page discussion: WordPress Core ownership

Slateframe's classic page template previously called `comments_template()` whenever comments were open or a comment existed, even if the page content already included WordPress Core's Comments or Post Comments Form block. That could display two discussion sections and duplicate `#commentform` IDs. Single posts already suppressed this fallback; pages now use the same three Core block guards.

## Behavior

- An ordinary page with open comments continues to render Slateframe's classic `comments.php` form. A page with existing comments and closed discussion retains its classic comment history.
- Pages containing `core/comments`, `core/post-comments`, or `core/post-comments-form` leave the discussion presentation to WordPress Core and do not append `comments_template()`.
- A page with no comments and no Core discussion block does not render an empty classic discussion section.
- The theme does not replace Core block markup, moderation, comment submission, nonces, privacy or REST behavior. No custom JS, endpoints, plugin, or runtime CSS is introduced.

## Regression evidence

`tests/test_page_comments_core_ownership.py` executes the actual `page.php` with isolated PHP WordPress stubs across open/closed, populated/empty, unrelated-block and all three Core block cases. It also requires the single-post guard to remain aligned.

`tests/browser/page-comments-core-ownership.spec.js` creates two disposable published WordPress pages through WP-CLI. It checks that a Core-authored page renders exactly one native comment form and no classic fallback, while an ordinary page retains exactly one classic form. It checks seven viewports (320/375/390/412/768/1440/1920), LTR/RTL, 390px RTL 400% zoom, keyboard focus, Axe and forced colors, then closes comments and confirms the native form disappears. It captures the real WordPress/Chromium Core form at 390px RTL 400%, 390px RTL 400% forced colors, and 1440px LTR, plus the classic form at 390px RTL. Fixtures are deleted in `finally`.

The PHP isolation check and local browser preflight do **not** establish release readiness. Require exact PR HEAD Theme quality, Photography, complete Browser smoke, visual inspection of actual screenshot artifacts, distributable ZIP reproducibility and post-merge main SHA Actions before merging or declaring success.
