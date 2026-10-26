# Portable release package paths

Slateframe distributes only ordinary theme files in a reproducible ZIP. The
release manifest checker rejects hidden or uncommitted paths, symlinks,
private extensions, platform-reserved names, and casefold/NFKC collisions.

File and directory names in the distributable must not contain Unicode
control (Cc), formatting (Cf), or surrogate (Cs) code points. This prevents
bidirectional overrides, invisible separators, zero-width format characters,
C1 controls, byte-order marks, and undecodable filesystem bytes from hiding
extensions or producing misleading package inventories.

## Cross-platform extraction safety

The validator checks every component after Unicode **NFKC compatibility
normalization** without rewriting or renaming the original filename.
Windows-invalid punctuation (`< > : " / \\ | ? *`), DOS devices including
`CONIN$`, `CONOUT$`, and `CLOCK$`, spaced DOS device aliases such as
`CON .txt` and `COM¹ .data`, and fullwidth/superscript aliases
of reserved names are rejected. Names that normalize into hidden dotfiles,
`.` or `..`, separators, or trailing ASCII/Unicode spaces are also
rejected. NFKC-equivalent names cannot coexist in the ZIP even if Linux
would permit both. This closes extraction ambiguity and path-aliasing
risks while keeping ordinary unique multilingual names intact.

The private-file denylist is evaluated against the same NFKC/casefolded
basename as portability checks. Thus `secret．pem`, fullwidth
`credentials.json` aliases, compatibility `id_rsa` aliases, and nested
`backup．bak` cannot evade the extension/name guard. Ordinary unique CJK
filenames, including compatibility punctuation with safe extensions, remain
accepted. Literal `.env` files retain the existing hidden-path diagnostic.

The Git-backed release builder regression suite
(`tests/test_release_manifest_guard.py`) exercises invalid punctuation,
device names, fullwidth path aliases, compatibility collisions and valid
CJK/Arabic/emoji filenames. It must pass without relaxing the existing
reproducibility, symlink or private-file guards.

This restriction applies **only to release filenames**, not to post content,
site language, typography, RTL layout, or Gutenberg blocks. Ordinary Chinese,
Japanese, Korean, Arabic, Hebrew, emoji, and combining-mark filenames remain
supported unless they collide under the existing portable-name rules.

Regression: `python3 -m unittest tests/test_release_unicode_paths.py`
exercises 18 actual Git-backed staging cases. The normal CI static quality job
discovers `test_*.py` and must pass for the exact PR HEAD. A passing local
test is not a substitute for GitHub Actions, WordPress.org Theme Check, or
a review of real WordPress+Chromium screenshots.
