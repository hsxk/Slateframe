# Gallery zoom reflow

A real WordPress Chromium screenshot at branch SHA 4b9b12dc showed a portrait Gallery caption becoming an extremely narrow vertical column at 400% browser zoom. Contextual Photography CSS now uses a bounded 24ch figure/caption width only in a short and narrow CSS viewport (≤640×480), without changing ordinary mobile/desktop layouts, Core Gallery serialization, Core Lightbox, or runtime JavaScript.

Acceptance requires real WordPress native and class-only Gallery fixtures, LTR/RTL, CJK/Arabic long captions, forced colors, reduced motion, screenshot inspection at 360×225 CSS pixels (1440×900 at 400% zoom), normal 390×844 negative control, and the existing 6,000-byte CSS budget. A synthetic Chromium check is not a substitute for successful exact-SHA Actions.
