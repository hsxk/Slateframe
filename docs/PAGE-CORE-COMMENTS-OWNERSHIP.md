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

## Native submit label at 400% text enlargement

Exact-HEAD Browser screenshots revealed a defect that geometry-only assertions missed: WordPress Core's default input[type=submit] clipped the beginning of the label at 390px RTL and 400% root text enlargement while document overflow remained zero. The theme now uses the documented Core comment_form_defaults filter to substitute a wrapping button only when the submit template exactly matches WordPress Core's unchanged default. Caller-supplied templates and plugin-customized submit markup are preserved, and WordPress still owns comment validation, submission, nonces, moderation, block rendering, and translations. The classic Slateframe form already used the same native button template.

The real WordPress/Chromium regression now requires button#submit and tests text fragment bounds, intrinsic scroll width, full label text, 44px geometry, keyboard focus, RTL and forced-colors evidence at 390px/400%. The filter has executable PHP positive and negative cases. Local isolated CSS checks cannot substitute for exact-new-HEAD Actions and direct inspection of the regenerated screenshots.
