#!/usr/bin/env python3
"""Validate a complete, standard non-interlaced WordPress screenshot PNG."""
import argparse
import struct
import sys
import zlib
from pathlib import Path

SIGNATURE = b'\x89PNG\r\n\x1a\n'
BIT_DEPTHS = {0: {1, 2, 4, 8, 16}, 2: {8, 16}, 3: {1, 2, 4, 8}, 4: {8, 16}, 6: {8, 16}}
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}


def validate(path: Path) -> None:
    data = path.read_bytes()
    if not data.startswith(SIGNATURE):
        raise ValueError('invalid PNG signature')

    offset, header, palette, payload = len(SIGNATURE), None, None, bytearray()
    state, ended = 'start', False
    while offset < len(data):
        if len(data) - offset < 12:
            raise ValueError('truncated PNG chunk header')
        size = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + size
        if end > len(data):
            raise ValueError(f'truncated {kind.decode("ascii", "replace")} chunk: declared {size} bytes')
        content = data[offset + 8:offset + 8 + size]
        crc = struct.unpack_from('>I', data, offset + 8 + size)[0]
        if zlib.crc32(kind + content) & 0xffffffff != crc:
            raise ValueError(f'CRC mismatch in {kind!r}')
        if state == 'start' and kind != b'IHDR':
            raise ValueError('IHDR must be the first chunk')
        if kind == b'IHDR':
            if state != 'start' or size != 13:
                raise ValueError('duplicate or malformed IHDR')
            header = struct.unpack('>IIBBBBB', content)
            state = 'header'
        elif kind == b'PLTE':
            if state != 'header' or palette is not None or not size or size % 3:
                raise ValueError('invalid or misplaced PLTE')
            palette = content
        elif kind == b'IDAT':
            if state not in ('header', 'image'):
                raise ValueError('IDAT chunks must be consecutive and precede IEND')
            payload.extend(content)
            state = 'image'
        elif kind == b'IEND':
            if state not in ('image', 'after-image') or size or end != len(data):
                raise ValueError('invalid IEND or trailing data')
            ended = True
            state = 'end'
        elif kind[0] & 0x20 == 0:
            raise ValueError(f'unsupported critical PNG chunk {kind!r}')
        elif state == 'image':
            state = 'after-image'
        offset = end
    if header is None or not ended or not payload:
        raise ValueError('PNG missing required chunks')

    width, height, depth, color, compression, filtering, interlace = header
    if (width, height) != (1200, 900):
        raise ValueError(f'expected 1200x900, found {width}x{height}')
    if depth not in BIT_DEPTHS.get(color, set()) or compression or filtering or interlace:
        raise ValueError('unsupported PNG format; export a non-interlaced standard PNG')
    if color == 3 and (palette is None or len(palette) // 3 > 2 ** depth):
        raise ValueError('indexed PNG requires a palette matching its bit depth')
    if color in (0, 4) and palette is not None:
        raise ValueError('grayscale PNG cannot contain a palette')
    if palette is not None and len(palette) // 3 > 256:
        raise ValueError('PNG palette exceeds 256 entries')

    stride = (width * depth * CHANNELS[color] + 7) // 8
    expected = height * (stride + 1)
    decompressor = zlib.decompressobj()
    raw = decompressor.decompress(payload, expected + 1)
    if len(raw) != expected or not decompressor.eof or decompressor.unused_data or decompressor.unconsumed_tail:
        raise ValueError('invalid or trailing compressed pixel data')
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
