#!/usr/bin/env python3
"""Promote an inspected, exact-HEAD WordPress/Chromium screenshot artifact.

The default is read-only. --apply copies the verified PNG bytes atomically into
screenshot.png; it never generates, edits, crops, or fabricates an image.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT = 'wordpress-org-screenshot-candidate.png'
INVENTORY = 'BROWSER_SCREENSHOT_INVENTORY.json'
MAX_PNG = 20 * 1024 * 1024


def require_regular(path: Path):
    if any(part.is_symlink() for part in (path, *path.parents)):
        raise ValueError('linked input/output path')
    if not path.is_file() or path.stat().st_nlink != 1:
        raise ValueError('input/output must be a single-link regular file')


def select_unique(items, basename):
    matching = [info for info in items if Path(info.filename).name == basename]
    if len(matching) != 1:
        raise ValueError(f'expected one {basename}, found {len(matching)}')
    return matching[0]


def read_candidate(archive: Path, expected_sha: str):
    if not re.fullmatch('[0-9a-f]{40}', expected_sha):
        raise ValueError('expected SHA must be a full lowercase Git commit SHA')
    require_regular(archive)
    with zipfile.ZipFile(archive) as zipped:
        items = zipped.infolist()
        if len(items) > 5000:
            raise ValueError('too many artifact entries')
        seen = set()
        for info in items:
            name = info.filename
            if name in seen or name.startswith('/') or '\\' in name or '..' in Path(name).parts:
                raise ValueError('duplicate or unsafe artifact path')
            seen.add(name)
            if stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError('linked artifact entry')
        image_info = select_unique(items, SCREENSHOT)
        inventory_info = select_unique(items, INVENTORY)
        if image_info.file_size > MAX_PNG or inventory_info.file_size > 1024 * 1024:
            raise ValueError('oversized screenshot or inventory')
        metadata = json.loads(zipped.read(inventory_info))
        if metadata.get('head_sha') != expected_sha:
            raise ValueError('artifact HEAD mismatch')
        records = metadata.get('screenshots')
        if not isinstance(records, dict):
            raise ValueError('invalid screenshot inventory')
        record = records.get(SCREENSHOT)
        if not isinstance(record, dict):
            raise ValueError('candidate absent from exact-HEAD inventory')
        data = zipped.read(image_info)
        digest = hashlib.sha256(data).hexdigest()
        if (record.get('sha256') != digest or record.get('bytes') != len(data)
                or (record.get('width'), record.get('height')) != (1200, 900)):
            raise ValueError('candidate does not match exact-HEAD inventory')
    spec = importlib.util.spec_from_file_location('slateframe_screenshot_check', ROOT / 'bin/check-screenshot.py')
    checker = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(checker)
    with tempfile.TemporaryDirectory() as directory:
        temp = Path(directory) / 'screenshot.png'
        temp.write_bytes(data)
        checker.validate(temp)
    return data, digest


def promote(archive: Path, expected_sha: str, target: Path, apply: bool = False):
    data, digest = read_candidate(archive, expected_sha)
    if not apply:
        return digest
    if target.exists() or target.is_symlink():
        require_regular(target)
    if any(part.is_symlink() for part in target.parents):
        raise ValueError('linked output parent')
    if not target.parent.is_dir():
        raise ValueError('missing output directory')
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix='.release-preview-', delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o644)
        temporary.replace(target)
        directory_fd = os.open(target.parent, os.O_RDONLY | getattr(os, 'O_DIRECTORY', 0))
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    return digest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact', type=Path, help='Exact-HEAD Browser Actions artifact ZIP')
    parser.add_argument('head_sha', help='Full reviewed commit SHA')
    parser.add_argument('--output', type=Path, default=ROOT / 'screenshot.png')
    parser.add_argument('--apply', action='store_true', help='Atomically replace output after visual review')
    args = parser.parse_args()
    try:
        digest = promote(args.artifact, args.head_sha, args.output, args.apply)
    except (ValueError, OSError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
        parser.exit(1, f'Release screenshot rejected: {exc}\n')
    print(('Applied' if args.apply else 'Verified (dry run)') + f' SHA-256 {digest}')
