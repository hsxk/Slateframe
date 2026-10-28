#!/usr/bin/env python3
"""Fail closed when the Core Embed 400% forced-colors screenshot is missing or invalid."""
from pathlib import Path
import sys

from verify_prose_zoom_evidence import check_capture

CAPTURE = "core-embed-390-rtl-400-forced-colors.png"


def verify(root: Path) -> None:
    check_capture(root / CAPTURE)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_core_embed_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
