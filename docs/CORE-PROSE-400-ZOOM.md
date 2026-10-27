# Core prose and Query Loop links: computed 400% evidence

This vertical slice covers native Core Paragraph, Heading, Read More and Post
Excerpt. WordPress owns the blocks, content, anchors, permalink generation,
editor serialization and accessible names. Slateframe only owns presentation.

## Why this gate exists

Setting `document.documentElement.style.fontSize = '64px'` is not proof that
the browser applied 400% text. A competing `!important` rule, style recalculation
or a reused page can leave computed font size at 16/32px while geometry tests
and screenshots still pass. The shared `setRootTextScale(page, pixels, dir)`
helper asserts the exact computed 16/32/64px value, inline priority and
computed direction after two animation frames, before inspecting geometry.

Four existing suites now use that helper at all seven widths
(320/375/390/412/768/1440/1920), both directions and their 200%/400%
focus/forced-colors follow-ups. Keep existing 44px link targets, CJK/Arabic
wrapping, no document overflow, Core block attributes, anchor targets,
keyboard focus, Axe and Gutenberg roundtrip assertions intact.

## Real WordPress/Chromium evidence

At 390px, the Paragraph suite already records LTR/RTL 400% viewport captures.
Heading, Read More and Post Excerpt now record six more 390x900 viewport
captures, each after verifying actual 64px root text and scrolling the
relevant native content into view. The Theme quality workflow requires
these six files, and `tests/verify_prose_zoom_evidence.py` rejects missing,
wrong-sized or corrupt-IHDR captures. The general browser inventory verifies
full PNG decoding and exact-SHA hashes separately.

These are evidence gates, not permission to shrink text, hide long content,
remove Core semantics, lower budgets, or replace Core links with custom JS.
At 400% a long unbroken string may legitimately become very tall. Review
the viewport context and keyboard focus instead of treating an element-only
crop as a complete usability verdict.

## Release acceptance

Wait for all required GitHub Actions success on the exact PR HEAD, inspect
the real WordPress/Chromium screenshots for Appearance compact/default/
spacious, desktop/mobile, Photography/Lightbox, Portfolio, Knowledge,
Article, header/search/forms/footer and the new Core captures. Audit the
distributable ZIP and review threads before merge. Then verify the main
merge SHA and safely synchronize `automation/continuous-development`.

Safari/VoiceOver, Firefox and real installed CJK/RTL language packs remain
manual release checks; Chromium evidence alone cannot claim their PASS.
