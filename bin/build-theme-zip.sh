#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${1:-$ROOT/dist}"
THEME_DIR="$DIST_DIR/slateframe"
ZIP_FILE="$DIST_DIR/slateframe.zip"
# Synthetic PR merge commits have different timestamps from branch push commits.
# Use a stable default; release tooling can explicitly override it.
SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-946684800}"

rm -rf "$THEME_DIR" "$ZIP_FILE"
mkdir -p "$THEME_DIR"

rsync -a --delete --exclude-from="$ROOT/.distignore" "$ROOT/" "$THEME_DIR/"

test -f "$THEME_DIR/style.css"
test -f "$THEME_DIR/functions.php"
test -f "$THEME_DIR/theme.json"
test -f "$THEME_DIR/readme.txt"
test -f "$THEME_DIR/LICENSE"
test -f "$THEME_DIR/screenshot.png"

python3 "$ROOT/bin/check-screenshot.py" "$THEME_DIR/screenshot.png"

SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" python3 - "$DIST_DIR" "$THEME_DIR" "$ZIP_FILE" <<'PY'
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
    if item.is_symlink():
        raise SystemExit(f"Refusing symbolic link in theme package: {item.relative_to(dist_dir)}")

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

test -f "$ZIP_FILE"
printf 'Built %s\n' "$ZIP_FILE"
