#!/usr/bin/env python3
"""Verify real WordPress/Chromium Core Search button-inside 400% evidence."""
from pathlib import Path
import sys

from verify_related_reading_zoom_evidence import check_complete_png

CAPTURES = (
    "core-search-inside-390-ltr-400.png",
    "core-search-inside-390-rtl-400.png",
    "core-search-inside-390-rtl-400-forced-colors.png",
)


def verify(root: Path) -> None:
    for name in CAPTURES:
        path = root / name
        if any(part.is_symlink() for part in (path, *path.parents)):
            raise ValueError(f"{name}: linked screenshot")
        check_complete_png(path)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_core_search_inside_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
