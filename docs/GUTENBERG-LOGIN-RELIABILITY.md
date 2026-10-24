# Gutenberg login reliability

Real WordPress editor acceptance must not wait for the intermediate Dashboard
document to finish loading. PR #52's pull-request Browser smoke failed at
390px waiting for `page.waitForURL(/\\/wp-admin\\//)` although the same-SHA
push run succeeded.

Both editor suites now share one login helper. It observes the same-installation
login POST, checks its HTTP status and a nonempty WordPress session cookie,
then navigates to the exact editor path and verifies the requested post ID,
edit action and loaded Core block-editor store. Original visual, CJK, keyboard
and block validation assertions are preserved. No timeout or quality gate is
relaxed. The helper is test-only and is excluded from the distributable theme.

Static contracts are run by the existing Python unittest discovery. Full
acceptance requires a **new exact-HEAD** WordPress/Chromium Browser smoke and
Photography workflow, visual artifacts and merged-main workflow verification.
