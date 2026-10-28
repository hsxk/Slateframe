#!/usr/bin/env python3
"""Require real 390x900 Core Post Date 400% viewport evidence."""

from pathlib import Path
import sys

from verify_prose_zoom_evidence import check_capture

CAPTURES = (
    "core-post-date-390-ltr-400.png",
    "core-post-date-390-rtl-400.png",
    "core-post-date-390-rtl-400-forced-colors.png",
)


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_capture(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_core_post_date_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
