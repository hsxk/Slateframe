#!/usr/bin/env python3
"""Fail closed when native Core RSS/Archives 400% RTL viewport evidence is absent."""
from pathlib import Path
import sys

from verify_prose_zoom_evidence import check_capture

CAPTURES = (
    "core-rss-390-rtl-400-forced-colors.png",
    "core-archives-390-rtl-400-forced-colors.png",
)


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_capture(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_core_feeds_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
