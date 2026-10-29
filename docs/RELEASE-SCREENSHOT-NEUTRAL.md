# WordPress.org screenshot: neutral content, real theme

The distributable `screenshot.png` must depict a genuine Slateframe page rendered by WordPress and Chromium at 1200 × 900. It must not advertise theme functionality, licensing, upgrades, or a product. The page title **Field Notes**, three ordinary Core Columns, a Core Image, and short fictional travel-journal prose provide neutral example content. The landscape illustration is a local CI fixture; no personal URLs, production content, or third-party assets are required.

The isolated stateful `tests/browser/release-screenshot.spec.js` creates the disposable page with WP-CLI, checks the native heading, columns, decoded image and horizontal containment, captures `wordpress-org-screenshot-candidate.png`, and deletes the page. Existing browser screenshots, showcase content, and theme runtime remain unchanged. `bin/check-screenshot.py` continues to enforce a complete, metadata-free, non-interlaced 1200 × 900 PNG.

**Release gate:** the candidate is only evidence, not automatically published. Inspect the exact HEAD artifact visually, then replace the repository `screenshot.png` with those **exact real WordPress+Chromium bytes** in a reviewed commit. Re-run the complete quality and distribution gates for that new SHA, inspect the committed image, and compare its SHA-256 to the intended artifact. Do not fabricate a screenshot or substitute an illustration/mockup. Do not declare issue #188 closed while the old feature-copy screenshot is still shipped.

## Safe promotion after review

Download the exact-HEAD Browser Actions ZIP, inspect its actual WordPress screenshot, then run `python3 bin/promote-release-screenshot.py browser-artifact.zip FULL_HEAD_SHA` to verify the inventory SHA, PNG integrity, dimensions and path safety without changing files. Only after review, add `--apply` to atomically copy the **unchanged PNG bytes** into `screenshot.png`. Commit the PNG and rerun the new SHA's entire Actions and ZIP reproducibility gates. A stale or linked artifact is rejected.
