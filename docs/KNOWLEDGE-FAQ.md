# Knowledge questions and answers

`slateframe/knowledge-faq` is an optional editorial pattern built from a Core Group, Heading, Paragraphs and three native `core/details` blocks. The first disclosure uses the existing `slateframe-disclosure` Core block style; the other two demonstrate the unstyled Core alternative. It adds no custom data type, scripts, new CSS, dependency or service.

Editors can replace every question and answer, add sources as normal Core links, remove disclosures or insert additional ones. The pattern deliberately does not claim to generate FAQ schema or manage SEO metadata. Each disclosure keeps a native `<summary>` for keyboard and screen-reader behavior. The headings provide document structure without inventing an ARIA accordion implementation. Every initial disclosure is closed to keep the page scannable.

## Acceptance

The real WordPress browser regression reads the *registered* pattern from WordPress, publishes a disposable page, and checks its three disclosures across 320, 375, 390, 412, 768, 1440 and 1920px, LTR/RTL and bounded 44/48/56px controls. It verifies Enter/Space, 200% text zoom, forced-colors, focus outline, print rendering and no horizontal overflow. It captures a 390px RTL forced-colors image and a 1440px LTR image and deletes the fixture even on failure. The static contract checks Core block nesting, text-domain localization, neutral copy and the absence of plugin or proprietary dependencies.

Do not mark the slice released until Theme quality and Photography Actions both succeed on the exact PR HEAD and the actual screenshot artifact has been inspected. The local tests alone are not a release gate.
