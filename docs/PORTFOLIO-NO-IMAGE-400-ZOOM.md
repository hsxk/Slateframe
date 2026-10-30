# Image-free Portfolio cards at 400% enlargement

The native Core Query Loop's Portfolio card remains valid when an article has no featured image. Its accent-border fallback previously added a full --slateframe-stack-gap to the logical inline start, consuming 64px at a 64px root font and leaving less room for CJK, RTL and long technical titles.

The presentation-only fallback now uses min(var(--slateframe-stack-gap),20px). At the default 16px baseline it is unchanged; at 200–400% enlargement it caps at 20px. It retains the accent border, WordPress Core Query/Post Template, author-controlled grid, text enlargement, keyboard focus and Gutenberg editor styles. It adds no runtime assets, dependencies, custom data types or business logic. The existing content-modes.css 7,000-byte budget remains unchanged.

Real WordPress/Chromium acceptance uses a Portfolio page and removes the featured-image block to exercise native no-image CSS without replacing Core Query markup. It checks 320/375/390/412/768/1440/1920px, LTR/RTL and 16/32/64px roots (42 states), computed logical padding, card bounds, CJK/Arabic/identifier wrapping and no horizontal overflow. It also requires 390px RTL/400% forced-colors keyboard focus, Axe WCAG 2.1 AA and two exact-SHA screenshots. Isolated Chromium preflight does not substitute for successful exact-HEAD GitHub Actions and actual WordPress screenshots.
