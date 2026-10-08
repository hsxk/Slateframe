#!/usr/bin/env python3
"""Validate the complete, non-interlaced WordPress theme screenshot PNG stream."""
import argparse
import struct
import sys
import zlib
from pathlib import Path


def validate(path: Path) -> None:
    data = path.read_bytes()
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('invalid PNG signature')
    offset, header, payload, ended = 8, None, bytearray(), False
    while offset < len(data):
        if len(data) - offset < 12:
            raise ValueError('truncated PNG chunk header')
        size = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + size
        if end > len(data):
            raise ValueError(f'truncated {kind.decode("ascii", "replace")} chunk: declared {size} bytes')
        content = data[offset + 8:offset + 8 + size]
        expected_crc = struct.unpack_from('>I', data, offset + 8 + size)[0]
        if zlib.crc32(kind + content) & 0xffffffff != expected_crc:
            raise ValueError(f'CRC mismatch in {kind!r}')
        if kind == b'IHDR':
            if header is not None or size != 13:
                raise ValueError('duplicate or malformed IHDR')
            header = struct.unpack('>IIBBBBB', content)
        elif kind == b'IDAT':
            payload.extend(content)
        elif kind == b'IEND':
            if size or end != len(data):
                raise ValueError('invalid IEND or trailing data')
            ended = True
        offset = end
    if header is None or not ended or not payload:
        raise ValueError('PNG missing required chunks')
    width, height, depth, color, compression, filtering, interlace = header
    if (width, height) != (1200, 900):
        raise ValueError(f'expected 1200x900, found {width}x{height}')
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}.get(color)
    if not channels or depth not in (1, 2, 4, 8, 16) or compression or filtering or interlace:
        raise ValueError('unsupported PNG format; export a non-interlaced standard PNG')
    stride = (width * depth * channels + 7) // 8
    raw = zlib.decompress(payload)
    if len(raw) != height * (stride + 1):
        raise ValueError('decompressed pixel stream has wrong length')
    if any(raw[row * (stride + 1)] > 4 for row in range(height)):
        raise ValueError('invalid PNG scanline filter')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('path', type=Path)
    args = parser.parse_args()
    try:
        validate(args.path)
    except (ValueError, zlib.error) as exc:
        print(f'Invalid Slateframe screenshot: {exc}', file=sys.stderr)
        sys.exit(1)
    print(f'Valid Slateframe screenshot: {args.path}')