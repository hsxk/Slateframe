# Related reading, native post navigation and 404 recovery at 400% zoom

Slateframe keeps WordPress Core post IDs, published-only discovery queries, related-post URLs, dates, previous/next post ordering, and ordinary 404 recovery semantics. This is a presentation-only change, not a content type, SEO system, query service, translation provider, or site-specific adapter.

Long uninterrupted Latin identifiers, Japanese/Chinese titles and Arabic mixed-script labels previously had no guaranteed break opportunity inside related-reading grid cards, native previous/next navigation, or translated 404 action/explanation text. The scoped publishing CSS now applies `overflow-wrap:anywhere` and intrinsic width constraints to these surfaces. It does **not** truncate content, hide overflow, reduce the requested text size, or alter WordPress-generated links.

The real WordPress/Chromium regression uses `tests/browser/related-reading-zoom.spec.js`. It preserves the actual link targets and changes only visible text in a disposable browser fixture. It covers 320/375/390/412/768/1440/1920px, LTR/RTL, computed 16/32/64px root font sizes, document containment, minimum 44px links, focus and forced-colors, plus Axe checks. Seven exact 390x900 viewport PNGs are required by CI. `tests/verify_related_reading_zoom_evidence.py` validates the PNG signature, IHDR dimensions, all chunk CRCs, IDAT presence and final IEND; unit tests reject missing, truncated, damaged and wrong-sized captures.

An independent isolated Chromium reproduction confirmed that the pre-fix long-token fixture overflowed a 320px viewport, while the scoped wrapping change restored document containment at 16/32/64px in both LTR and RTL. This **does not** substitute for exact-HEAD WordPress Actions or the required visual artifact review.

Before WordPress.org submission, also manually inspect translated labels with real language packs and check Safari/VoiceOver and Firefox keyboard and screen-reader behavior. Theme Check, PHP/WPCS, asset budgets, Core-first ownership and distributable ZIP reproducibility remain mandatory.
