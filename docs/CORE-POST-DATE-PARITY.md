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

## Computed 400% text and fail-closed evidence

The acceptance matrix now uses the shared `setRootTextScale(page, font, dir)`
helper. It waits for the real WordPress/Chromium computed root font size
(16/32/64px) and computed LTR/RTL direction, instead of assuming an inline
font assignment succeeded. Native `<time datetime>` values, Core permalink
behavior, seven-width reflow, keyboard focus, forced-colors, Axe and Gutenberg
serialization are unchanged.

Three additional genuine 390×900 viewport screenshots are required:

- `core-post-date-390-ltr-400.png`
- `core-post-date-390-rtl-400.png`
- `core-post-date-390-rtl-400-forced-colors.png` (linked date focused)

The Theme quality gate verifies PNG signature, IHDR CRC and viewport dimensions;
static negative tests reject missing, corrupt and incorrectly sized evidence.
These are test and release-contract changes only, not a custom date formatter
or additional theme runtime asset. Visual acceptance requires reviewing the
exact PR HEAD SHA's successful WordPress/Chromium artifact before merging.
