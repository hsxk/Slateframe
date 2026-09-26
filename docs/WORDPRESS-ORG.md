# WordPress.org readiness

Slateframe validates the distributable theme rather than treating the development repository as the submission artifact.

## Blocking checks

The public quality workflow currently requires:

- release metadata consistency across `style.css`, `readme.txt`, and `package.json`;
- WordPress Coding Standards;
- a clean install and activation on the primary runtime;
- compatibility smoke coverage for WordPress 6.7 and current WordPress across PHP 7.4 and PHP 8.3;
- Theme Check against the built `slateframe.zip`;
- zero Theme Check findings with severity `REQUIRED`;
- all 21 production patterns present and registered in real WordPress, with no remote media URLs embedded in pattern source;
- responsive browser regression, including content-mode, print, CJK/RTL, and long-string fixtures;
- separate base, singular-reading, discussion, specialized content-mode, and combined contextual-runtime ceilings so optional presentation does not silently inflate ordinary routes;
- package-content and 1200×900 screenshot validation.

Theme Check advisory findings remain visible in CI rather than being hidden.

## Current advisory decisions

Theme Check currently recommends three optional legacy capabilities that Slateframe does not implement by design:

- **Custom Header:** Slateframe supports the WordPress Custom Logo API. It does not own a separate decorative header-image system.
- **Custom Background:** Slateframe uses `theme.json` and WordPress appearance tools for presentation instead of adding a legacy Customizer background-image API.
- **Widget/sidebar area:** Slateframe is intentionally a one-column editorial theme. Requiring a sidebar would add layout and content assumptions that conflict with that product boundary.

These are reviewed as product decisions, not ignored errors. If Slateframe's layout model changes, the decisions must be revisited.

## Submission artifact

`./bin/build-theme-zip.sh` creates `dist/slateframe.zip`. Development-only files are excluded. The archive must contain the public theme metadata, runtime assets, patterns, templates, `readme.txt`, and `screenshot.png`.

The current screenshot is a real WordPress browser-fixture capture used for pre-release compliance. Replace it with the final polished public showcase before the first stable WordPress.org submission.
