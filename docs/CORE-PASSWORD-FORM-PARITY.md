# Core password-form presentation

WordPress Core replaces protected post/Page content with form.post-password-form until a valid password cookie is present. Slateframe does not replace Core's password handler, cookie, markup, translations, or access decisions.

The shared slateframe-forms stylesheet must load for the native password form even when the saved content has no form markup and an extension disables general form detection. The password input and submit control retain the bounded 44px minimum. While the post is locked, its comments template returns without rendering; Slateframe therefore must not enqueue slateframe-comments or comment-reply. Once Core reports the password is satisfied, ordinary open/historical comment behavior returns.

## Acceptance

- python3 -m unittest discover -s tests -p test_password_form_asset_parity.py runs isolated PHP tests against the actual functions and confirms both CSS dependency closure and comment-asset suppression.
- tests/browser/password-form-parity.spec.js visits a real password-protected WordPress fixture, checks native form and asset handles, verifies content remains hidden, then checks 44px controls, keyboard focus, RTL, 400% text zoom and forced colors across responsive projects.
- The browser fixture uses a temporary CI post, not production content. Representative 320/390/1440px screenshots are saved with exact-HEAD Actions evidence.
- The theme remains presentation-only: no password management, media access-control plugin behavior, JavaScript, or third-party dependency is added.
