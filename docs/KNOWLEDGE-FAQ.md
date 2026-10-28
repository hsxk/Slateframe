# Knowledge questions and answers

`slateframe/knowledge-faq` is an optional editorial pattern built from a Core Group, Heading, Paragraphs and three native `core/details` blocks. The first disclosure uses the existing `slateframe-disclosure` Core block style; the other two demonstrate the unstyled Core alternative. It adds no custom data type, scripts, new CSS, dependency or service.

Editors can replace every question and answer, add sources as normal Core links, remove disclosures or insert additional ones. The pattern deliberately does not claim to generate FAQ schema or manage SEO metadata. Each disclosure keeps a native `<summary>` for keyboard and screen-reader behavior. The headings provide document structure without inventing an ARIA accordion implementation. Every initial disclosure is closed to keep the page scannable.

## Acceptance

The real WordPress browser regression reads the *registered* pattern from WordPress, publishes a disposable page, and checks its three disclosures across 320, 375, 390, 412, 768, 1440 and 1920px, LTR/RTL and bounded 44/48/56px controls. It verifies Enter/Space, 200% text zoom, forced-colors, focus outline, print rendering and no horizontal overflow. It captures a 390px RTL forced-colors image and a 1440px LTR image after clearing the keyboard-focus scroll and inline control override, and deletes the fixture even on failure. The static contract checks Core block nesting, text-domain localization, neutral copy and the absence of plugin or proprietary dependencies.

Do not mark the slice released until Theme quality and Photography Actions both succeed on the exact PR HEAD and the actual screenshot artifact has been inspected. The local tests alone are not a release gate.

### Gutenberg visual evidence

The editor test inserts the *registered* pattern into a temporary WordPress draft and verifies Core block validity. WordPress may show a first-use "Welcome to the editor" dialog after authentication; the test must dismiss it and assert it remains hidden before **both** editor screenshots. A passing Playwright test with a dialog obscuring the pattern is not acceptable visual evidence.

At 390px RTL with 200% text and forced-colors, the editor test checks actual visible heading, paragraph and summary text fragments as well as the editor's horizontal overflow. Layout-hidden paragraphs inside closed Core Details must be excluded from text-geometry checks. Reviewers should inspect the unobstructed 390px and 1440px PNGs from the exact PR HEAD artifact, not rely on the existence of screenshot files or a prior SHA's green checks.

### Expanded accessibility and bottom-of-canvas evidence

A separate real-WordPress axe regression scans the registered Core FAQ with all three native disclosures closed and expanded at 390px RTL and 1440px LTR. It checks accessible summary names, native Enter/Space opening and closing for all three disclosures, visible answers, WCAG 2 A/AA, 2.1 AA and 2.2 AA, and unconditional fixture cleanup. The test also captures both states at both widths. Do not suppress axe rules or replace the registered pattern with static HTML.

At 390px RTL and 200% text, the Gutenberg FAQ can extend below the inner editor iframe's visible area. A whole-block screenshot may therefore leave the final paragraph outside the visible frame even when the layout is correct. Capture `gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png` after scrolling that actual paragraph into view, then assert its text-fragment bounds and clipping ancestors. This improves evidence but does not prove that the theme layout was defective; only exact-SHA WordPress/Chromium artifacts establish the outcome.

### Keyboard focus and complete editor evidence

At 390px RTL and 1440px LTR, Tab and Shift+Tab must traverse the three native summaries in order without toggling them. Assert `:focus-visible` after keyboard navigation and capture a separate 390px RTL/200%/forced-colors focus-indicator screenshot.

The Gutenberg final-paragraph screenshot must follow a real scroll and validate multi-line text fragments against paragraph bounds, all clipping ancestors in both axes, and the editor iframe viewport. At 320px, 375px and 412px RTL/200%, verify the editor's horizontal overflow, summary bounds and at least 44px hit targets. Do not mark this slice visually accepted until exact-HEAD Actions artifacts are inspected.

### Printing closed Core Details

Printing a Knowledge article must not silently omit answers from its initially closed Core Details. The print-only presentation rule reveals the native `::details-content` box without modifying the `open` attribute or adding JavaScript. It also keeps each summary with its answer. The on-screen disclosure remains closed and keyboard-operable.

The dedicated real-WordPress print regression uses the registered pattern and checks all three answers at seven viewport widths, both text directions and 200% root text size. It captures 390px and 1440px print evidence; verify those actual screenshots from the exact PR HEAD Actions before release.

This relies on browser support for the native `::details-content` pseudo-element. Older engines without that support may still omit closed answers from print output; use print preview and open the disclosures before printing in those browsers. Do not add a custom accordion or a runtime JavaScript print handler as a workaround.


### Complete 400% native FAQ viewport evidence

A separate disposable real WordPress page now renders the registered FAQ pattern
and tests all seven 320/375/390/412/768/1440/1920px widths × LTR/RTL ×
computed 16/32/64px root text (42 combinations). Each native summary must
remain within the viewport, preserve its 44px target and avoid document overflow.
At 390×900, the browser captures actual 400% LTR, RTL and RTL forced-colors
viewport PNGs after scrolling the focused summary into view. Enter/Space still
operate native Core Details; no custom accordion or runtime JS is added.

The exact-SHA Theme quality gate rejects missing, wrong-size, truncated, corrupt,
non-PNG and linked screenshots, with negative regression tests. These screenshots
supplement, rather than replace, Gutenberg editor, print, keyboard and axe checks.
Do not merge until both required Actions pass and reviewers inspect the actual
WordPress/Chromium images and distributable ZIP.
