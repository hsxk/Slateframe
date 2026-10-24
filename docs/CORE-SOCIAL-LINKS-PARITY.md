# Core Social Links parity

Slateframe delegates WordPress Core Social Links and Social Link SVGs, names, service labels, destinations, palettes, styles, and serialization to Core. The theme owns only bounded wrapping and the shared 44px minimum icon target. No network SDK, analytics, tracking, premium dependency, default URL, or new JavaScript is added.

The always-loaded shell/footer stylesheet already supplies the shared 44px link control rule. Core Social Links reuse that exact rule (including in Gutenberg via the editor-style registration), without adding another global rule or increasing existing aggregate runtime budgets. Core logos-only and filled styles retain authored colors; the anchor inherits the native radius rather than imposing a shape. Real WordPress/Chromium tests publish a disposable native-block page with two services in each style and delete it after the run. Coverage includes 320/375/390/412/768/1440/1920 CSS pixels, LTR/RTL, 200% and 400% text, keyboard Tab and focus, forced colors, reduced motion, Axe and screenshot captures at 390/1440. Authenticated Gutenberg checks both variants and their native child blocks serialize and parse without mutating the editor post.

Review the exact-HEAD Actions screenshot ZIP before approving visual quality. Geometry and Axe alone do not establish a visual PASS.
