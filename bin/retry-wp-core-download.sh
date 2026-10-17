#!/usr/bin/env bash
# Retry only transient WordPress.org DNS/connection failures during ephemeral CI setup.
set -euo pipefail
if [[ "$#" -lt 1 ]]; then
  echo 'Usage: retry-wp-core-download.sh --path=... --version=...' >&2
  exit 2
fi
log_file="$(mktemp)"
trap 'rm -f "$log_file"' EXIT
for attempt in 1 2 3; do
  if wp core download --force "$@" >"$log_file" 2>&1; then
    cat "$log_file"
    exit 0
  fi
  cat "$log_file" >&2
  if ! grep -Eiq 'cURL error (6|7|28)|[Rr]esolv(ing|e) timed out|[Cc]ould not resolve host|[Tt]emporary failure in name resolution|[Cc]onnection timed out' "$log_file"; then
    echo 'WordPress download failed for a non-transient reason; not retrying.' >&2
    exit 1
  fi
  if [[ "$attempt" -eq 3 ]]; then
    echo 'WordPress.org download still unavailable after three bounded attempts.' >&2
    exit 1
  fi
  echo "WordPress.org transient connection failure; retry $((attempt + 1))/3." >&2
  sleep "$((attempt * 5))"
done
