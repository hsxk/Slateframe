# Native Core Table parity

Slateframe leaves `core/table` in charge of cells, headings, table data, captions, authored layout, and stripe style. No new markup filters, JavaScript, custom data model, or plugin dependency are introduced. The existing narrowly scoped Core Table filter adds `tabindex=0` to a figure only when the author has not supplied a tabindex, preserving keyboard access to horizontally scrollable tables without changing cells or data.

The existing singular reading layer contains horizontally wide tables inside the figure. The conditional `core/table` stylesheet retains Core's fixed-layout algorithm while bounding intrinsic table width to the shared wide measure, wraps mixed CJK/RTL cells and captions, and aligns captions to logical start in Gutenberg and the frontend. Forced-colors stripes gain a system-color row divider rather than depending only on backgrounds.

A disposable real WordPress post checks fixed and striped tables, header cells, caption, cell link, seven viewports (320/375/390/412/768/1440/1920), LTR/RTL, 200%/400% text, keyboard focus, Axe, forced colors, 404 style isolation, and 22 required screenshots (14 normal, two 390px/400% content, two RTL forced-colors at 200%/400%, and four 400% keyboard-scroll viewport captures). The shared browser scale helper asserts the computed 16/32/64px root size and inline important priority after two animation frames before checking layout; merely setting a CSS percentage is not acceptance. The authenticated editor test checks native Core Table serialization without modifying the document. Static checks enforce budget, namespace, ZIP inclusion and screenshot inventory.

**Release gate:** verify all required GitHub Actions for the exact PR HEAD and inspect actual WordPress/Chromium artifacts before merging; verify the merged main SHA separately. Safari/VoiceOver and Firefox keyboard review of horizontally scrollable tables remains a manual release check.

A local Chromium preflight found that forcing a fixed table to 100% of a 390px figure produced 24,000px-tall cells at 200% text. The corrected rule keeps Core's intrinsic table sizing, caps it at the shared wide token, and adds a strict height regression bound at 200%/400%.

The data-table and plain-HTML-table suites use the same computed-scale gate, with 390px 400% LTR/RTL data-table screenshots, 200%/400% RTL forced-colors evidence, and 320px RTL keyboard-scroll screenshots at both zoom levels. All new evidence files are required by Theme quality, not optional artifacts. No theme runtime CSS or JavaScript was added for these checks.

## Gutenberg editor scroll parity

The editor canvas now uses the same bounded native Core Table scroll boundary as
published articles: zero minimum inline size, stable scrollbar gutter, inline-size
containment and inline overscroll containment. This prevents long mixed CJK/RTL
table cells from expanding nested editor layouts while leaving Core's table markup
and fixed-layout algorithm intact.

An authenticated WordPress Gutenberg test inserts a disposable native Core Table
without saving the post. At a browser-computed 64px root and RTL direction it
checks the rendered block's overflow, scrollbar gutter, overscroll containment,
inline-size containment and absence of document-level horizontal overflow at
390px and 1440px. Two editor screenshots are mandatory CI artifacts. The block
is removed in a finally clause. This tests actual editor styles, not merely
serialized block attributes.

## 400% keyboard scroll acceptance

The Core Table fixture now exercises **both fixed-layout and striped figures** at a browser-computed 64px root size in LTR and RTL with forced colors enabled. For each figure, it verifies real horizontal overflow, keyboard focus, a visible system-color focus outline, directional ArrowRight/ArrowLeft scrolling with a nonzero `scrollLeft`, and no document-level horizontal overflow. Four 390px viewport screenshots (one per direction and figure variant) are required by the Theme quality workflow. These complement the full-height content screenshots: a clipped viewport of a scrollable figure is not itself proof that the table can be operated with a keyboard. No new theme runtime CSS or JavaScript is needed.
