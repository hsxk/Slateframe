# Native Core Post Date presentation

Slateframe presents the WordPress Core Post Date block without taking ownership
of date selection, publication metadata, permalink generation, locale-specific
formatting or block serialization. The theme never rewrites the `<time>` element,
its `datetime` attribute or the optional permalink.

The conditional, editor-shared stylesheet bounds the native linked date to the
shared 44px target. Unlinked dates remain plain semantic time text; dates retain
numeric alignment and CJK/RTL long-string wrapping. There is no JavaScript,
plugin dependency, SEO metadata injection, or custom date formatter.

## WordPress and Chromium acceptance

A disposable published post contains linked and unlinked Core Post Date blocks.
The browser verifies WordPress's actual permalink, native time attributes,
responsive widths 320/375/390/412/768/1440/1920, LTR/RTL, 200%/400% text,
keyboard focus, Axe, forced colors, screenshots, and 404 conditional asset
isolation. The post is deleted in `finally`. An authenticated Gutenberg fixture
roundtrips native date options without modifying the editor post.

Manual Safari/VoiceOver and Firefox review remains a release gate for localized
date announcements and optional link semantics. Visual PASS requires opening
screenshots from the exact HEAD SHA's real WordPress/Chromium Actions artifacts.
