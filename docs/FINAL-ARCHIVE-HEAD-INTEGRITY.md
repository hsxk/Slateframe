# Final release archive: exact-HEAD attestation

The release builder validates the staged tree before and after screenshot checks,
then validates ZIP structure, member inventory, permissions, CRCs, and content
against staging. These checks alone cannot prove the **final compressed bytes**
still match the Git commit if staging changes between preflight and the ZIP
writer. A successful CRC is not a source-revision signature.

Before the atomic rename, `bin/verify-package-head.py` independently reads
regular file blob IDs from `git ls-tree -r -z HEAD` and hashes every
**decompressed ZIP member** with Git's own `hash-object --stdin`. It rejects
members outside `slateframe/`, uncommitted member names, and bytes that differ
from the exact HEAD blob. Git's hashing command supports both SHA-1 and SHA-256
repositories; no text decoding, Git filters, or archive CRC assumptions are
used for content equality.

This is a final artifact-to-source check, not an alternative to the existing
staged manifest, ZIP inventory/metadata verification, or WordPress.org gates.
The atomic replacement happens **only after** all checks succeed. A rejected
build leaves the previous `slateframe.zip` untouched and removes the temporary
ZIP. Runtime theme behavior, WordPress content, site URLs, and editor output
are unchanged.

`tests/test_release_head_integrity.py` checks valid multilingual paths,
same-length and different-length tampering with valid ZIP CRCs, uncommitted
worktree bytes, untracked members, wrong theme roots, corrupt archives, and
Git SHA-256 object format. `tests/test_release_manifest_guard.py` also
injects a staging rewrite *after* the normal manifest checks but *before*
ZIP writing, proving that the final HEAD gate rejects it without replacing a
known-good archive.

Run `python3 -m unittest discover -s tests -p 'test_*.py'`. Merge only after
Theme quality and Photography Actions pass for the exact PR HEAD and the
real WordPress/Chromium screenshots are downloaded and visually inspected.

## Standalone ZIP metadata defense

The final verifier also rejects empty archives, duplicate member names, unsafe or ambiguous path components, backslash separators, ZIP comments, encrypted entries, non-regular Unix member types (including symlinks and FIFOs), and case-folded/NFKC filename collisions. This complements, rather than replaces, the builder's stricter staged manifest and exact ZIP permission checks. `tests/test_release_zip_metadata.py` exercises 18 independent acceptance/rejection cases against a temporary Git repository; no WordPress runtime behavior or release budget is changed.
