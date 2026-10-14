# Native Core code keyboard scrolling

WordPress Core Code and Preformatted blocks retain their native `pre` and `code` elements. Slateframe adds `tabindex="0"` to the rendered Core `pre` scroll container only if an author has not already set tabindex. The filter does not rewrite arbitrary Classic HTML, plugins or other blocks. The existing reading and editor CSS keeps long lines horizontally scrollable without enlarging the document.

The real-WordPress showcase includes long unbroken Core Code and Preformatted lines. Chromium tests exercise native ArrowRight (LTR) and ArrowLeft (RTL) keyboard scrolling at 320, 375, 390, 412, 768, 1440 and 1920px. At 390 and 1440px they also inspect 200% text zoom, forced colors, focus, overflow and screenshot evidence.

The compact mobile header menu additionally caps its scrollable height to a viewport-relative measure and reserves a stable scrollbar gutter. A long multilingual navigation fixture checks that the last link remains keyboard reachable at 200% text zoom without document-level overflow.

Manual Firefox, Safari/VoiceOver and NVDA review remains required before release. No JavaScript or third-party block runtime is added for code scrolling.
