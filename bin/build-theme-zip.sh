#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${1:-$ROOT/dist}"
THEME_DIR="$DIST_DIR/slateframe"
ZIP_FILE="$DIST_DIR/slateframe.zip"

rm -rf "$THEME_DIR" "$ZIP_FILE"
mkdir -p "$THEME_DIR"

rsync -a 	--exclude-from="$ROOT/.distignore" 	"$ROOT/" 	"$THEME_DIR/"

(
	cd "$DIST_DIR"
	zip -qr "slateframe.zip" "slateframe"
)

test -f "$ZIP_FILE"
test -f "$THEME_DIR/style.css"
test -f "$THEME_DIR/functions.php"
test -f "$THEME_DIR/theme.json"
test -f "$THEME_DIR/screenshot.png"

php -r '$size=getimagesize($argv[1]); if (!$size || $size[0] !== 1200 || $size[1] !== 900) { throw new RuntimeException("screenshot.png must be 1200x900"); }' "$THEME_DIR/screenshot.png"

printf 'Built %s\n' "$ZIP_FILE"
