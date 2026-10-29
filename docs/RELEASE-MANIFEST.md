# Release package provenance and safety

Slateframe's release ZIP is built only from files committed to the current Git
`HEAD`. The packaging script stages files using `.distignore`, then validates
the staged tree against `git ls-tree -r HEAD`, including exact Git blob IDs.
Untracked or staged-only files, modified-but-uncommitted tracked files, staged
bytes differing from HEAD, hidden paths, private-key/backup file extensions,
symlinks, special files, and directories without packaged files (including empty
directories from excluded source paths) are rejected before any helper opens
a staged file. Nonportable path components (Windows device names, backslashes,
colons, control characters, trailing dots/spaces) and case-insensitive or
Unicode-normalization filename collisions are rejected. The manifest is
validated again after screenshot validation, so helpers cannot inject extra
files or directories.

The normal `dist/` folder is excluded from staging. Custom output directories
must be outside the repository and cannot be the filesystem root, to
prevent rsync recursion or unsafe cleanup of root-level output paths.
The ZIP uses a stable `SOURCE_DATE_EPOCH` and sorted paths; identical commits
and epochs should produce byte-identical archives across push and PR contexts.

Run the release-specific integration tests with:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
```

Run `bash bin/build-theme-zip.sh` from a **clean, committed** checkout. Do not
use the release archive as a place to store build logs, credentials, private
photos, or generated development fixtures. These controls complement, rather
than replace, manual release review and WordPress.org Theme Check.

## CI artifact provenance

The successful **WordPress.org Theme Check** job now uploads a `slateframe-distribution` artifact containing the actual validated `slateframe.zip`, a `HEAD_SHA.txt` with the exact checked-out commit, and `SHA256SUMS` for the ZIP bytes. This is evidence, not an automatic publication. The job verifies its checkout matches the PR head (or main push SHA), writes the checksum only after the production builder and Theme Check pass, and fails if the ZIP is absent or its checksum disagrees. The upload is uncompressed at the artifact transport layer; it does not change the reproducible theme ZIP.

For an extracted artifact, independently run:

```sh
sha256sum --check SHA256SUMS
unzip -t slateframe.zip
cat HEAD_SHA.txt
```

Match `HEAD_SHA.txt` to the intended GitHub Actions run and PR head. Compare the `slateframe.zip` SHA-256 between the successful PR and main-push artifacts: it must be identical when the distributable tree is unchanged. The archive contains only `.distignore`-permitted theme files; `HEAD_SHA.txt` and `SHA256SUMS` are **outside** the theme ZIP. Do not use an artifact from a failed or older SHA as acceptance evidence. Retention is seven days.

