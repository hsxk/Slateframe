# Native in-page fragment offsets

## Problem and scope

The desktop Slateframe header is sticky above 480px. Core Button links and ordinary paragraph, list, group, and custom HTML fragment targets can land directly under that header. The existing Core Heading and Footnotes rules cover their own targets, but not general authored `id` attributes. The result is a visible navigation failure: the destination can be hidden behind the header even though the URL fragment updates.

## Presentation-only fix

`assets/css/reading.css` gives authored `[id]` targets inside `.slateframe-prose` a logical `scroll-margin-block-start` equal to the existing header-height and stack-gap tokens, **only at widths above 480px**. Headings and Footnotes retain their existing dedicated rules with the same offset; mobile uses the relative, non-sticky header and receives no artificial offset. No JavaScript, URL rewriting, content filters, custom blocks, plugins, or new design tokens are involved. Gutenberg's editing canvas does not have a sticky site header, so it is intentionally excluded.

## Evidence and acceptance

An isolated local Chromium reproduction using the actual distributed Slateframe CSS showed that at 768/1440px, LTR and RTL, a native fragment destination landed at **0px** (behind the ~73px header) before the fix and at **88px** after it. At 390px the non-sticky mobile target remained at 0px in both directions. The local check also reported zero document overflow. The real WordPress fixture includes space **both before and after** its destination, so a target clamped near the document bottom cannot falsely satisfy the offset assertion; it checks both lower and upper geometry bounds.

`tests/browser/native-anchor-offset.spec.js` creates and deletes a disposable WordPress page. It activates a native Core Button fragment using **keyboard Enter**, checks all seven required widths, both writing directions, 100/200/400% text where relevant, actual computed header and target geometry, zero page overflow, and forced-colors screenshots. It must be accepted only after exact-new-SHA Theme quality and Photography Actions succeed and the real WordPress/Chromium screenshots are visually inspected. The isolated reproduction is not a substitute for that gate.

## Release boundary

The rule is limited to article content, preserves author-owned fragment IDs and WordPress Core link behavior, and stays within the existing 7,000-byte reading stylesheet budget. Manual Safari/VoiceOver and Firefox fragment-announcement checks remain open.

## Skip-link main landmark

The same issue affects the global keyboard **Skip to content** link: `#main-content` is focusable, but its first heading could be hidden behind the sticky header after Enter. A global, bounded rule in `assets/css/navigation.css` gives that landmark the same logical offset only above 480px. It applies on archive/search/404 as well as singular pages, so it cannot live solely in the singular-only reading stylesheet. Existing skip-link Playwright coverage now checks actual header geometry and focus on every configured viewport. A local Chromium reproduction found a desktop main landmark at ~0px before and ~88px after the fix, while 390px remained unchanged. No focus trap, JavaScript scroll handler, or change to WordPress landmarks is introduced.

## Budget-preserving CSS factoring

The new offsets initially exceeded two existing aggregate runtime budgets. Rather than relax them or make the native Table of Contents presentation conditional (which would break class-only Core-style HTML on WordPress versions without the experimental block), the shared reading CSS now nests its existing Core Table and TOC container rules, removes browser-default table declarations, and keeps the exact original TOC link selector and 44px contract. Isolated Chromium comparisons of native Core Table and class-only TOC across all seven widths and LTR/RTL found identical computed geometry, wrapping, tabular-number presentation, and zero document overflow. `reading.css` is 6,674/7,000 bytes; the unchanged aggregate runtime limits are respected. Real WordPress Actions remain the final gate.
