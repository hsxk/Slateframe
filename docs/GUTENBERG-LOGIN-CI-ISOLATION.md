# Gutenberg login isolation in Browser smoke

Real WordPress Gutenberg acceptance tests perform login POSTs and create session cookies. They are not read-only browser assertions. Previously the Browser smoke workflow grouped specs only by WP-CLI subprocess usage, so `cjk-heading-editor.spec.js` and `editor.spec.js` ran among parallel read-only tests.

Intermittent `page.waitForResponse` timeouts occurred at the same login helper on 1440px (run 39027486576) and 390px (run 39045981518). A successful intervening run does not prove the underlying contention disappeared.

The Browser workflow now has three disjoint groups: parallel read-only specs, serial WP-CLI fixture writers, and serial authenticated Gutenberg specs. All existing tests and 30-second timeouts remain; no skips, retries, thresholds, or assertions are relaxed. If a login still times out, inspect the Playwright trace and WordPress server log rather than raising the timeout. This changes CI scheduling only; no theme runtime code or production site is affected.

## Stable Core login acceptance

The isolated Gutenberg specs still test the real WordPress editor with the existing 30-second test timeout. The shared helper first loads Core's login form (and its test cookie), then uses the Playwright page context's shared API request to POST genuine credentials to the **loopback fixture only**. It rejects unexpected login-page redirects, failed HTTP responses, redirects outside the same WordPress installation, absent signed login cookies, unexpected editor IDs and missing Gutenberg blocks. WordPress subdirectory fixtures are supported. No synthetic authentication cookies, skipped tests, extra retries or relaxed assertions are introduced.

Node regressions for login transport, redirect and cookie safety run in Static quality. Exact-HEAD real WordPress Browser smoke remains the required acceptance gate.
