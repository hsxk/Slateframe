# Native comment submit reflow

The WordPress Core `comment_form()` default submit control is an `<input>` whose
translated `value` cannot wrap. At a 320px CSS viewport with 400% root text
sizing, the default English "Post Comment" control expands beyond the viewport
(the 2026-10-15 Actions Browser smoke measured 217px document overflow).

Slateframe supplies only the `submit_button` presentation template to Core's
`comment_form()` API. It preserves Core's `%1$s` name, `%2$s` id, `%3$s` class,
and `%4$s` translated label, while rendering a semantic `<button type="submit">`
whose text can wrap. This does not change form fields, nonce handling,
validation, submission, comments behavior, or plugin integrations.

The regression test checks the real WordPress fixture at all seven standard
viewport projects, both writing directions, forced colors, keyboard focus,
400% text sizing, full-document overflow, button content clipping, and 44px
minimum target size. Representative screenshots are captured at 320/390/1440px.
Do not substitute a clipped input or suppress document overflow with
`overflow-x:hidden`.
