#!/usr/bin/env python3
"""Verify the finished release ZIP against committed HEAD blobs, not staging."""

import subprocess
import sys
import zipfile
from pathlib import Path


def committed_blobs(root):
    """Return exact HEAD file object IDs using Git's NUL-delimited tree."""
    output = subprocess.check_output(["git", "-C", str(root), "ls-tree", "-r", "-z", "HEAD"])
    blobs = {}
    for entry in output.split(b"\0"):
        if not entry:
            continue
        metadata, path = entry.split(b"\t", 1)
        mode, kind, object_id = metadata.split(b" ", 2)
        if kind == b"blob" and mode in (b"100644", b"100755"):
            blobs[path.decode("utf-8", "surrogateescape")] = object_id.decode("ascii")
    return blobs


def verify(root, archive_path):
    """Fail closed if any final ZIP file differs from the source revision."""
    committed = committed_blobs(root)
    with zipfile.ZipFile(archive_path, "r") as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            name = member.filename
            if not name.startswith("slateframe/"):
                raise ValueError(f"Refusing ZIP member outside theme root: {name}")
            relative = name[len("slateframe/"):]
            if not relative or relative not in committed:
                raise ValueError(f"Refusing ZIP member absent from HEAD: {name}")
            # Git hash-object computes the repository's object format (SHA-1
            # or SHA-256). Compare actual uncompressed archive bytes, not a
            # mutable staging file or CRC that an archive writer can replace.
            content = archive.read(member)
            actual = subprocess.check_output(
                ["git", "-C", str(root), "hash-object", "--stdin"],
                input=content,
            ).decode("ascii").strip()
            if actual != committed[relative]:
                raise ValueError(f"Refusing ZIP bytes differing from HEAD: {name}")


if __name__ == "__main__":
    try:
        verify(Path(sys.argv[1]), Path(sys.argv[2]))
    except (ValueError, OSError, subprocess.CalledProcessError, zipfile.BadZipFile) as error:
        raise SystemExit(str(error)) from error
