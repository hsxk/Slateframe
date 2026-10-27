#!/usr/bin/env python3
"""Require genuine 390x900 viewport evidence for Core quotation 400% reflow."""

from pathlib import Path
import sys

from verify_prose_zoom_evidence import check_capture

CAPTURES = tuple(
    f"core-{block}-390-{direction}-400.png"
    for block in ("quote", "pullquote", "verse")
    for direction in ("ltr", "rtl")
) + tuple(
    f"core-{block}-390-rtl-400-forced-colors.png"
    for block in ("quote", "pullquote", "verse")
)


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_capture(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_quotation_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
