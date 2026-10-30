#!/usr/bin/env python3
"""Require complete, correctly sized native Footnotes WordPress screenshots."""
from pathlib import Path
import struct
import sys
import zlib

CAPTURES = {'core-footnotes-390-rtl-400.png': (390, 900),
            'core-footnotes-390-rtl-400-forced-colors.png': (390, 900),
            'core-footnotes-1440-ltr.png': (1440, 900)}

def verify(root: Path) -> None:
    for name, expected in CAPTURES.items():
        path = root / name
        if path.is_symlink():
            raise ValueError(f'{name}: linked screenshot')
        data = path.read_bytes()
        if len(data) < 45 or data[:8] != b'\x89PNG\r\n\x1a\n':
            raise ValueError(f'{name}: missing PNG signature')
        offset = 8
        header = image = ending = False
        while offset < len(data):
            if offset + 12 > len(data):
                raise ValueError(f'{name}: incomplete PNG')
            length = struct.unpack('>I', data[offset:offset+4])[0]
            end = offset + length + 12
            if end > len(data):
                raise ValueError(f'{name}: incomplete PNG')
            kind = data[offset+4:offset+8]
            crc = struct.unpack('>I', data[end-4:end])[0]
            if zlib.crc32(data[offset+4:end-4]) & 0xffffffff != crc:
                raise ValueError(f'{name}: corrupt PNG chunk')
            if not header:
                if kind != b'IHDR' or length != 13:
                    raise ValueError(f'{name}: invalid PNG header')
                size = struct.unpack('>II', data[offset+8:offset+16])
                if size != expected:
                    raise ValueError(f'{name}: expected {expected[0]}x{expected[1]} viewport, got {size[0]}x{size[1]}')
                header = True
            if kind == b'IDAT':
                image = True
            if kind == b'IEND':
                if length != 0 or end != len(data):
                    raise ValueError(f'{name}: invalid PNG end')
                ending = True
                break
            offset = end
        if not (header and image and ending):
            raise ValueError(f'{name}: incomplete PNG')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: verify_core_footnotes_zoom_evidence.py SCREENSHOT_DIRECTORY')
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
