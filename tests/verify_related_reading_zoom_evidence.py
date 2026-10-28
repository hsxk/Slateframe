#!/usr/bin/env python3
"""Require complete 390x900 PNGs for WordPress discovery and 404 reflow."""
from pathlib import Path
import struct
import sys
import zlib

from verify_prose_zoom_evidence import check_capture

CAPTURES = (
    "related-reading-390-ltr-400.png",
    "related-reading-390-rtl-400.png",
    "related-reading-390-rtl-400-forced-colors.png",
    "404-recovery-390-rtl-400-forced-colors.png",
    "post-navigation-390-ltr-400.png",
    "post-navigation-390-rtl-400.png",
    "post-navigation-390-rtl-400-forced-colors.png",
)


def check_complete_png(path: Path) -> None:
    """Reject truncated chunks, bad CRCs, and missing image data or IEND."""
    check_capture(path)
    data = path.read_bytes()
    offset = 8
    saw_image = False
    saw_end = False
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError(f"{path.name}: truncated PNG chunk")
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        end = offset + 12 + length
        if end > len(data):
            raise ValueError(f"{path.name}: truncated PNG chunk")
        kind = data[offset + 4:offset + 8]
        crc = struct.unpack(">I", data[end - 4:end])[0]
        if zlib.crc32(data[offset + 4:end - 4]) & 0xFFFFFFFF != crc:
            raise ValueError(f"{path.name}: corrupt PNG chunk")
        if kind == b"IDAT":
            saw_image = True
        if kind == b"IEND":
            if length != 0 or end != len(data):
                raise ValueError(f"{path.name}: invalid PNG end")
            saw_end = True
            break
        offset = end
    if not saw_image or not saw_end:
        raise ValueError(f"{path.name}: incomplete PNG")


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_complete_png(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_related_reading_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
