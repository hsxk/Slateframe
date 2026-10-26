#!/usr/bin/env python3
"""Reject private, uncommitted and linked files from Slateframe release staging."""

import subprocess
import unicodedata
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
    # Only directories containing actual packaged files are reproducible.
    # Paths excluded by .distignore must not contribute empty directories.
    staged_items = list(theme_dir.rglob("*"))
    packaged_directories = set()
    for staged_file in staged_items:
        if not staged_file.is_file() or staged_file.is_symlink():
            continue
        parent = staged_file.relative_to(theme_dir).parent
        while parent != Path("."):
            packaged_directories.add(parent.as_posix())
            parent = parent.parent
    blocked_extensions = (
        ".pem", ".key", ".p12", ".pfx", ".sql", ".sqlite", ".bak", ".orig", ".swp",
        ".sqlite3", ".db",
        ".db-wal", ".db-shm", ".db-journal",
        ".sqlite-wal", ".sqlite-shm", ".sqlite-journal",
        ".sqlite3-wal", ".sqlite3-shm", ".sqlite3-journal",
    )
    blocked_names = {
        "id_rsa", "id_ed25519", "id_ecdsa", "id_dsa",
        "credentials", "credentials.json", "wp-config.php", "auth.json",
    }

    reserved_stems = {"con", "prn", "aux", "nul", "conin$", "conout$", "clock$"}
    reserved_stems.update(f"com{index}" for index in range(1, 10))
    reserved_stems.update(f"lpt{index}" for index in range(1, 10))
    windows_metacharacters = set('<>:"/|?*') | {chr(92)}
    portable_names = {}

    for item in staged_items:
        relative = item.relative_to(theme_dir)
        name = relative.as_posix()
        # Windows/macOS filesystems may normalize case and Unicode spelling.
        # Reject ambiguous archive entries before writing the ZIP.
        for component in relative.parts:
            # Compatibility folding catches fullwidth separators, dot aliases,
            # DOS device names and trailing Unicode spaces before ZIP creation.
            # Keep the established hidden-path diagnostic for literal dotfiles.
            portable_component = unicodedata.normalize("NFKC", component)
            if (
                portable_component in (".", "..")
                or (portable_component.startswith(".") and not component.startswith("."))
                or any(character in windows_metacharacters for character in portable_component)
                or portable_component.rstrip(" .") != portable_component
                or any(unicodedata.category(character) in ("Cc", "Cf", "Cs") for character in component)
                # Win32 also treats `CON .txt` as a reserved device alias.
                or portable_component.split(".", 1)[0].rstrip(" ").casefold() in reserved_stems
            ):
                raise ValueError(f"Refusing nonportable package path: {name!r}")
        portable_name = unicodedata.normalize("NFKC", name).casefold()
        if portable_name in portable_names and portable_names[portable_name] != name:
            raise ValueError(f"Refusing colliding package paths: {portable_names[portable_name]!r} and {name!r}")
        portable_names[portable_name] = name
        if item.is_symlink():
            raise ValueError(f"Refusing symbolic link in theme package: {name}")
        if not item.is_file() and not item.is_dir():
            raise ValueError(f"Refusing special file in theme package: {name}")
        if any(part.startswith(".") for part in relative.parts):
            raise ValueError(f"Refusing hidden path in theme package: {name}")
        if item.is_dir() and name not in packaged_directories:
            raise ValueError(f"Refusing uncommitted directory in theme package: {name}")
        if item.is_file():
            if name not in committed:
                raise ValueError(f"Refusing uncommitted file in theme package: {name}")
            if name in modified:
                raise ValueError(f"Refusing modified file not committed to HEAD: {name}")
            # A fullwidth dot or compatibility letter can disguise a private
            # extension/name in an otherwise portable ZIP member.
            portable_basename = unicodedata.normalize("NFKC", item.name).casefold()
            # Environment files and compressed database dumps are not theme assets.
            # Check the normalized name so compatibility dots cannot bypass it.
            environment_file = ".env." in portable_basename or portable_basename.endswith(".env")
            compression_extensions = (".gz", ".zip", ".zst", ".xz", ".bz2")
            compressed_private_extension = any(
                portable_basename.endswith(extension + compression)
                for extension in blocked_extensions
                for compression in compression_extensions
            )
            compressed_private_name = any(
                portable_basename == blocked + compression
                for blocked in blocked_names
                for compression in compression_extensions
            )
            if (
                portable_basename in blocked_names
                or portable_basename.endswith(blocked_extensions)
                or environment_file
                or compressed_private_extension
                or compressed_private_name
            ):
                raise ValueError(f"Refusing private or backup file in theme package: {name}")
            if staged_blob_id(root, item) != committed[name]:
                raise ValueError(f"Refusing staged content differing from HEAD: {name}")


if __name__ == "__main__":
    try:
        validate(Path(sys.argv[1]), Path(sys.argv[2]))
    except (ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
