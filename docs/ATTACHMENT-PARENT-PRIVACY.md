# Attachment parent recovery: public-only navigation

Slateframe's attachment page is a presentation surface, not a media access-control
system. WordPress may allow an attachment URL to be visited independently of
its parent post or Page. The theme must not print the title or permalink of a
private, draft, scheduled, trashed, or non-viewable parent in that situation.

`slateframe_public_attachment_parent_id()` uses WordPress Core's
`is_post_publicly_viewable()` (available since WordPress 5.7) to decide whether
an attachment parent may appear in the **Back to …** navigation. Core checks
both the parent post status and the post type, including custom post types.
Password-protected published parents remain publicly viewable and retain their
link to Core's password prompt. Orphan attachments display no parent action.

The parent ID is validated with `slateframe_positive_int()` **before** Core's
visibility check. A filter returning a boolean, array, object, fraction,
negative value, or overflowing decimal string cannot accidentally coerce to
post ID `1` or `PHP_INT_MAX`. Valid integer and decimal-string IDs retain
their exact public-only recovery link; malformed values produce no link.


The theme does not attempt to restrict access to uploaded files, override
WordPress capabilities, or replace a site's media privacy policy. Sites that
need private media delivery must handle that separately at the application or
server level.

## Acceptance

- Run `php -l attachment.php` and `php -l inc/template-tags.php`.
- Run `python3 -m unittest discover -s tests -p test_attachment_parent_visibility.py`.
- The PHP fixture loads the real helper with isolated Core stubs. Cases cover
  public post/Page/custom type, password-protected published content, private,
  draft, scheduled, trashed, non-viewable type, missing/invalid parent, and
  attachment-ID normalization.
- The existing WordPress+Chromium attachment route must still show its
  published Page parent with a keyboard-accessible 44px recovery action.
- Exact HEAD SHA Actions and their real screenshots remain required for merge.
