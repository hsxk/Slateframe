# Native Core Table parity

Slateframe leaves `core/table` in charge of cells, headings, table data, captions, authored layout, and stripe style. No table markup filters, JavaScript, custom data model, or plugin dependency are introduced.

The existing singular reading layer contains horizontally wide tables inside the figure. The conditional `core/table` stylesheet retains Core's fixed-layout algorithm while bounding intrinsic table width to the shared wide measure, wraps mixed CJK/RTL cells and captions, and aligns captions to logical start in Gutenberg and the frontend. Forced-colors stripes gain a system-color row divider rather than depending only on backgrounds.

A disposable real WordPress post checks fixed and striped tables, header cells, caption, cell link, seven viewports (320/375/390/412/768/1440/1920), LTR/RTL, 200%/400% text, keyboard focus, Axe, forced colors, 404 style isolation, and 15 screenshots. The authenticated editor test checks native Core Table serialization without modifying the document. Static checks enforce budget, namespace, ZIP inclusion and screenshot inventory.

**Release gate:** verify all required GitHub Actions for the exact PR HEAD and inspect actual WordPress/Chromium artifacts before merging; verify the merged main SHA separately. Safari/VoiceOver and Firefox keyboard review of horizontally scrollable tables remains a manual release check.

A local Chromium preflight found that forcing a fixed table to 100% of a 390px figure produced 24,000px-tall cells at 200% text. The corrected rule keeps Core's intrinsic table sizing, caps it at the shared wide token, and adds a strict height regression bound at 200%/400%.
