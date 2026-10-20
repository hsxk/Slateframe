#!/usr/bin/env python3
"""Validate a complete, standard non-interlaced WordPress screenshot PNG."""
import argparse
import os
import stat
import struct
import sys
import zlib
from pathlib import Path

SIGNATURE = b'\x89PNG\r\n\x1a\n'
MAX_FILE_BYTES = 20 * 1024 * 1024
# Release screenshots are public assets. Do not ship EXIF, XMP, free-text,
# compressed text or creation timestamps that could disclose private data.
PRIVATE_METADATA_CHUNKS = frozenset((b'eXIf', b'iTXt', b'tEXt', b'zTXt', b'tIME'))
ANIMATION_CHUNKS = frozenset((b'acTL', b'fcTL', b'fdAT'))
BIT_DEPTHS = {0: {1, 2, 4, 8, 16}, 2: {8, 16}, 3: {1, 2, 4, 8}, 4: {8, 16}, 6: {8, 16}}
CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
SECURE_OPENAT_AVAILABLE = (hasattr(os, 'O_NOFOLLOW') and hasattr(os, 'O_DIRECTORY') and
                           os.open in os.supports_dir_fd)


def open_screenshot_nofollow(path: Path) -> int:
    """Open each path component relative to an anchored directory descriptor.

    O_NOFOLLOW on the final file alone does not protect against a parent
    directory being replaced with a symlink between preflight and open.
    Release CI runs on POSIX; fail closed if secure openat is unavailable.
    """
    if not SECURE_OPENAT_AVAILABLE:
        raise ValueError('secure screenshot path open unsupported')
    components = Path(os.path.abspath(path)).parts
    if len(components) < 2:
        raise ValueError('screenshot must be a regular file')
    close_on_exec = getattr(os, 'O_CLOEXEC', 0)
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | close_on_exec
    file_flags = os.O_RDONLY | os.O_NOFOLLOW | getattr(os, 'O_NONBLOCK', 0) | close_on_exec
    directory_fd = os.open(components[0], directory_flags)
    try:
        for component in components[1:-1]:
            next_fd = os.open(component, directory_flags, dir_fd=directory_fd)
            os.close(directory_fd)
            directory_fd = next_fd
        return os.open(components[-1], file_flags, dir_fd=directory_fd)
    finally:
        os.close(directory_fd)


def validate(path: Path) -> None:
    # Release assets are read from the checkout, never through a linked path.
    # Bound allocation before reading a potentially malformed screenshot.
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError('symlinked screenshot path')
    try:
        # Every directory is anchored and opened with O_NOFOLLOW, so neither
        # the parent nor the leaf can be swapped for a symlink during open.
        descriptor = open_screenshot_nofollow(path)
        try:
            info = os.fstat(descriptor)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise ValueError('non-regular or hardlinked screenshot')
            if info.st_size > MAX_FILE_BYTES:
                raise ValueError('oversized screenshot PNG')
            with os.fdopen(descriptor, 'rb', closefd=False) as source:
                data = source.read(MAX_FILE_BYTES + 1)
        finally:
            os.close(descriptor)
    except OSError as error:
        raise ValueError('unreadable screenshot PNG') from error
    if len(data) > MAX_FILE_BYTES:
        raise ValueError('oversized screenshot PNG')
    if not data.startswith(SIGNATURE):
        raise ValueError('invalid PNG signature')

    offset, header, palette, transparency, payload = len(SIGNATURE), None, None, None, bytearray()
    state, ended = 'start', False
    private_metadata = set()
    animation_chunks = set()
    while offset < len(data):
        if len(data) - offset < 12:
            raise ValueError('truncated PNG chunk header')
        size = struct.unpack_from('>I', data, offset)[0]
        kind = data[offset + 4:offset + 8]
        if len(kind) != 4 or not all(65 <= letter <= 90 or 97 <= letter <= 122 for letter in kind):
            raise ValueError('invalid PNG chunk type')
        if kind[2] & 32:
            raise ValueError('invalid PNG reserved chunk bit')
        end = offset + 12 + size
        if end > len(data):
            raise ValueError(f'truncated {kind.decode("ascii", "replace")} chunk: declared {size} bytes')
        content = data[offset + 8:offset + 8 + size]
        crc = struct.unpack_from('>I', data, offset + 8 + size)[0]
        if zlib.crc32(kind + content) & 0xffffffff != crc:
            raise ValueError(f'CRC mismatch in {kind!r}')
        if kind in PRIVATE_METADATA_CHUNKS:
            private_metadata.add(kind)
        if kind in ANIMATION_CHUNKS:
            animation_chunks.add(kind)
        if state == 'start' and kind != b'IHDR':
            raise ValueError('IHDR must be the first chunk')
        if kind == b'IHDR':
            if state != 'start' or size != 13:
                raise ValueError('duplicate or malformed IHDR')
            header = struct.unpack('>IIBBBBB', content)
            state = 'header'
        elif kind == b'PLTE':
            if state != 'header' or palette is not None or transparency is not None or not size or size % 3:
                raise ValueError('invalid or misplaced PLTE')
            palette = content
        elif kind == b'tRNS':
            # PNG transparency must precede image data. Its legal length
            # depends on the IHDR color type and, for indexed PNG, PLTE.
            if state != 'header' or transparency is not None or header is None:
                raise ValueError('duplicate or misplaced PNG transparency')
            color = header[3]
            if color == 3:
                if palette is None or not 1 <= size <= len(palette) // 3:
                    raise ValueError('indexed PNG transparency exceeds palette')
            elif color == 0:
                if size != 2:
                    raise ValueError('invalid grayscale PNG transparency')
                if struct.unpack('>H', content)[0] >= 1 << header[2]:
                    raise ValueError('grayscale PNG transparency sample exceeds bit depth')
            elif color == 2:
                if size != 6:
                    raise ValueError('invalid truecolor PNG transparency')
                if any(sample >= 1 << header[2] for sample in struct.unpack('>HHH', content)):
                    raise ValueError('truecolor PNG transparency sample exceeds bit depth')
            else:
                raise ValueError('PNG alpha color type forbids transparency chunk')
            transparency = content
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
    # Defer this gate until after chunk-order checks so malformed IDAT
    # sequences keep their precise structural diagnostic.
    if private_metadata:
        raise ValueError('release screenshot contains embedded metadata: ' +
                         ', '.join(sorted(kind.decode('ascii') for kind in private_metadata)))
    if animation_chunks:
        raise ValueError('release screenshot must be static PNG, not animated: ' +
                         ', '.join(sorted(kind.decode('ascii') for kind in animation_chunks)))

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
    if color == 3 and len(palette) // 3 < (1 << depth):
        # A syntactically valid IDAT can still reference a non-existent PLTE
        # entry. PNG filters operate on bytes, including packed 1/2/4-bit
        # samples, so reconstruct rows before validating palette indices.
        colors = len(palette) // 3
        previous = bytearray(stride)
        mask = (1 << depth) - 1
        for row_number in range(height):
            start = row_number * (stride + 1)
            filter_type = raw[start]
            current = bytearray(raw[start + 1:start + 1 + stride])
            if filter_type:
                for index in range(stride):
                    left = current[index - 1] if index else 0
                    above = previous[index]
                    upper_left = previous[index - 1] if index else 0
                    if filter_type == 1:
                        predictor = left
                    elif filter_type == 2:
                        predictor = above
                    elif filter_type == 3:
                        predictor = (left + above) // 2
                    else:
                        estimate = left + above - upper_left
                        distances = (abs(estimate - left), abs(estimate - above),
                                     abs(estimate - upper_left))
                        predictor = (left, above, upper_left)[distances.index(min(distances))]
                    current[index] = (current[index] + predictor) & 255
            for pixel in range(width):
                bit_offset = pixel * depth
                palette_index = (current[bit_offset // 8] >>
                                 (8 - depth - bit_offset % 8)) & mask
                if palette_index >= colors:
                    raise ValueError('indexed PNG references missing palette entry')
            previous = current


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
