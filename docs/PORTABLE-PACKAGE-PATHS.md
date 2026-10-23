# Portable release package paths

Slateframe distributes only ordinary theme files in a reproducible ZIP. The
release manifest checker rejects hidden or uncommitted paths, symlinks,
private extensions, platform-reserved names, and casefold/NFC collisions.

File and directory names in the distributable must not contain Unicode
control (Cc), formatting (Cf), or surrogate (Cs) code points. This prevents
bidirectional overrides, invisible separators, zero-width format characters,
C1 controls, byte-order marks, and undecodable filesystem bytes from hiding
extensions or producing misleading package inventories.

This restriction applies **only to release filenames**, not to post content,
site language, typography, RTL layout, or Gutenberg blocks. Ordinary Chinese,
Japanese, Korean, Arabic, Hebrew, emoji, and combining-mark filenames remain
supported unless they collide under the existing portable-name rules.

Regression: `python3 -m unittest tests/test_release_unicode_paths.py`
exercises 18 actual Git-backed staging cases. The normal CI static quality job
discovers `test_*.py` and must pass for the exact PR HEAD. A passing local
test is not a substitute for GitHub Actions, WordPress.org Theme Check, or
a review of real WordPress+Chromium screenshots.
