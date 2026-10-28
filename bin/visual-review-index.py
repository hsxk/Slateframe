#!/usr/bin/env python3
"""Build an offline, read-only contact sheet from exact-HEAD browser evidence.

The output is a review aid, not an automated visual approval. No image is
modified or synthesized. Run only on extracted GitHub Actions screenshot files.
"""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import stat
import struct
import sys
from urllib.parse import quote
import zlib

SHA_RE = re.compile(r"[0-9a-f]{40}\Z")
NAME_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9_.-]*\.png\Z")
SIGNATURE = b"\x89PNG\r\n\x1a\n"
GROUPS = (
    ("Appearance / compact", ("appearance-compact-", "appearance-breakpoints-compact-")),
    ("Appearance / default", ("appearance-default-", "appearance-breakpoints-default-")),
    ("Appearance / spacious", ("appearance-spacious-", "appearance-breakpoints-spacious-")),
    ("Appearance / other", ("appearance-",)),
    ("Photography / Lightbox", ("photography-", "lightbox-", "gallery-", "core-photography-")),
    ("Portfolio", ("portfolio-", "project-")),
    ("Knowledge", ("knowledge-", "learning-", "core-details-")),
    ("Article / Core media", ("article-", "print-article-", "core-paragraph-", "core-heading-", "core-image-", "core-cover-", "core-post-featured-image-")),
    ("Header / Navigation", ("header-", "mobile-header-", "navigation-", "core-navigation-")),
    ("Search / Forms", ("search-", "core-search-", "form-", "authored-form-", "fieldset-")),
    ("Footer", ("footer-",)),
    ("Gutenberg", ("gutenberg-", "editor-")),
)


def strict_json(data: bytes) -> dict:
    """Reject duplicate keys and non-finite constants in evidence manifests."""
    def unique_object(pairs):
        value = {}
        for key, item in pairs:
            if key in value:
                raise ValueError(f"duplicate JSON key: {key}")
            value[key] = item
        return value

    def reject_constant(value):
        raise ValueError(f"invalid JSON constant: {value}")

    return json.loads(data, object_pairs_hook=unique_object, parse_constant=reject_constant)


def read_regular(path: Path, maximum: int = 20 * 1024 * 1024) -> bytes:
    """Reject symlinks, hardlinks, non-regular files and oversized evidence.

    Anchor each path component with O_NOFOLLOW to avoid a symlink swap between
    the preflight check and the actual read (Linux GitHub runners support it).
    """
    if not all(hasattr(os, attr) for attr in ("O_NOFOLLOW", "O_DIRECTORY")) or os.open not in os.supports_dir_fd:
        raise ValueError("secure evidence opening unavailable")
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError(f"linked evidence path: {path.name}")
    parts = Path(os.path.abspath(path)).parts
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    descriptor = os.open(parts[0], directory_flags)
    try:
        for part in parts[1:-1]:
            child = os.open(part, directory_flags, dir_fd=descriptor)
            os.close(descriptor)
            descriptor = child
        file_descriptor = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | getattr(os, "O_NONBLOCK", 0),
                                  dir_fd=descriptor)
        try:
            info = os.fstat(file_descriptor)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > maximum:
                raise ValueError(f"unsafe evidence file: {path.name}")
            with os.fdopen(file_descriptor, "rb", closefd=False) as source:
                data = source.read(maximum + 1)
        finally:
            os.close(file_descriptor)
    finally:
        os.close(descriptor)
    if len(data) > maximum:
        raise ValueError(f"oversized evidence: {path.name}")
    return data


def png_dimensions(data: bytes) -> tuple[int, int]:
    """Check PNG framing, CRC, legal IHDR and critical chunk ordering.

    This does not decode pixels. The browser gate independently validates
    decoded rasters; the offline index validates the archived PNG container.
    """
    if len(data) < 45 or not data.startswith(SIGNATURE):
        raise ValueError("invalid PNG signature")
    offset = len(SIGNATURE)
    dimensions = None
    color_type = None
    palette_seen = False
    saw_idat = False
    image_data_bytes = 0
    image_data_closed = False
    ended = False
    while offset < len(data):
        if offset + 12 > len(data):
            raise ValueError("truncated PNG chunk")
        size = struct.unpack_from(">I", data, offset)[0]
        end = offset + 12 + size
        if end > len(data):
            raise ValueError("truncated PNG chunk")
        kind = data[offset + 4:offset + 8]
        if not all(65 <= c <= 90 or 97 <= c <= 122 for c in kind) or not 65 <= kind[2] <= 90:
            raise ValueError("invalid PNG chunk type")
        if zlib.crc32(data[offset + 4:end - 4]) & 0xFFFFFFFF != struct.unpack_from(">I", data, end - 4)[0]:
            raise ValueError("invalid PNG CRC")
        if dimensions is None:
            if kind != b"IHDR" or size != 13:
                raise ValueError("invalid PNG IHDR")
            width, height, depth, color_type, compression, filtering, interlace = struct.unpack_from(
                ">IIBBBBB", data, offset + 8)
            dimensions = (width, height)
            legal_depths = {0: (1, 2, 4, 8, 16), 2: (8, 16), 3: (1, 2, 4, 8),
                            4: (8, 16), 6: (8, 16)}
            if (not (1 <= width <= 8192 and 1 <= height <= 50000 and width * height <= 40_000_000)
                    or depth not in legal_depths.get(color_type, ())
                    or compression != 0 or filtering != 0 or interlace not in (0, 1)):
                raise ValueError("invalid PNG IHDR values")
        elif kind == b"IHDR":
            raise ValueError("duplicate PNG IHDR")
        elif kind == b"PLTE":
            if (palette_seen or saw_idat or color_type in (0, 4)
                    or not 3 <= size <= 768 or size % 3):
                raise ValueError("invalid PNG palette")
            palette_seen = True
        elif kind == b"IDAT":
            if image_data_closed or (color_type == 3 and not palette_seen):
                raise ValueError("invalid PNG IDAT ordering")
            saw_idat = True
            image_data_bytes += size
        elif kind == b"IEND":
            if size != 0 or end != len(data) or not image_data_bytes:
                raise ValueError("invalid PNG end")
            ended = True
            break
        elif not kind[0] & 0x20:
            raise ValueError("unknown critical PNG chunk")
        if kind != b"IDAT" and saw_idat:
            image_data_closed = True
        offset = end
    if not ended:
        raise ValueError("incomplete PNG")
    return dimensions


def load_evidence(directory: Path, expected_head: str) -> list[dict]:
    if not SHA_RE.fullmatch(expected_head):
        raise ValueError("expected HEAD must be a 40-character lowercase Git SHA")
    if any(p.is_symlink() for p in (directory, *directory.parents)):
        raise ValueError("linked screenshot directory")
    marker = read_regular(directory / "HEAD_SHA.txt", 128).decode("ascii").strip()
    if marker != expected_head:
        raise ValueError("HEAD_SHA.txt does not match requested commit")
    inventory = strict_json(read_regular(directory / "BROWSER_SCREENSHOT_INVENTORY.json", 4 * 1024 * 1024))
    if not isinstance(inventory, dict) or type(inventory.get("schema_version")) is not int or inventory.get("schema_version") != 1 or inventory.get("head_sha") != expected_head:
        raise ValueError("browser inventory does not match requested commit")
    screenshots = inventory.get("screenshots")
    if not isinstance(screenshots, dict) or not screenshots:
        raise ValueError("empty browser screenshot inventory")
    entries = []
    for name, metadata in screenshots.items():
        if not isinstance(metadata, dict) or metadata.get("name", name) != name:
            raise ValueError("invalid browser inventory record")
        entries.append({**metadata, "name": name})
    visual = strict_json(read_regular(directory / "VISUAL_EVIDENCE.json", 2 * 1024 * 1024))
    if not isinstance(visual, dict) or type(visual.get("schema_version")) is not int or visual.get("schema_version") != 1 or visual.get("head_sha") != expected_head:
        raise ValueError("visual evidence manifest does not match requested commit")
    subset = visual.get("files")
    if not isinstance(subset, list) or not subset:
        raise ValueError("empty visual evidence manifest")
    subset_names = set()
    for record in subset:
        if not isinstance(record, dict) or not isinstance(record.get("name"), str) or record["name"] not in screenshots:
            raise ValueError("visual evidence not present in browser inventory")
        if record["name"] in subset_names:
            raise ValueError("duplicate visual evidence record")
        subset_names.add(record["name"])
        source = screenshots[record["name"]]
        if any(source.get(key) != record.get(key) for key in ("sha256", "width", "height")):
            raise ValueError("visual evidence disagrees with browser inventory")
    # The index must never silently omit extra PNGs or follow linked content.
    allowed = set(screenshots) | {"HEAD_SHA.txt", "VISUAL_EVIDENCE.json", "BROWSER_SCREENSHOT_INVENTORY.json"}
    for child in directory.iterdir():
        if child.is_symlink():
            raise ValueError(f"linked screenshot artifact entry: {child.name}")
        if child.name not in allowed or not child.is_file():
            raise ValueError(f"unexpected screenshot artifact entry: {child.name}")
    seen = set()
    checked = []
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("invalid manifest record")
        name = entry.get("name")
        if not isinstance(name, str) or not NAME_RE.fullmatch(name) or name in seen:
            raise ValueError("unsafe or duplicate evidence filename")
        seen.add(name)
        expected_hash = entry.get("sha256")
        if not isinstance(expected_hash, str) or not re.fullmatch(r"[0-9a-f]{64}", expected_hash):
            raise ValueError(f"invalid digest for {name}")
        data = read_regular(directory / name)
        if entry.get("bytes") != len(data):
            raise ValueError(f"screenshot size mismatch: {name}")
        if hashlib.sha256(data).hexdigest() != expected_hash:
            raise ValueError(f"screenshot digest mismatch: {name}")
        if png_dimensions(data) != (entry.get("width"), entry.get("height")):
            raise ValueError(f"screenshot dimensions mismatch: {name}")
        checked.append({"name": name, "width": entry["width"], "height": entry["height"]})
    return checked


def group_for(name: str) -> str:
    for label, prefixes in GROUPS:
        if name.startswith(prefixes):
            return label
    return "Other Core / responsive"


def render(head: str, entries: list[dict], limit: int = 24, asset_prefix: str = "") -> str:
    if limit < 1:
        raise ValueError("limit must be positive")
    groups = {}
    for entry in entries:
        groups.setdefault(group_for(entry["name"]), []).append(entry)
    sections = []
    for label, _ in (*GROUPS, ("Other Core / responsive", ())):
        members = groups.get(label, [])
        if not members:
            continue
        # Prefer representative mobile/desktop and RTL/400% captures, while
        # keeping selection deterministic and preserving all images on disk.
        def priority(entry):
            name = entry["name"]
            return (0 if "390" in name else 1 if "1440" in name else 2 if "320" in name else 3,
                    0 if "400" in name else 1, 0 if "rtl" in name else 1,
                    0 if "forced-colors" in name else 1, name)
        chosen = sorted(members, key=priority)[:limit]
        figures = []
        for entry in chosen:
            name = html.escape(entry["name"], quote=True)
            image_url = html.escape(asset_prefix + quote(entry["name"]), quote=True)
            dimensions = f'{entry["width"]} × {entry["height"]}'
            figures.append(f'<figure><a href="{image_url}"><img src="{image_url}" loading="lazy" alt="{name}" '
                           f'width="{entry["width"]}" height="{entry["height"]}"></a>'
                           f'<figcaption>{name} <small>{dimensions}</small></figcaption></figure>')
        selected = {entry["name"] for entry in chosen}
        remaining = sorted((entry for entry in members if entry["name"] not in selected),
                           key=lambda entry: entry["name"])
        extra = ""
        if remaining:
            links = []
            for entry in remaining:
                name = html.escape(entry["name"], quote=True)
                url = html.escape(asset_prefix + quote(entry["name"]), quote=True)
                links.append(f'<li><a href="{url}">{name}</a></li>')
            extra = (f'<details><summary>Browse remaining {len(remaining)} verified screenshots</summary>'
                     f'<ul class="files">{"".join(links)}</ul></details>')
        sections.append(f'<section><h2>{html.escape(label)}</h2><p>{len(chosen)} of {len(members)} '
                        f'verified screenshots shown</p><div class="grid">{"".join(figures)}</div>{extra}</section>')
    css = ('body{font:16px/1.5 system-ui,sans-serif;margin:2rem auto;padding:0 1rem;max-width:96rem;'
           'background:#f5f5f5;color:#171717}h1,h2{line-height:1.2}.grid{display:grid;'
           'grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr));gap:1rem}'
           'figure{margin:0;padding:.6rem;background:white;border:1px solid #aaa;min-width:0}'
           'img{display:block;max-width:100%;height:auto;max-height:24rem;object-fit:contain;margin:auto}'
           'figcaption{overflow-wrap:anywhere;margin-top:.6rem;font-size:.85rem}'
           'small{display:block}a:focus-visible{outline:3px solid #1264bb;outline-offset:3px}'
           '@media(prefers-color-scheme:dark){body{background:#181818;color:#f6f6f6}'
           'figure{background:#272727;border-color:#888}a{color:#b6d9ff}}')
    return ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>Slateframe exact-HEAD visual review</title><style>' + css + '</style></head><body>'
            '<h1>Slateframe visual review — exact HEAD ' + html.escape(head) + '</h1>'
            '<p>Offline index of verified real WordPress/Chromium captures. This is not a visual pass; '
            'inspect each image at full resolution before approving a PR.</p>'
            + ''.join(sections) + '</body></html>\n')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("screenshots", type=Path)
    parser.add_argument("head", help="Exact 40-character Git commit SHA")
    parser.add_argument("--limit-per-group", type=int, default=24)
    parser.add_argument("--output", type=Path, help="HTML path (default: screenshots/../visual-review.html)")
    args = parser.parse_args()
    entries = load_evidence(args.screenshots, args.head)
    output = args.output or args.screenshots.parent / "visual-review.html"
    if args.screenshots.resolve() in (output.resolve(), *output.resolve().parents):
        raise ValueError("write review index outside verified screenshot directory")
    relative = os.path.relpath(args.screenshots, output.parent).replace(os.sep, "/")
    prefix = "/".join(quote(part) for part in relative.split("/")) + "/"
    output.write_text(render(args.head, entries, args.limit_per_group, prefix), encoding="utf-8")
    print(f"Indexed {len(entries)} verified screenshots for {args.head}: {output}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, UnicodeError, json.JSONDecodeError) as error:
        raise SystemExit(str(error)) from error
