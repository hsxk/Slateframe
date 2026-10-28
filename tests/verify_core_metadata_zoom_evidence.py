#!/usr/bin/env python3
"""Fail closed on nine genuine 390x900 metadata and author 400% screenshots."""
from pathlib import Path
import sys

from verify_prose_zoom_evidence import check_capture

BLOCKS = ("post-terms", "post-author-name", "post-author-biography")
CAPTURES = tuple(
    f"core-{block}-390-{direction}-400{suffix}.png"
    for block in BLOCKS
    for direction, suffix in (
        ("ltr", ""), ("rtl", ""), ("rtl", "-forced-colors")
    )
)


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_capture(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_core_metadata_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
