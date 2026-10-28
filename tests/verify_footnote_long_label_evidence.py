#!/usr/bin/env python3
"""Validate exact 390x900 WordPress/Chromium Core Footnotes 400% evidence."""
from pathlib import Path
import sys
from verify_footnotes_screenshots import validate_png

CAPTURES = (
    "core-footnotes-long-return-390-ltr-400.png",
    "core-footnotes-long-return-390-rtl-400.png",
    "core-footnotes-long-return-390-rtl-400-forced-colors.png",
)


def verify(directory: Path) -> None:
    for name in CAPTURES:
        dimensions = validate_png(directory / name, 390)
        if dimensions != (390, 900):
            raise ValueError(f"wrong 390x900 viewport for {name}: {dimensions}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_footnote_long_label_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(f"Core Footnotes 400% evidence rejected: {error}") from error
