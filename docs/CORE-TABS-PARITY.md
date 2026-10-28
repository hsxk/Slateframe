# WordPress Core Tabs presentation parity

WordPress 7.1 ships native `core/tabs` with Core-owned ARIA tablist, roving focus, activation, panel visibility and fragment navigation. Slateframe does not register a competing tabs component or add runtime JavaScript. WordPress 6.7 remains supported: the conditional stylesheet is registered only if Core Tabs is available.

## Bounded presentation

The small `assets/css/core-tabs.css` stylesheet applies only when a native Tabs block renders, and is included in Gutenberg editor styles. It gives tab buttons a minimum 44px inline/block hit target using `--slateframe-control`, bounds the tab list/panels to the containing column, and allows long Japanese/Chinese/Arabic/unbroken labels to wrap at 400% text scaling. It does not override authored colors or text alignment, tab selection, hidden panels, Core button display, or Core's interactivity store. Forced-colors focus uses a system color.

## Acceptance

`tests/browser/core-tabs-parity.spec.js` publishes a real WordPress Tabs fixture and checks 320/375/390/412/768/1440/1920 × LTR/RTL × 16/32/64px computed root text, tab target dimensions, horizontal reflow, Core keyboard focus/activation, panels and Axe. Three 390×900 viewport PNGs at 400% (LTR, RTL, RTL forced colors) must show the actual tab control in view. CI verifies complete PNG chunks/CRC, dimensions and symlink safety. WordPress 6.7 installation/compatibility remains a separate gate. Safari/VoiceOver and Firefox manual testing remains a release task.
