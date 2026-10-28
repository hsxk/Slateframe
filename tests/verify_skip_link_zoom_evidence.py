#!/usr/bin/env python3
"""Verify 390x900 viewport evidence for the focused Core-first skip link."""

from pathlib import Path
import sys

from verify_prose_zoom_evidence import check_capture

CAPTURES = (
    "skip-link-390-ltr-400.png",
    "skip-link-390-rtl-400.png",
    "skip-link-390-rtl-400-forced-colors.png",
)


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_capture(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_skip_link_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
