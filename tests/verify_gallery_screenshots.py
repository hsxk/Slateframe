#!/usr/bin/env python3
"""Fail closed on missing, corrupt or stale real-WordPress Gallery screenshots."""
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import tempfile
import zlib

ROOT = Path('test-artifacts/photography-lightbox')
WIDTHS = (320, 390, 768, 1440, 1920)
REQUIRED = {
    **{f'native-sequence-page-{w}.png': w for w in WIDTHS},
    **{f'photography-page-viewport-{w}.png': w for w in WIDTHS},
    **{f'class-only-sequence-{w}.png': w for w in (390, 1440)},
    **{f'lightbox-rtl-close-viewport-{w}.png': w for w in WIDTHS},
    **{f'lightbox-navigation-{direction}-viewport-{w}.png': w for w in WIDTHS for direction in ('ltr', 'rtl')},
    **{f'lightbox-navigation-breakpoint-{w}.png': w for w in (959, 960)},
    **{f'lightbox-landscape-viewport-{w}.png': w for w in WIDTHS},
    **{f'lightbox-portrait-viewport-{w}.png': w for w in WIDTHS},
    **{f'zoom-caption-{kind}-{direction}-360x225.png': 360
       for kind in ('native', 'class-only') for direction in ('ltr', 'rtl')},
}
MAGIC = b'\x89PNG\r\n\x1a\n'


def decoded_pixel_sha256(scanlines: bytes, width: int, height: int, channels: int) -> str:
    """Canonicalize all five PNG filters before hashing RGB/RGBA pixels."""
    stride = width * channels
    previous = bytearray(stride)
    # Normalize both supported PNG color types to RGBA. An opaque PNG
    # encoded as RGB and the same screenshot encoded as RGBA must not
    # satisfy the distinct-scene evidence gate merely by adding alpha.
    digest = hashlib.sha256(struct.pack('>II', width, height))
    for y in range(height):
        offset = y * (stride + 1)
        filter_type = scanlines[offset]
        row = bytearray(scanlines[offset + 1:offset + 1 + stride])
        if filter_type == 1:  # Sub
            for x in range(channels, stride):
                row[x] = (row[x] + row[x - channels]) & 255
        elif filter_type == 2:  # Up
            for x in range(stride):
                row[x] = (row[x] + previous[x]) & 255
        elif filter_type == 3:  # Average
            for x in range(stride):
                left = row[x - channels] if x >= channels else 0
                row[x] = (row[x] + ((left + previous[x]) // 2)) & 255
        elif filter_type == 4:  # Paeth
            for x in range(stride):
                left = row[x - channels] if x >= channels else 0
                up = previous[x]
                upper_left = previous[x - channels] if x >= channels else 0
                predictor = left + up - upper_left
                dl = abs(predictor - left)
                du = abs(predictor - up)
                dul = abs(predictor - upper_left)
                chosen = left if dl <= du and dl <= dul else up if du <= dul else upper_left
                row[x] = (row[x] + chosen) & 255
        elif filter_type != 0:
            raise ValueError('invalid PNG row filter')
        if channels == 3:
            rgba = bytearray()
            for x in range(0, stride, 3):
                rgba.extend(row[x:x + 3])
                rgba.append(255)
            digest.update(rgba)
        else:
            # Normalize fully transparent colors only in the hash, never in
            # the reconstructed row needed by the next PNG filter operation.
            visible = bytearray(row)
            for x in range(0, stride, 4):
                if visible[x + 3] == 0:
                    visible[x:x + 3] = b'\0\0\0'
            digest.update(visible)
        previous = row
    return digest.hexdigest()


def safe_path(path):
    """Reject links inside the workspace, including intermediate directories."""
    root = Path.cwd().absolute()
    absolute = path.absolute()
    if not absolute.is_relative_to(root):
        raise ValueError(f'outside workspace: {path}')
    while absolute != root:
        if absolute.is_symlink():
            raise ValueError(f'linked screenshot path: {absolute}')
        absolute = absolute.parent


def inspect_png(path, width):
    safe_path(path)
    if not path.is_file() or path.stat().st_nlink != 1:
        raise ValueError(f'missing or hardlinked screenshot: {path}')
    if not 1024 <= path.stat().st_size <= 16 * 1024 * 1024:
        raise ValueError(f'implausible screenshot file size: {path}')
    data = path.read_bytes()
    if not data.startswith(MAGIC):
        raise ValueError(f'bad PNG signature: {path}')
    pos, chunks, compressed, shape = 8, [], bytearray(), None
    idat_finished = False
    while pos < len(data):
        if pos + 12 > len(data):
            raise ValueError(f'truncated PNG chunk: {path}')
        size = struct.unpack_from('>I', data, pos)[0]
        end = pos + size + 12
        if size > 16 * 1024 * 1024 or end > len(data):
            raise ValueError(f'truncated PNG payload: {path}')
        tag = data[pos + 4:pos + 8]
        payload = data[pos + 8:pos + 8 + size]
        crc = struct.unpack_from('>I', data, pos + 8 + size)[0]
        if zlib.crc32(tag + payload) & 0xffffffff != crc:
            raise ValueError(f'PNG CRC mismatch: {path}')
        if len(tag) != 4 or not all(65 <= c <= 90 or 97 <= c <= 122 for c in tag):
            raise ValueError(f'invalid PNG chunk name: {path}')
        if tag[2] & 32:
            raise ValueError(f'invalid PNG reserved chunk bit: {path}')
        if not chunks and (tag != b'IHDR' or size != 13):
            raise ValueError(f'missing PNG IHDR: {path}')
        if tag == b'IHDR':
            if chunks:
                raise ValueError(f'duplicate PNG IHDR: {path}')
            w, h, depth, color, comp, filt, interlace = struct.unpack('>IIBBBBB', payload)
            if w != width or h < 200 or w * h > 32_000_000:
                raise ValueError(f'wrong screenshot dimensions: {path}')
            if depth != 8 or color not in (2, 6) or (comp, filt, interlace) != (0, 0, 0):
                raise ValueError(f'unsupported PNG encoding: {path}')
            shape = (w, h, 3 if color == 2 else 4)
        elif tag == b'IDAT':
            if idat_finished:
                raise ValueError(f'noncontiguous PNG IDAT: {path}')
            compressed.extend(payload)
        elif tag == b'PLTE':
            if compressed or not 0 < size <= 768 or size % 3:
                raise ValueError(f'invalid PNG palette placement: {path}')
        elif tag == b'IEND':
            if size or not compressed:
                raise ValueError(f'invalid PNG end: {path}')
            chunks.append(tag)
            pos = end
            break
        elif tag[0] & 32 == 0 and tag not in (b'PLTE',):
            raise ValueError(f'unknown critical PNG chunk: {path}')
        if compressed and tag != b'IDAT':
            idat_finished = True
        chunks.append(tag)
        pos = end
    if pos != len(data) or chunks[-1:] != [b'IEND'] or shape is None:
        raise ValueError(f'incomplete PNG: {path}')
    w, h, channels = shape
    inflater = zlib.decompressobj()
    pixels = inflater.decompress(bytes(compressed), h * (1 + w * channels) + 1)
    if len(pixels) != h * (1 + w * channels) or not inflater.eof or inflater.unused_data or inflater.unconsumed_tail:
        raise ValueError(f'invalid PNG pixels: {path}')
    if any(pixels[y * (1 + w * channels)] > 4 for y in range(h)):
        raise ValueError(f'invalid PNG filter: {path}')
    return {'width': w, 'height': h, 'sha256': hashlib.sha256(data).hexdigest(),
            'pixel_sha256': decoded_pixel_sha256(pixels, w, h, channels)}


def verify():
    safe_path(ROOT)
    if not ROOT.is_dir():
        raise ValueError('missing Gallery screenshot directory')
    output = ROOT / 'gallery-evidence-manifest.json'
    safe_path(output)
    output.unlink(missing_ok=True)  # Never leave a stale PASS after failed validation.
    if any(p.is_symlink() for p in ROOT.iterdir()):
        raise ValueError('linked Gallery evidence entry')
    commit = os.environ.get('SLATEFRAME_EVIDENCE_SHA', '')
    if os.environ.get('GITHUB_ACTIONS') == 'true' and not commit:
        raise ValueError('missing exact evidence SHA')
    if commit:
        if not re.fullmatch('[0-9a-f]{40}', commit):
            raise ValueError('invalid evidence SHA')
        current = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
        if current != commit:
            raise ValueError('evidence SHA differs from checkout')
        if subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=no'], text=True).strip():
            raise ValueError('tracked checkout changed before evidence verification')
    seen = {}
    records = {}
    for filename, width in REQUIRED.items():
        record = inspect_png(ROOT / filename, width)
        if record['pixel_sha256'] in seen:
            pair = {filename, seen[record['pixel_sha256']]}
            allowed = any(pair == {f'native-sequence-page-{w}.png', f'photography-page-viewport-{w}.png'} for w in WIDTHS)
            if not allowed:
                raise ValueError(f'duplicate screenshot evidence: {pair}')
        seen[record['pixel_sha256']] = filename
        records[filename] = record
    run_id = os.environ.get('GITHUB_RUN_ID')
    attempt = os.environ.get('GITHUB_RUN_ATTEMPT')
    if commit and (not (run_id or '').isdecimal() or not (attempt or '').isdecimal()):
        raise ValueError('missing GitHub Actions run identity')
    manifest = {'schema_version': 1, 'commit': commit or None,
                'run_id': run_id, 'run_attempt': attempt, 'screenshots': records}
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=ROOT,
                                     prefix='.gallery-evidence-', delete=False) as handle:
        tmp = Path(handle.name)
        try:
            json.dump(manifest, handle, indent=2, sort_keys=True)
            handle.write('\n')
        except BaseException:
            tmp.unlink(missing_ok=True)
            raise
    tmp.replace(output)
    print(f'Verified {len(records)} real WordPress Gallery screenshots for {commit or "local run"}')


if __name__ == '__main__':
    try:
        verify()
    except (ValueError, OSError, zlib.error, subprocess.CalledProcessError) as error:
        print(f'::error::{error}', file=sys.stderr)
        sys.exit(1)
