#!/usr/bin/env python3
"""Require genuine viewport-sized 400% Core prose screenshots from Chromium."""

from pathlib import Path
import struct
import sys
import zlib

CAPTURES = tuple(
    f"core-{block}-390-{direction}-400.png"
    for block in ("heading", "read-more", "post-excerpt")
    for direction in ("ltr", "rtl")
)
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def check_capture(path: Path) -> None:
    data = path.read_bytes()
    if len(data) < 33 or data[:8] != PNG_SIGNATURE:
        raise ValueError(f"{path.name}: missing PNG signature")
    length = struct.unpack(">I", data[8:12])[0]
    if length != 13 or data[12:16] != b"IHDR":
        raise ValueError(f"{path.name}: invalid IHDR")
    expected_crc = struct.unpack(">I", data[29:33])[0]
    actual_crc = zlib.crc32(data[12:29]) & 0xFFFFFFFF
    if actual_crc != expected_crc:
        raise ValueError(f"{path.name}: corrupt IHDR")
    width, height = struct.unpack(">II", data[16:24])
    if (width, height) != (390, 900):
        raise ValueError(f"{path.name}: expected 390x900 viewport, got {width}x{height}")


def verify(root: Path) -> None:
    for name in CAPTURES:
        check_capture(root / name)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_prose_zoom_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
