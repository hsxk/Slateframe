# Core Gallery screenshot evidence gate

This is a development-only, plugin-neutral quality gate for the free WordPress Core Gallery presentation theme. It does not ship in the theme ZIP.

After Playwright's four Gallery suites, require 26 real WordPress + Chromium PNG screenshots, including full-page Native Gallery (320/390/768/1440/1920), class-only Gallery (390/1440), Photography page (320/390/768/1440/1920), Core Lightbox portrait/landscape (320/390/768/1440/1920), and Native/class-only 400%-zoom captions in both LTR and RTL.

The validator checks complete PNG chunk CRCs, exact widths, plausible height and file size, complete decoded image streams, linked/hardlinked paths, and duplicated evidence across distinct scenes. The only documented duplicate exception is the same fixture page captured twice at the same viewport under the two historical screenshot names. A successful manifest includes SHA-256, viewport dimensions, checkout SHA, Actions run ID and attempt. Prior success manifests are removed before validating current evidence, and new ones are atomically replaced.

The Photography workflow should check out the exact pull request head SHA (not the synthetic merge ref), then set SLATEFRAME_EVIDENCE_SHA to that same SHA for the validator. Never accept screenshots from a different commit or a locally recreated HTML page as a substitute for the Actions artifact. Browser smoke and Theme quality must also pass at the same SHA. Merge only after actual screenshots are visually inspected.

Local validation (2026-10-14): 22 screenshot-verifier unit tests passed; 26/26 required screenshots validated against the actual GitHub Photography artifact 11884685152 from HEAD 169f46d13e83850b6e6439744582ae08c0ef267b. The new evidence gate must be independently validated on its own exact SHA before merge.
