#!/usr/bin/env python3
"""Require actual PNG evidence from the exact Slateframe checkout HEAD.

The screenshot directory is produced by Playwright against WordPress in the
browser-smoke job. This script verifies structural PNG integrity and that the
expected responsive/editor/print evidence exists; it cannot replace a human
visual review of the resulting GitHub Actions artifact.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import stat
import struct
import sys
import tempfile
import zlib
from pathlib import Path

SIGNATURE = b"\x89PNG\r\n\x1a\n"
MAX_CHUNK = 64 * 1024 * 1024
MAX_COMPRESSED = 16 * 1024 * 1024
MAX_PIXELS = 25_000_000
MAX_FILE_BYTES = 20 * 1024 * 1024


def expected_images() -> dict[str, int]:
    """Filename -> maximum plausible CSS pixel width for each viewport."""
    expected = {}
    for width in (390, 1440):
        for profile in ("default", "compact", "spacious"):
            expected[f"appearance-{profile}-viewport-{width}-footnotes.png"] = width
        for name in (
            f"core-footnotes-target-{width}-rtl-200-forced-colors.png",
            f"core-footnotes-return-{width}-rtl-200-forced-colors.png",
            f"core-footnotes-footer-{width}-rtl-forced-colors.png",
            f"footer-footnote-inline-{width}-rtl-200-forced-colors.png",
            f"core-footnotes-print-{width}-rtl.png",
            f"gutenberg-viewport-{width}-core-footnote-control.png",
        ):
            expected[name] = width
    return expected



def reject_linked_ancestors(path: Path) -> None:
    """Do not follow a linked evidence path or one of its parent directories."""
    for part in (path, *path.parents):
        if part.is_symlink():
            raise ValueError(f"symlinked or linked evidence path: {path}")


def read_bounded_regular_file(path: Path, limit: int) -> bytes:
    """Reject non-regular and oversized evidence before allocating its bytes."""
    reject_linked_ancestors(path)
    try:
        info = path.stat()
    except OSError as error:
        raise ValueError(f"missing evidence file: {path.name}") from error
    if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
        raise ValueError(f"non-regular or oversized evidence file: {path.name}")
    # A second bound also protects against a file growing after stat().
    with path.open("rb") as source:
        data = source.read(limit + 1)
    if len(data) > limit:
        raise ValueError(f"oversized evidence file: {path.name}")
    return data


def normalized_raster_hash(pixels: bytes, width: int, height: int, channels: int) -> bytes:
    """Hash decoded pixel bytes, independent of PNG compression and row filters.

    Only called for the six bounded Appearance comparison images. PNG's
    five standard filters reconstruct each byte from the current/previous
    scanline, with tie-breaking defined by the Paeth predictor.
    """
    stride = width * channels + 1
    prior = bytearray(width * channels)
    digest = hashlib.sha256(struct.pack(">IIB", width, height, channels))
    for row in range(height):
        offset = row * stride
        filter_type = pixels[offset]
        current = bytearray(pixels[offset + 1:offset + stride])
        if filter_type == 1:  # Sub
            for i in range(channels, len(current)):
                current[i] = (current[i] + current[i - channels]) & 255
        elif filter_type == 2:  # Up
            for i in range(len(current)):
                current[i] = (current[i] + prior[i]) & 255
        elif filter_type == 3:  # Average
            for i in range(len(current)):
                left = current[i - channels] if i >= channels else 0
                current[i] = (current[i] + ((left + prior[i]) >> 1)) & 255
        elif filter_type == 4:  # Paeth
            for i in range(len(current)):
                left = current[i - channels] if i >= channels else 0
                above = prior[i]
                upper_left = prior[i - channels] if i >= channels else 0
                prediction = left + above - upper_left
                distances = (abs(prediction - left), abs(prediction - above), abs(prediction - upper_left))
                predictor = (left, above, upper_left)[distances.index(min(distances))]
                current[i] = (current[i] + predictor) & 255
        digest.update(current)
        prior = current
    return digest.digest()


def validate_png(path: Path, viewport: int, *, include_raster_hash: bool = False):
    """Validate PNG structure, bounded raster and optional decoded scanline hash."""
    data = read_bounded_regular_file(path, MAX_FILE_BYTES)
    if not data.startswith(SIGNATURE):
        raise ValueError(f"invalid PNG signature: {path.name}")
    offset = len(SIGNATURE)
    header = None
    saw_idat = False
    saw_end = False
    compressed = bytearray()
    idat_finished = False
    saw_palette = False
    while offset < len(data):
        if len(data) - offset < 12:
            raise ValueError(f"truncated PNG chunk: {path.name}")
        length = struct.unpack_from(">I", data, offset)[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + length
        if length > MAX_CHUNK or end > len(data):
            raise ValueError(f"oversized/truncated PNG chunk: {path.name}")
        if len(kind) != 4 or not all(65 <= letter <= 90 or 97 <= letter <= 122 for letter in kind):
            raise ValueError(f"invalid PNG chunk type: {path.name}")
        if kind[2] & 32:
            raise ValueError(f"invalid PNG reserved chunk bit: {path.name}")
        if kind[0] & 32 == 0 and kind not in (b"IHDR", b"PLTE", b"IDAT", b"IEND"):
            raise ValueError(f"unsupported critical PNG chunk: {path.name}")
        payload = data[offset + 8:offset + 8 + length]
        crc = struct.unpack_from(">I", data, offset + 8 + length)[0]
        if zlib.crc32(kind + payload) & 0xFFFFFFFF != crc:
            raise ValueError(f"PNG CRC mismatch: {path.name}")
        if header is None:
            if kind != b"IHDR" or length != 13:
                raise ValueError(f"missing first IHDR: {path.name}")
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            if not (min(200, viewport // 2) <= width <= viewport + 4
                    and 24 <= height <= 20_000 and width * height <= MAX_PIXELS):
                raise ValueError(f"wrong viewport or dimensions {width}x{height}: {path.name}")
            if depth != 8 or color not in (2, 6) or compression or filtering or interlace:
                raise ValueError(f"unsupported screenshot encoding: {path.name}")
            header = (width, height)
        elif kind == b"IHDR":
            raise ValueError(f"duplicate IHDR: {path.name}")
        if kind == b"PLTE":
            if saw_palette or saw_idat or not 3 <= length <= 768 or length % 3:
                raise ValueError(f"invalid PNG palette order or size: {path.name}")
            saw_palette = True
        if kind == b"IDAT":
            if idat_finished:
                raise ValueError(f"nonconsecutive IDAT chunks: {path.name}")
            saw_idat = True
            if len(compressed) + length > MAX_COMPRESSED:
                raise ValueError(f"PNG compressed raster exceeds limit: {path.name}")
            compressed.extend(payload)
        elif saw_idat and kind != b"IEND":
            idat_finished = True
        if kind == b"IEND":
            if length or end != len(data) or not saw_idat:
                raise ValueError(f"invalid IEND: {path.name}")
            saw_end = True
            break
        offset = end
    if not (header and saw_idat and saw_end):
        raise ValueError(f"incomplete PNG: {path.name}")
    width, height = header
    channels = 4 if color == 6 else 3
    stride = width * channels + 1
    expected = stride * height
    try:
        decoder = zlib.decompressobj()
        pixels = decoder.decompress(compressed, expected + 1)
    except zlib.error as error:
        raise ValueError(f"invalid IDAT stream: {path.name}") from error
    if (len(pixels) != expected or not decoder.eof or decoder.unused_data
            or decoder.unconsumed_tail):
        raise ValueError(f"invalid raster length or trailing compressed data: {path.name}")
    if any(pixels[row * stride] > 4 for row in range(height)):
        raise ValueError(f"invalid PNG scanline filter: {path.name}")
    return (header, normalized_raster_hash(pixels, width, height, channels)) if include_raster_hash else header


def verify(directory: Path, head_sha: str) -> dict[str, tuple[int, int]]:
    reject_linked_ancestors(directory)
    if not directory.is_dir():
        raise ValueError("screenshot directory missing")
    # Artifact upload includes every screenshot, not only the 18 required ones.
    # Reject links anywhere in that tree to prevent unexpected file disclosure.
    for item in directory.rglob("*"):
        if item.is_symlink():
            raise ValueError(f"symlinked artifact entry: {item.relative_to(directory)}")
        if item.is_dir() or (item.suffix.lower() != ".png" and
                             item.name not in ("HEAD_SHA.txt", "VISUAL_EVIDENCE.json")):
            raise ValueError(f"unexpected screenshot artifact entry: {item.relative_to(directory)}")
    if not re.fullmatch(r"[a-f0-9]{40}", head_sha):
        raise ValueError("expected HEAD must be a 40-character SHA")
    marker = directory / "HEAD_SHA.txt"
    if read_bounded_regular_file(marker, 64).decode("ascii", errors="replace").strip() != head_sha:
        raise ValueError("screenshot evidence HEAD_SHA.txt does not match checkout")
    results = {}
    appearance_rasters = {}
    for name, width in expected_images().items():
        if name.startswith("appearance-"):
            dimensions, digest = validate_png(directory / name, width, include_raster_hash=True)
            results[name] = dimensions
            appearance_rasters[name] = digest
        else:
            results[name] = validate_png(directory / name, width)
    for width in (390, 1440):
        fingerprints = {appearance_rasters[f"appearance-{profile}-viewport-{width}-footnotes.png"]
                        for profile in ("default", "compact", "spacious")}
        if len(fingerprints) == 1:
            raise ValueError(f"all Appearance screenshots are identical at {width}px")
    return results


def write_manifest(directory: Path, head_sha: str, checked: dict[str, tuple[int, int]]) -> Path:
    """Record deterministic, per-image SHA-256 provenance in the uploaded artifact."""
    reject_linked_ancestors(directory)
    payload = {
        "schema_version": 1,
        "head_sha": head_sha,
        "files": [
            {
                "name": name,
                "width": checked[name][0],
                "height": checked[name][1],
                "sha256": hashlib.sha256(read_bounded_regular_file(directory / name, MAX_FILE_BYTES)).hexdigest(),
                **({"raster_sha256": validate_png(directory / name, checked[name][0],
                                                  include_raster_hash=True)[1].hex()}
                   if name.startswith("appearance-") else {}),
            }
            for name in sorted(checked)
        ],
    }
    target = directory / "VISUAL_EVIDENCE.json"
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=directory,
                                         prefix=".slateframe-evidence-", suffix=".tmp",
                                         delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(payload, stream, ensure_ascii=False, indent=2, sort_keys=True)
            stream.write("\n")
        os.replace(temporary, target)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("head_sha")
    args = parser.parse_args()
    try:
        checked = verify(args.directory, args.head_sha)
        manifest = write_manifest(args.directory, args.head_sha, checked)
    except (OSError, ValueError) as exc:
        print(f"Footnotes visual evidence rejected: {exc}", file=sys.stderr)
        sys.exit(1)
    print(f"Verified {len(checked)} PNGs for exact HEAD {args.head_sha}; manifest: {manifest.name}")
