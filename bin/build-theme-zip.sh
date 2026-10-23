#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${1:-$ROOT/dist}"
THEME_DIR="$DIST_DIR/slateframe"
ZIP_FILE="$DIST_DIR/slateframe.zip"
# Synthetic PR merge commits have different timestamps from branch push commits.
# Use a stable default; release tooling can explicitly override it.
SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-946684800}"

# An arbitrary output folder under the source tree can recursively copy
# itself with rsync. The default dist/ is explicitly excluded by .distignore.
SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" python3 - "$ROOT" "$DIST_DIR" <<'PY_OUTPUT_GUARD'
import os
import sys
from pathlib import Path

# Validate before rm -rf: malformed or out-of-range epochs must not destroy a prior ZIP.
try:
    epoch = int(os.environ["SOURCE_DATE_EPOCH"])
except ValueError:
    raise SystemExit("SOURCE_DATE_EPOCH must be an integer") from None
if epoch > 4354819199:
    raise SystemExit("SOURCE_DATE_EPOCH exceeds ZIP timestamp year 2107")

root = Path(sys.argv[1]).resolve()
# A symlinked output directory could redirect destructive cleanup to external files.
requested_output = Path(os.path.abspath(sys.argv[2]))
output = Path(os.path.realpath(sys.argv[2]))
if output != requested_output:
    raise SystemExit("Output directory must not traverse symbolic links")
if output == Path(output.anchor):
    raise SystemExit("Output directory must not be the filesystem root")
if output == root or (root in output.parents and output != root / "dist"):
    raise SystemExit("Output directory must be outside the repository or its default dist/ folder")
PY_OUTPUT_GUARD

# Preserve the last known-good ZIP until the new archive has passed every
# staging and validation gate. A directory at the target path is never a ZIP.
if [ -d "$ZIP_FILE" ]; then
    printf 'Refusing directory at theme ZIP destination: %s\n' "$ZIP_FILE" >&2
    exit 1
fi
rm -rf "$THEME_DIR"
mkdir -p "$THEME_DIR"

rsync -a --delete --exclude-from="$ROOT/.distignore" "$ROOT/" "$THEME_DIR/"

test -f "$THEME_DIR/style.css"
test -f "$THEME_DIR/functions.php"
test -f "$THEME_DIR/theme.json"
test -f "$THEME_DIR/readme.txt"
test -f "$THEME_DIR/LICENSE"
test -f "$THEME_DIR/screenshot.png"

# Validate before the screenshot checker reads any staged path and again
# after it runs, so a helper cannot accidentally add unchecked package files.
python3 "$ROOT/bin/check-package-manifest.py" "$ROOT" "$THEME_DIR"
python3 "$ROOT/bin/check-screenshot.py" "$THEME_DIR/screenshot.png"
python3 "$ROOT/bin/check-package-manifest.py" "$ROOT" "$THEME_DIR"

# mktemp creates the replacement on the destination filesystem, allowing an
# atomic rename after successful ZIP creation. Failed runs remove only their
# temporary archive, never the previous release.
TEMP_ZIP="$(mktemp "$DIST_DIR/.slateframe.zip.XXXXXXXX")"
trap 'rm -f -- "$TEMP_ZIP"' EXIT
SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" python3 - "$DIST_DIR" "$THEME_DIR" "$TEMP_ZIP" <<'PY'
import os
import sys
import time
import zipfile
from pathlib import Path

dist_dir = Path(sys.argv[1])
theme_dir = Path(sys.argv[2])
zip_file = Path(sys.argv[3])
epoch = max(int(os.environ["SOURCE_DATE_EPOCH"]), 315532800)
timestamp = time.gmtime(epoch)[:6]

# rsync preserves symbolic links. Refuse them before opening the ZIP so
# Path.read_bytes cannot dereference external/private files.
items = sorted(theme_dir.rglob("*"), key=lambda path: path.relative_to(dist_dir).as_posix())
for item in items:
    relative = item.relative_to(dist_dir)
    if item.is_symlink():
        raise SystemExit(f"Refusing symbolic link in theme package: {relative}")
    # A FIFO can block forever on read_bytes(); a device can expose host data.
    # A distributable theme consists only of directories and regular files.
    if not item.is_dir() and not item.is_file():
        raise SystemExit(f"Refusing non-regular entry in theme package: {relative}")

with zipfile.ZipFile(zip_file, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for item in items:
        relative = item.relative_to(dist_dir).as_posix()
        info = zipfile.ZipInfo(relative + ("/" if item.is_dir() else ""), timestamp)
        info.create_system = 3
        if item.is_dir():
            info.external_attr = (0o40755 << 16) | 0x10
            archive.writestr(info, b"")
            continue
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, item.read_bytes())
PY

# Verify the actual compressed bytes, not only the source tree and writer exit
# code, before replacing the last known-good release artifact.
python3 - "$TEMP_ZIP" "$THEME_DIR" <<'PY_VERIFY_ZIP'
import hashlib
import stat
import sys
import zipfile
import zlib
from pathlib import Path

staged = Path(sys.argv[2])
try:
    with zipfile.ZipFile(sys.argv[1], "r") as archive:
        names = archive.namelist()
        if not names or len(names) != len(set(names)):
            raise ValueError("empty archive or duplicate member names")
        def unsafe_member(name):
            parts = name.split("/")
            if name.endswith("/"):
                parts.pop()
            return (
                not name.startswith("slateframe/")
                or "\\" in name
                or any(part in ("", ".", "..") for part in parts)
            )

        if any(unsafe_member(name) for name in names):
            raise ValueError("unsafe archive member path")
        required = {
            "slateframe/style.css", "slateframe/functions.php",
            "slateframe/theme.json", "slateframe/readme.txt",
            "slateframe/LICENSE", "slateframe/screenshot.png",
        }
        if not required.issubset(names):
            raise ValueError("missing required theme files in ZIP")
        # The writer emits a precise snapshot of the validated staged theme.
        # A valid CRC alone cannot detect an injected or replaced file because
        # an attacker can recalculate CRC while rebuilding an archive.
        expected = {}
        for path in staged.rglob("*"):
            mode = path.lstat().st_mode
            if not (stat.S_ISREG(mode) or stat.S_ISDIR(mode)):
                raise ValueError(f"unsafe staged member during ZIP verification: {path}")
            name = "slateframe/" + path.relative_to(staged).as_posix()
            expected[name + ("/" if stat.S_ISDIR(mode) else "")] = path
        if set(names) != set(expected):
            raise ValueError("ZIP members differ from validated staged theme")
        if archive.comment:
            raise ValueError("unexpected ZIP archive comment")
        for info in archive.infolist():
            if info.flag_bits & 1 or info.comment:
                raise ValueError(f"unexpected ZIP member flags/comment: {info.filename}")
        damaged = archive.testzip()
        if damaged is not None:
            raise ValueError(f"CRC mismatch in {damaged}")
        for info in archive.infolist():
            path = expected[info.filename]
            directory = path.is_dir()
            expected_mode = 0o40755 if directory else 0o100644
            if (info.create_system != 3 or
                    (info.external_attr >> 16) != expected_mode or
                    info.is_dir() != directory):
                raise ValueError(f"unexpected ZIP member mode: {info.filename}")
            if info.compress_type != (zipfile.ZIP_STORED if directory else zipfile.ZIP_DEFLATED):
                raise ValueError(f"unexpected ZIP compression: {info.filename}")
            if directory:
                if info.file_size != 0:
                    raise ValueError(f"nonempty ZIP directory: {info.filename}")
                continue
            if info.file_size != path.stat().st_size:
                raise ValueError(f"ZIP content differs from staged file: {info.filename}")
            digest_zip = hashlib.sha256()
            digest_stage = hashlib.sha256()
            with archive.open(info) as zipped, path.open("rb") as original:
                while chunk := zipped.read(1024 * 1024):
                    digest_zip.update(chunk)
                while chunk := original.read(1024 * 1024):
                    digest_stage.update(chunk)
            if digest_zip.digest() != digest_stage.digest():
                raise ValueError(f"ZIP content differs from staged file: {info.filename}")
except (OSError, ValueError, zipfile.BadZipFile, zlib.error) as error:
    raise SystemExit(f"Refusing invalid theme ZIP: {error}") from error
PY_VERIFY_ZIP
chmod 0644 "$TEMP_ZIP"
# The source and destination are on the same filesystem; rename is atomic.
mv -f -- "$TEMP_ZIP" "$ZIP_FILE"
trap - EXIT
test -f "$ZIP_FILE"
printf 'Built %s\n' "$ZIP_FILE"
