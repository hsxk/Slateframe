# Core File and Verse: long filename containment

Core File links must remain keyboard reachable and contain long multilingual filenames. The theme explicitly sets `overflow-wrap:anywhere` on the filename anchor rather than relying on inheritance from `.slateframe-prose`. This preserves wrapping even when WordPress Core block CSS loads after the theme and sets its own anchor properties.

The regression is checked by `tests/test_core_file_wrap_contract.py` and the existing real WordPress+Chromium `tests/browser/core-file-verse.spec.js`. Local isolated Chromium reproduced 14/28 failing cases with a late Core override before the fix and 28/28 passing cases afterward, across seven viewports and LTR/RTL. Exact-SHA Actions verification is mandatory.

No JavaScript or new runtime asset is introduced. The existing 16 KB stylesheet and 38 KB combined runtime budgets remain enforced.
