# Native Photography sequence starter

The `slateframe/photography-sequence` pattern now inserts **three actual, local, replaceable Core Image blocks** inside a Core Gallery. Previously three source-free self-closing `wp:image` placeholders could leave a new installation with an empty-looking pattern. Bundled landscape, portrait and square SVGs demonstrate the sequence without external requests, proprietary content or third-party imagery.

The gallery preserves `imageCrop: false`, a wide-aligned two-column desktop composition, mobile stacking and Slateframe's existing natural-ratio presentation. The first frame spans the desktop grid. Each sample Image declares native optional Core lightbox support with `linkDestination: none`; WordPress owns the viewer and serialization. Decorative samples have empty alt text; authors replace them with their own photographs and add suitable alternative text and captions. The heading and guidance use the `slateframe` translation domain.

The real WordPress/Chromium regression publishes a disposable Page from the **registered theme pattern**, checks all three images load, their natural ratios and containment at 320/375/390/412/768/1440/1920 in LTR/RTL and 200% text, then a long CJK/Arabic caption at 400% text, forced colors, Axe and 390/1440 screenshots. Authenticated Gutenberg parses the same registered content and checks native Group/Gallery/Image blocks, lightbox attributes and stable serialization without changing the editor post. The disposable Page is deleted after testing.

The existing bootstrapped WordPress pattern-runtime validator now verifies all three actual Core Image slots, local URL/markup, lightbox and wide Gallery attributes instead of only parsing the pattern name.

Acceptance requires exact HEAD SHA Theme quality and Photography runtime Actions, real screenshot inspection, the three local SVGs in the distributable, and byte-identical inner ZIP builds across PR and push. No new runtime CSS, JavaScript, tracking, plugin dependency, paid tier or site-specific content is introduced.
