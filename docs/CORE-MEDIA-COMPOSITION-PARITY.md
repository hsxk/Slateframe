# Core Cover and Media & Text parity

Slateframe leaves WordPress Core in charge of Cover backgrounds, overlay contrast, image cropping, alignment and Media & Text grid/mobile stacking. Tiny conditional styles bound intrinsic inline sizes and long CJK/RTL/unbroken text without replacing Core layouts or adding runtime JavaScript. The same styles load in Gutenberg.

Real WordPress/Chromium tests create disposable native Cover and Media & Text blocks, check document and text-fragment bounds at 320/375/390/412/768/1440/1920px, LTR/RTL and 16/32/64px roots, then capture 390/1440px screenshots and 390px RTL 400% forced-colors evidence. Axe and authenticated Gutenberg serialization are included. Existing Photography/Core Lightbox Actions remain mandatory.

Do not merge without inspecting the exact-HEAD Actions screenshots, checking the distribution ZIP, and preserving all existing quality budgets.
