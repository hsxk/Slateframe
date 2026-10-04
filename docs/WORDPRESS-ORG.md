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
- every shipped `patterns/*.php` file has a valid `slateframe/` slug matching its filename, exactly matches the live WordPress pattern registry, parses as block content, and embeds no remote media URLs;
- responsive browser regression, including real Gutenberg authoring evidence, core attachment/media templates, untitled/sticky/search discovery states, content-mode, print, CJK/RTL, long-string, and system/light/dark color-mode fixtures;
- separate base, singular-reading, discussion, specialized content-mode, and combined contextual-runtime ceilings so optional presentation does not silently inflate ordinary routes;
- package-content and 1200×900 screenshot validation, plus a byte-for-byte reproducibility gate that builds the same revision twice and requires identical SHA256 output.

Theme Check advisory findings remain visible in CI rather than being hidden. Color-mode CI also validates the 44px toggle target, accessible pressed state/name, server-resolved site defaults, visitor-cookie persistence, semantic dark surfaces, and representative mobile/desktop screenshots.

## Current advisory decisions

Theme Check currently recommends two optional legacy capabilities that Slateframe does not implement by design:

- **Custom Header:** Slateframe supports the WordPress Custom Logo API. It does not own a separate decorative header-image system.
- **Custom Background:** Slateframe uses `theme.json` and WordPress appearance tools for presentation instead of adding a legacy Customizer background-image API.
These are reviewed as product decisions, not ignored errors. If Slateframe's layout model changes, the decisions must be revisited. Slateframe does register the `footer-content` block/widget region; it deliberately does not add a content sidebar or a second reading column.

## Submission artifact

`./bin/build-theme-zip.sh` creates `dist/slateframe.zip`. Development-only files are excluded. The archive must contain the public theme metadata, runtime assets, patterns, templates, `readme.txt`, `LICENSE`, and `screenshot.png`. Entries are sorted and ZIP timestamps/permissions are normalized from the source commit; CI builds the same revision twice and rejects the package if the SHA256 values differ.

The current screenshot is a real WordPress browser-fixture capture used for pre-release compliance. Replace it with the final polished public showcase before the first stable WordPress.org submission.
