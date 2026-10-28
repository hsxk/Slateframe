# Native Core Details: 400% zoom, keyboard and release evidence

This slice continues the existing Core Details parity suite rather than introducing
a custom accordion. The browser fixture is a genuine WordPress Core
`wp:details` block with a native `<summary>`, nested paragraph and Core Button.
The theme retains the browser's disclosure marker, Enter/Space activation,
wide/full authored alignment, accessible focus outline and the bounded
`--slateframe-control` minimum (44px).

## Actual computed text scaling

The test now uses the shared `setRootTextScale(page, font, dir)` helper
instead of writing `html.style.fontSize` and assuming that Chromium applied it.
The helper verifies the **computed** root font size at 16/32/64px and the
LTR/RTL direction after style synchronization. The seven existing viewports
(320, 375, 390, 412, 768, 1440, 1920px), open disclosure geometry,
document horizontal-overflow assertions, nested link target checks, Axe,
forced-colors and Gutenberg serialization remain intact.

## Required release screenshots

The Theme quality workflow requires these three genuine 390x900 viewport
captures at 400% text zoom:

- `core-details-390-ltr-400.png`
- `core-details-390-rtl-400.png`
- `core-details-390-rtl-400-forced-colors.png` (summary focused)

`tests/verify_core_details_zoom_evidence.py` rejects missing files,
invalid PNG signatures, malformed or corrupted IHDR, and incorrect viewport
dimensions. `tests/test_core_details_zoom_contract.py` tests the negative
cases and checks that the browser suite and workflow retain these requirements.
These are **test-only** changes: no runtime JS, custom block, theme CSS
override, plugin dependency, or weaker accessibility budget is introduced.

## Release rule

Do not mark this slice visually accepted until the **exact PR HEAD SHA**
passes Static quality, WPCS, Theme Check, WP/PHP compatibility, Browser smoke,
Photography and distributable checks, and its actual WordPress/Chromium
screenshots have been downloaded and reviewed. A screenshot filename alone
is not evidence of computed 400% text scaling.
