# Native Core Comments Link parity

Slateframe preserves the WordPress core/comments-link block, Core-owned comment counts, approval/status logic, post context, comment permalinks and localized link labels. The theme adds only a conditional, Gutenberg-shared stylesheet for a 44px minimum linked target and long CJK/RTL text reflow. No comments API, custom query, JavaScript, provider, plugin dependency or user data is introduced.

## Acceptance

A disposable published WordPress post with comments open and one approved native comment checks the Core get_comments_link() URL and nonempty native label. The real Chromium fixture then stresses a long multilingual label at 320/375/390/412/768/1440/1920px, LTR/RTL, normal/200%/400% root sizes, keyboard focus, Axe WCAG 2.1 AA, forced colors, screenshots and conditional asset isolation on 404. It deletes the comment and post in finally.

Authenticated Gutenberg checks native core/comments-link serialization and reparse stability without modifying the existing editor document. Review exact-SHA screenshots and package manifest before merging.

## Release review

Manually verify localized comment-count announcements, comments closed/disabled behavior, navigation to the comments anchor and focus in Safari/VoiceOver and Firefox. The theme never rewrites Core's count or comment policy.
