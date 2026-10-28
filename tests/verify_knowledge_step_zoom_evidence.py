#!/usr/bin/env python3
"""Require complete, exact-viewport WordPress/Chromium Knowledge Steps evidence."""

from pathlib import Path
import sys

from verify_related_reading_zoom_evidence import check_complete_png

CAPTURES = (
    "knowledge-steps-390-ltr-400.png",
    "knowledge-steps-390-rtl-400.png",
    "knowledge-steps-390-rtl-400-forced-colors.png",
)


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_complete_png(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_knowledge_step_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
