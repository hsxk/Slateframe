#!/usr/bin/env python3
"""Reject private, uncommitted and linked files from Slateframe release staging."""

import subprocess
import sys
from pathlib import Path


def git_paths(root, *arguments):
    """Read NUL-delimited paths without splitting filenames on whitespace."""
    output = subprocess.check_output(["git", "-C", str(root), *arguments])
    return {value.decode("utf-8", "surrogateescape") for value in output.split(b"\0") if value}


def committed_blobs(root):
    """Read HEAD blob IDs using NUL separators (safe for unusual file names)."""
    output = subprocess.check_output(
        ["git", "-C", str(root), "ls-tree", "-r", "-z", "HEAD"]
    )
    blobs = {}
    for entry in output.split(b"\0"):
        if not entry:
            continue
        metadata, path = entry.split(b"\t", 1)
        mode, kind, object_id = metadata.split(b" ", 2)
        if kind == b"blob" and mode in (b"100644", b"100755"):
            blobs[path.decode("utf-8", "surrogateescape")] = object_id.decode("ascii")
    return blobs


def staged_blob_id(root, path):
    """Hash exact staged bytes in this repository's Git object format."""
    return subprocess.check_output(
        ["git", "-C", str(root), "hash-object", "--no-filters", str(path)],
        text=True,
    ).strip()


def validate(root, theme_dir):
    """Validate staged files against HEAD, not the index or local files."""
    committed = committed_blobs(root)
    modified = git_paths(root, "diff", "--name-only", "-z", "HEAD", "--")
    blocked_extensions = (".pem", ".key", ".p12", ".pfx", ".sql", ".sqlite", ".bak", ".orig", ".swp")
    blocked_names = {"id_rsa", "id_ed25519", "credentials", "credentials.json"}

    for item in theme_dir.rglob("*"):
        relative = item.relative_to(theme_dir)
        name = relative.as_posix()
        if item.is_symlink():
            raise ValueError(f"Refusing symbolic link in theme package: {name}")
        if not item.is_file() and not item.is_dir():
            raise ValueError(f"Refusing special file in theme package: {name}")
        if any(part.startswith(".") for part in relative.parts):
            raise ValueError(f"Refusing hidden path in theme package: {name}")
        if item.is_file():
            if name not in committed:
                raise ValueError(f"Refusing uncommitted file in theme package: {name}")
            if name in modified:
                raise ValueError(f"Refusing modified file not committed to HEAD: {name}")
            if item.name.lower() in blocked_names or item.name.lower().endswith(blocked_extensions):
                raise ValueError(f"Refusing private or backup file in theme package: {name}")
            if staged_blob_id(root, item) != committed[name]:
                raise ValueError(f"Refusing staged content differing from HEAD: {name}")


if __name__ == "__main__":
    try:
        validate(Path(sys.argv[1]), Path(sys.argv[2]))
    except (ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
