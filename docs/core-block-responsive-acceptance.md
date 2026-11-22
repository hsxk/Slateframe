# Core block responsive and editor parity acceptance matrix

This is a release gate, not a record of completed testing. Run the checks against the exact candidate commit in a real WordPress installation with the block editor and Chromium. Do not infer a pass from static CSS or a previous commit's artifacts.

## Fixture and viewports

Create one public page and one post using native blocks only. Include Navigation (desktop and responsive overlay), Search, Details (closed/open), File (long CJK filename and download button), Table (fixed layout, long unbroken values, caption), Columns (nested groups), Gallery with native lightbox, Query Loop (pagination and empty results), Quote, List, and a long article with headings and footnotes. Use both LTR and RTL site languages, plus Japanese and Simplified Chinese content. Preserve a reusable exported fixture for subsequent runs.

At each of 320, 375, 390, 412, 768, 1440, and 1920 CSS pixels, inspect the page with compact, default, and spacious Appearance. For each combination verify: no document-level horizontal overflow; no clipped focus ring or controls; the responsive Navigation overlay can open, close, and return focus; long labels wrap without breaking layout; the article and Query Loop remain readable. Check at 200% and 400% browser zoom without assuming zoom equals a fixed CSS viewport.

## Native behavior and accessibility

- Details: Enter/Space toggles the native summary; focus remains visible; content is reachable in reading order. Test long RTL and CJK summaries.
- File: both the filename and download button remain keyboard reachable and wrap at 320px; embedded PDF/media never forces document overflow.
- Table: preserve native table semantics and header associations; inspect fixed-layout tables, horizontal scrolling where needed, captions, RTL, and forced colors.
- Gallery: verify WordPress Core lightbox open/close, Escape, focus restoration, captions, and image sizing without theme-specific lightbox JavaScript.
- Query Loop: verify pagination, empty state, title links, and card order in LTR/RTL. Do not replace Core query behavior with theme-specific data fetching.
- Forms and Search: verify accessible labels, 44px bounded controls, keyboard submission, visible errors, and forced-colors focus.
- Gutenberg: save, reload, and compare the editor and front-end layouts; confirm block serialization is unchanged.

## Evidence required before merging

For the **exact PR HEAD SHA**, link successful required Actions runs and jobs. Download their real WordPress + Chromium screenshots and visually inspect representative images for all three Appearance settings, mobile/desktop, RTL/CJK, Photography/lightbox, Portfolio, Knowledge/article, header/search/forms/footer. Record screenshot filenames and viewport dimensions, not just artifact IDs. Verify WPCS, Theme Check, PHP/WordPress compatibility, static budgets, axe/keyboard/focus, and distributable ZIP contents (no symlinks, development files, secrets, or site-specific legacy content). Compare reproducible package hashes across relevant builds. If any item is not executed, mark it **not verified**, never PASS.

After squash merge, verify the new main SHA's required push Actions and restore `automation/continuous-development` to the new main without overwriting manual changes.
