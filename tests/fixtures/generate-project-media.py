#!/usr/bin/env python3
"""Create reproducible, site-neutral raster fixtures for WordPress browser tests."""

import math
import struct
import sys
import zlib
from pathlib import Path


def chunk(kind, data):
    return struct.pack("!I", len(data)) + kind + data + struct.pack("!I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def render(path, width, height, variant):
    pixels = bytearray()
    for y in range(height):
        pixels.append(0)
        for x in range(width):
            horizon = height * (0.61 + 0.075 * math.sin(x / width * math.pi * 2 + variant))
            sun_x = width * (0.73 if variant == 0 else 0.25)
            sun = (x - sun_x) ** 2 + (y - height * 0.23) ** 2 < (min(width, height) * 0.065) ** 2
            if sun:
                rgb = (247, 242, 223)
            elif y < horizon:
                tint = int(12 * y / height)
                rgb = (214 - 8 * variant - tint, 225 - 8 * variant - tint, 220 - 3 * variant - tint)
            else:
                depth = int(12 * (y - horizon) / height)
                rgb = (89 + 11 * variant - depth, 113 - 8 * variant - depth, 105 - 4 * variant - depth)
            pixels.extend(rgb)
    header = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(pixels, 9))
        + chunk(b"IEND", b"")
    )


def main(destination):
    folder = Path(destination)
    folder.mkdir(parents=True, exist_ok=True)
    render(folder / "slateframe-project-landscape.png", 1200, 900, 0)
    render(folder / "slateframe-project-portrait.png", 900, 1200, 1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: generate-project-media.py DESTINATION_DIRECTORY")
    main(sys.argv[1])
