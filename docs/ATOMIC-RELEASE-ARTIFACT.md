# Atomic Slateframe release ZIP replacement

`bin/build-theme-zip.sh` must never delete the last known-good `slateframe.zip` before a replacement is fully built and validated. The earlier builder removed both the staged theme and the prior ZIP before checking the manifest and screenshot. A failing screenshot check therefore destroyed the previous distributable, even though its bytes were valid.

The builder now validates the staging tree as before, writes the new ZIP to a hidden `mktemp` file in the destination directory, sets its mode to `0644`, and atomically renames it to `slateframe.zip` only after the ZIP writer exits successfully. The `EXIT` trap removes temporary ZIP files on errors. A directory at the target ZIP path is rejected before staging cleanup. Existing output-path symlink and SOURCE_DATE_EPOCH guards are retained. The staged `dist/slateframe/` directory remains available to CI after a successful build.

`tests/test_release_atomicity.py` runs the real builder in disposable Git fixtures, including injected partial ZIP-writer and atomic-rename failures. It checks screenshot/manifest failure preservation, missing files, staged symlinks, invalid epochs, nonportable destination types, ZIP permissions, cleanup, deterministic successive builds, and external output paths. The tests use stub screenshot and manifest helpers to isolate **the builder's replacement semantics**; they do not replace the existing dedicated screenshot and manifest test suites.

Release builds retain the existing deterministic ZIP member order, timestamps and permissions. A successful local replay is not a substitute for exact-HEAD GitHub Actions checks.

Every future change must pass Theme quality, Photography, reproducibility, WordPress.org packaging, and exact-SHA screenshot review before merge. No production site or personal data is involved.

The ZIP writer rejects non-regular staged entries (such as named pipes or devices) before opening the output archive. Without this check, a FIFO can block indefinitely during `Path.read_bytes()`. The regression suite covers top-level and nested FIFOs, with and without an existing release ZIP.

Before the atomic rename, the builder now opens the compressed ZIP and verifies unique member names, the `slateframe/` root prefix, and every entry CRC. A corrupt temporary archive must not replace a previous valid release. Failure injection tests verify this both with and without an existing release.

The post-write archive gate additionally rejects duplicate members, traversal or malformed paths, entries outside `slateframe/`, and missing mandatory theme files. This checks the actual artifact rather than trusting only staging-tree validation.

The archive path check rejects `.`/`..`, repeated separators, backslashes and
members outside the `slateframe/` root. This is defense in depth: the existing
`check-package-manifest.py` already rejects special staged files and invalid
paths, but the final ZIP is also verified after compression so corruption or
unexpected output cannot replace the last valid distributable.

## Compressed output attestation

The ZIP verifier compares its complete member inventory to the staged theme,
not just the six required files. It refuses extra and missing members, symlink
or executable metadata, unexpected compression/platform attributes, encrypted
entries, and archive/member comments. For each regular file, a streaming SHA256
comparison verifies that the decompressed ZIP bytes match the validated staged
file. CRC checks remain in place to catch compressed data corruption.

This is an additional defense against a ZIP writer or post-processing step
producing a structurally valid but different package. It does not replace the
source manifest, WordPress.org Theme Check, or a new-SHA GitHub Actions run.

## Final ZIP-to-HEAD attestation

After structural and staged-byte checks, `bin/verify-package-head.py` hashes
actual decompressed ZIP members with Git's object-format-aware `hash-object --stdin` and compares them with committed `HEAD` blob IDs. This prevents a
staging rewrite between preflight and ZIP writing from silently replacing the
release bytes while retaining valid CRCs. Failed attestation preserves the
last known-good ZIP; see [exact-HEAD integrity](FINAL-ARCHIVE-HEAD-INTEGRITY.md).
