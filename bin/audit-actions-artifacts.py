#!/usr/bin/env python3
"""Audit downloaded exact-HEAD Actions ZIPs without extracting untrusted paths.

This validates provenance and file integrity, not visual quality. A human must
still open the genuine WordPress/Chromium screenshots before approving a PR.
"""
import argparse
import hashlib
import io
import json
from pathlib import PurePosixPath
import re
import stat
import struct
import sys
import zipfile
import zlib

SHA40 = re.compile(r"[0-9a-f]{40}\Z")
SHA64 = re.compile(r"[0-9a-f]{64}\Z")
PNG = b"\x89PNG\r\n\x1a\n"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def open_archive(path, limit=512 * 1024 * 1024):
    archive = zipfile.ZipFile(path)
    names = set()
    total = 0
    for member in archive.infolist():
        name = member.filename
        parts = PurePosixPath(name).parts
        require(name not in names, "duplicate ZIP entry: " + name)
        names.add(name)
        require(bool(parts) and not name.startswith("/") and ".." not in parts
                and "\\" not in name and not any(ord(ch) < 32 for ch in name),
                "unsafe ZIP path: " + name)
        mode = (member.external_attr >> 16) & 0o170000
        require(mode not in (stat.S_IFLNK, stat.S_IFCHR, stat.S_IFBLK,
                             stat.S_IFIFO, stat.S_IFSOCK), "unsafe ZIP entry: " + name)
        total += member.file_size
        require(total <= limit, "oversized ZIP payload")
    require(archive.testzip() is None, "ZIP CRC failure")
    return archive


def unique_suffix(archive, suffix):
    matches = [name for name in archive.namelist() if name.endswith("/" + suffix) or name == suffix]
    require(len(matches) == 1, "missing or ambiguous " + suffix)
    return matches[0]


def png_dimensions(data):
    require(data.startswith(PNG), "invalid PNG signature")
    offset, dimensions, saw_data, ended = 8, None, False, False
    while offset < len(data):
        require(offset + 12 <= len(data), "truncated PNG chunk")
        size = struct.unpack_from(">I", data, offset)[0]
        end = offset + size + 12
        require(end <= len(data), "truncated PNG payload")
        kind = data[offset + 4:offset + 8]
        require((zlib.crc32(data[offset + 4:end - 4]) & 0xffffffff)
                == struct.unpack_from(">I", data, end - 4)[0], "PNG CRC mismatch")
        if dimensions is None:
            require(kind == b"IHDR" and size == 13, "missing PNG IHDR")
            width, height = struct.unpack_from(">II", data, offset + 8)
            require(0 < width <= 8192 and 0 < height <= 50000, "invalid PNG dimensions")
            dimensions = (width, height)
        elif kind == b"IDAT":
            saw_data = True
        elif kind == b"IEND":
            require(size == 0 and end == len(data), "invalid PNG end")
            ended = True
            break
        offset = end
    require(saw_data and ended, "incomplete PNG")
    return dimensions


def evidence(archive, manifest, expected, identity_key):
    document = json.loads(archive.read(unique_suffix(archive, manifest)))
    require(document.get(identity_key) == expected, "stale " + manifest)
    records = document.get("screenshots")
    require(isinstance(records, dict) and bool(records), "empty " + manifest)
    paths = {name.rsplit("/", 1)[-1]: name for name in archive.namelist() if name.endswith(".png")}
    require(len(paths) == len([name for name in archive.namelist() if name.endswith(".png")]),
            "duplicate screenshot basenames")
    require(set(paths) == set(records), "screenshot inventory differs from archive")
    for name, meta in records.items():
        require(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*\.png", name) is not None,
                "unsafe screenshot name")
        raw = archive.read(paths[name])
        digest = meta.get("sha256")
        require(isinstance(digest, str) and SHA64.fullmatch(digest) is not None
                and hashlib.sha256(raw).hexdigest() == digest, "screenshot digest mismatch: " + name)
        require(png_dimensions(raw) == (meta.get("width"), meta.get("height")),
                "screenshot viewport mismatch: " + name)
        if "bytes" in meta:
            require(len(raw) == meta["bytes"], "screenshot byte count mismatch: " + name)
    return len(records)




def audit_evidence_payload(archive, allowed_metadata):
    """Prevent unrelated files from leaking through visual evidence ZIPs."""
    for member in archive.infolist():
        if member.is_dir() or member.filename.endswith(".png"):
            continue
        basename = member.filename.rsplit("/", 1)[-1]
        require(basename in allowed_metadata,
                "unexpected visual artifact file: " + member.filename)


def audit_theme_paths(theme):
    """Fail closed on non-distributable files, including nested hidden files."""
    allowed_directories = {
        "assets", "assets/css", "assets/js", "assets/images",
        "assets/fonts", "inc", "patterns", "template-parts", "languages",
    }
    root_files = {
        "LICENSE", "readme.txt", "theme.json", "screenshot.png",
        "style.css", "rtl.css", "404.php", "archive.php", "attachment.php",
        "author.php", "comments.php", "footer.php", "functions.php",
        "header.php", "index.php", "page.php", "search.php",
        "searchform.php", "single.php",
    }
    extensions = {
        "assets/css": {".css"},
        "assets/js": {".js"},
        "assets/images": {".svg", ".png", ".jpg", ".jpeg", ".webp"},
        "assets/fonts": {".woff", ".woff2"},
        "inc": {".php"},
        "patterns": {".php"},
        "template-parts": {".php"},
        "languages": {".po", ".mo", ".pot"},
    }
    for member in theme.infolist():
        parts = PurePosixPath(member.filename).parts
        require(parts and parts[0] == "slateframe",
                "unexpected theme ZIP root")
        relative = parts[1:]
        if not relative:
            require(member.is_dir(), "invalid theme root entry")
            continue
        require(all(not part.startswith(".") for part in relative),
                "hidden distribution path: " + member.filename)
        parent = "/".join(relative[:-1])
        if member.is_dir():
            require("/".join(relative) in allowed_directories,
                    "unexpected distribution directory: " + member.filename)
            continue
        suffix = PurePosixPath(relative[-1]).suffix.lower()
        if not parent:
            permitted = relative[-1] in root_files
        else:
            permitted = parent in extensions and suffix in extensions[parent]
        require(permitted, "non-distributable theme file: " + member.filename)


def audit(browser, photo, distribution, head):
    require(SHA40.fullmatch(head) is not None, "expected a full lowercase HEAD SHA")
    with open_archive(browser) as b, open_archive(photo) as p, open_archive(distribution, 10 * 1024 * 1024) as d:
        require(b.read(unique_suffix(b, "HEAD_SHA.txt")).decode("ascii").strip() == head,
                "browser HEAD mismatch")
        audit_evidence_payload(b, {
            "HEAD_SHA.txt", "BROWSER_SCREENSHOT_INVENTORY.json",
            "VISUAL_EVIDENCE.json", "browser-review.html", "index.html",
            "slateframe-server.log",
        })
        audit_evidence_payload(p, {
            "gallery-evidence-manifest.json", "playwright-results.json",
            "photography-review.html", "index.html", "slateframe-photo-server.log",
        })
        browser_count = evidence(b, "BROWSER_SCREENSHOT_INVENTORY.json", head, "head_sha")
        photo_count = evidence(p, "gallery-evidence-manifest.json", head, "commit")
        require(set(d.namelist()) == {"slateframe.zip", "HEAD_SHA.txt", "SHA256SUMS"},
                "unexpected distribution artifact contents")
        require(d.read("HEAD_SHA.txt").decode("ascii").strip() == head,
                "distribution HEAD mismatch")
        theme_bytes = d.read("slateframe.zip")
        theme_hash = hashlib.sha256(theme_bytes).hexdigest()
        require(d.read("SHA256SUMS").decode("ascii").strip() == theme_hash + "  slateframe.zip",
                "distribution checksum mismatch")
        with open_archive(io.BytesIO(theme_bytes), 40 * 1024 * 1024) as theme:
            audit_theme_paths(theme)
            style = theme.read("slateframe/style.css").decode("utf-8")
            require(re.search(r"(?m)^Theme Name: Slateframe$", style) is not None and
                    re.search(r"(?m)^Text Domain: slateframe$", style) is not None,
                    "invalid theme metadata")
            require(png_dimensions(theme.read("slateframe/screenshot.png")) == (1200, 900),
                    "invalid WordPress.org screenshot")
            file_count = sum(not x.is_dir() for x in theme.infolist())
    return {"head_sha": head, "browser_png": browser_count,
            "photography_png": photo_count, "theme_files": file_count,
            "theme_sha256": theme_hash}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--head", required=True)
    parser.add_argument("--browser", required=True)
    parser.add_argument("--photography", required=True)
    parser.add_argument("--distribution", required=True)
    args = parser.parse_args()
    try:
        result = audit(args.browser, args.photography, args.distribution, args.head)
    except (ValueError, KeyError, OSError, zipfile.BadZipFile, UnicodeError, json.JSONDecodeError) as exc:
        print("Artifact audit failed: " + str(exc), file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    print("Manual screenshot inspection remains mandatory.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
