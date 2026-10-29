#!/usr/bin/env python3
"""Verify complete exact-viewport native Core Comments screenshots."""
from pathlib import Path
import struct
import sys
import zlib

CAPTURES = {
    "core-comments-thread-390-rtl-400.png": (390, 900),
    "core-comments-thread-1440-ltr.png": (1440, 900),
}

def verify(root: Path) -> None:
    for name, dimensions in CAPTURES.items():
        path = root / name
        if path.is_symlink():
            raise ValueError(f"{name}: linked screenshot")
        data = path.read_bytes()
        if len(data) < 45 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError(f"{name}: invalid PNG signature")
        if data[12:16] != b"IHDR" or struct.unpack(">I", data[8:12])[0] != 13:
            raise ValueError(f"{name}: invalid PNG header")
        if struct.unpack(">II", data[16:24]) != dimensions:
            raise ValueError(f"{name}: wrong viewport dimensions")
        depth, color, compression, filtering, interlace = struct.unpack(">BBBBB", data[24:29])
        if depth != 8 or color not in (2, 6) or (compression, filtering, interlace) != (0, 0, 0):
            raise ValueError(f"{name}: unsupported PNG encoding")
        channels = 3 if color == 2 else 4
        offset, has_image, has_end, compressed = 8, False, False, bytearray()
        while offset < len(data):
            if offset + 12 > len(data):
                raise ValueError(f"{name}: truncated PNG chunk")
            length = struct.unpack(">I", data[offset:offset + 4])[0]
            end = offset + 12 + length
            if end > len(data):
                raise ValueError(f"{name}: truncated PNG chunk")
            kind = data[offset + 4:offset + 8]
            crc = zlib.crc32(data[offset + 4:end - 4]) & 0xFFFFFFFF
            if crc != struct.unpack(">I", data[end - 4:end])[0]:
                raise ValueError(f"{name}: corrupt PNG chunk")
            if kind == b"IDAT":
                has_image = True
                compressed.extend(data[offset + 8:end - 4])
            if kind == b"IEND":
                if length or end != len(data):
                    raise ValueError(f"{name}: invalid PNG end")
                has_end = True
                break
            offset = end
        if not has_image or not has_end:
            raise ValueError(f"{name}: incomplete PNG")
        try:
            raw = zlib.decompress(bytes(compressed))
        except zlib.error as error:
            raise ValueError(f"{name}: invalid PNG pixels") from error
        width, height = dimensions
        if len(raw) != height * (1 + width * channels):
            raise ValueError(f"{name}: invalid PNG pixel length")
        if any(raw[row * (1 + width * channels)] > 4 for row in range(height)):
            raise ValueError(f"{name}: invalid PNG row filter")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: verify_core_comments_thread_evidence.py SCREENSHOT_DIRECTORY")
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
