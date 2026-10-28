#!/usr/bin/env python3
"""Verify exact-HEAD Photography screenshots and generate a local review index."""
import argparse
import hashlib
import importlib.util
import os
from pathlib import Path
import re

MODULE = Path(__file__).with_name("visual-review-index.py")
SPEC = importlib.util.spec_from_file_location("slateframe_browser_visual_review", MODULE)
review = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(review)


def load_photography(directory: Path, head: str) -> list[dict]:
    """Validate each image against the successful Photography Actions manifest."""
    if not review.SHA_RE.fullmatch(head):
        raise ValueError("expected Photography HEAD must be a 40-character lowercase SHA")
    if any(path.is_symlink() for path in (directory, *directory.parents)):
        raise ValueError("linked Photography evidence directory")
    manifest = review.strict_json(
        review.read_regular(directory / "gallery-evidence-manifest.json", 2 * 1024 * 1024)
    )
    if (not isinstance(manifest, dict) or type(manifest.get("schema_version")) is not int
            or manifest["schema_version"] != 1 or manifest.get("commit") != head):
        raise ValueError("Photography manifest does not match exact HEAD")
    screenshots = manifest.get("screenshots")
    if not isinstance(screenshots, dict) or not screenshots:
        raise ValueError("empty Photography screenshot inventory")
    allowed = set(screenshots) | {"gallery-evidence-manifest.json", "playwright-results.json"}
    for item in directory.iterdir():
        if item.is_symlink() or not item.is_file() or item.name not in allowed:
            raise ValueError(f"unexpected Photography evidence entry: {item.name}")
    if (directory / "playwright-results.json").exists():
        review.read_regular(directory / "playwright-results.json", 20 * 1024 * 1024)
    entries = []
    for name, metadata in screenshots.items():
        if (not isinstance(name, str) or not review.NAME_RE.fullmatch(name)
                or not isinstance(metadata, dict)):
            raise ValueError("unsafe Photography screenshot record")
        digest = metadata.get("sha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ValueError(f"invalid Photography digest: {name}")
        if any(type(metadata.get(key)) is not int or metadata[key] < 1 for key in ("width", "height")):
            raise ValueError(f"invalid Photography dimensions: {name}")
        pixel_hash = metadata.get("pixel_sha256")
        if pixel_hash is not None and (
                not isinstance(pixel_hash, str)
                or not re.fullmatch(r"[0-9a-f]{64}", pixel_hash)):
            raise ValueError(f"invalid Photography pixel digest metadata: {name}")
        data = review.read_regular(directory / name)
        if hashlib.sha256(data).hexdigest() != digest:
            raise ValueError(f"Photography screenshot digest mismatch: {name}")
        if review.png_dimensions(data) != (metadata["width"], metadata["height"]):
            raise ValueError(f"Photography screenshot dimensions mismatch: {name}")
        entries.append({"name": name, "width": metadata["width"], "height": metadata["height"],
                        "required": False, "group": "Photography / Lightbox"})
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("screenshots", type=Path, help="Extracted photography-lightbox directory")
    parser.add_argument("head", help="Exact 40-character Git commit SHA")
    parser.add_argument("--limit-per-group", type=int, default=24)
    parser.add_argument("--output", type=Path, help="HTML path outside the evidence directory")
    args = parser.parse_args()
    entries = load_photography(args.screenshots, args.head)
    output = args.output or args.screenshots.parent / "photography-review.html"
    if args.screenshots.resolve() in (output.resolve(), *output.resolve().parents):
        raise ValueError("write review index outside verified Photography directory")
    relative = os.path.relpath(args.screenshots, output.parent).replace(os.sep, "/")
    prefix = "/".join(review.quote(part) for part in relative.split("/")) + "/"
    output.write_text(review.render(args.head, entries, args.limit_per_group, prefix), encoding="utf-8")
    print(f"Indexed {len(entries)} verified Photography screenshots for {args.head}: {output}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, UnicodeError) as error:
        raise SystemExit(str(error)) from error
