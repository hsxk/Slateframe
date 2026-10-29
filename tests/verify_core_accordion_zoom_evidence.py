#!/usr/bin/env python3
"""Verify mandatory real WordPress Core Accordion 400% PNG evidence."""
from pathlib import Path
import sys
from verify_related_reading_zoom_evidence import check_complete_png

CAPTURES = (
    "core-accordion-390-ltr-400.png",
    "core-accordion-390-rtl-400.png",
    "core-accordion-390-rtl-400-forced-colors.png",
    "core-accordion-print-390-rtl-400.png",
)

def verify(root: Path) -> None:
    for name in CAPTURES:
        path = root / name
        if any(part.is_symlink() for part in (path, *path.parents)):
            raise ValueError(f"{name}: linked screenshot")
        check_complete_png(path)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_core_accordion_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
