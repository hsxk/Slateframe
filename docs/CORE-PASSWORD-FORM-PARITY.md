# Core password-form presentation

WordPress Core replaces protected post/Page content with form.post-password-form until a valid password cookie is present. Slateframe does not replace Core's password handler, cookie, markup, translations, or access decisions.

The shared slateframe-forms stylesheet must load for the native password form even when the saved content has no form markup and an extension disables general form detection. The password input and submit control retain the bounded 44px minimum. While the post is locked, its comments template returns without rendering; Slateframe therefore must not enqueue slateframe-comments or comment-reply. Once Core reports the password is satisfied, ordinary open/historical comment behavior returns.

## Acceptance

- python3 -m unittest discover -s tests -p test_password_form_asset_parity.py runs isolated PHP tests against the actual functions and confirms both CSS dependency closure and comment-asset suppression.
- tests/browser/password-form-parity.spec.js visits a real password-protected WordPress fixture, checks native form and asset handles, verifies content remains hidden, then checks 44px controls, keyboard focus, RTL, 400% text zoom and forced colors across responsive projects.
- A second browser scenario submits an incorrect fixture password, verifies that private content and discussion assets remain hidden, then submits the correct password through WordPress Core. It checks that the native comment form and styles return and that the postpass cookie remains effective after reload. No theme-owned password logic is introduced.
- The browser fixture uses a temporary CI post, not production content. Representative 320/390/1440px screenshots are saved with exact-HEAD Actions evidence.
- The theme remains presentation-only: no password management, media access-control plugin behavior, JavaScript, or third-party dependency is added.

## Protected authored presentation

Core password protection hides authored block and HTML content until a valid postpass cookie is present. Slateframe must not inspect locked post content or resolve its synced-pattern references just to decide whether Photography, Portfolio/Knowledge, Query Loop, or authored form-state CSS is needed. The visible native password form still receives the shared 44px form-control layer; independent public footer widgets and extension opt-ins remain eligible for their own styles.

The real WordPress browser fixture contains authored Photography, Portfolio/Query Loop and form markers behind a second password. The browser verifies those CSS files are absent while locked, return after Core unlocks the post, and remain available after reload. This is asset minimization and presentation parity, not a replacement for WordPress Core password handling.
