#!/usr/bin/env python3
"""Require a complete, exact-SHA WordPress/Chromium visual-state inventory.

This verifies evidence coverage, not pixel quality or ZIP integrity. The
existing inventory verifier and human visual inspection remain mandatory.
"""
import argparse
import json
import math
from pathlib import Path
import re


def require(condition, message):
    if not condition:
        raise ValueError(message)


def required_browser_screenshots():
    """Contract for required responsive, Core-first and accessibility states."""
    required = {}
    for mode in ("compact", "default", "spacious"):
        for width in (320, 375, 390, 412, 768, 1440, 1920):
            for direction in ("ltr", "rtl-200-forced-colors"):
                required[f"appearance-breakpoints-{mode}-{width}-{direction}.png"] = width
        for width in (390, 1440):
            for page in ("portfolio", "knowledge", "photography",
                         "photography-lightbox", "search-controls",
                         "empty-search", "editorial-pathways"):
                required[f"appearance-{mode}-viewport-{width}-{page}.png"] = width
    for width in (390, 1440):
        for name in (f"gutenberg-viewport-{width}-top.png",
                     f"footer-presentation-{width}.png",
                     f"print-article-viewport-{width}.png"):
            required[name] = width
        # Core element screenshots can be narrower than their viewport.
        required[f"core-post-comments-form-{width}-ltr.png"] = None
        required[f"authored-form-ltr-400-forced-colors-{width}.png"] = None
    required.update({
        "mobile-header-inline-viewport-320.png": 320,
        "mobile-header-inline-viewport-390.png": 390,
        "gutenberg-knowledge-faq-390-rtl-200-forced-colors.png": 390,
        "gutenberg-knowledge-400-390-ltr-forced-colors.png": None,
        "gutenberg-knowledge-400-390-rtl-forced-colors.png": None,
        "gutenberg-knowledge-400-1440-ltr-forced-colors.png": None,
        "gutenberg-knowledge-400-1440-rtl-forced-colors.png": None,
        "footer-footnotes-viewport-390-rtl-200-forced-colors.png": 390,
        "footer-bidi-390-rtl-400-forced-colors.png": 390,
        "footer-bidi-1440-ltr.png": 1440,
        "footer-blank-identity-390-rtl-400-forced-colors.png": 390,
        "footer-blank-identity-1440-ltr.png": 1440,
        "post-navigation-bidi-390-rtl-400-forced-colors.png": None,
        "post-navigation-bidi-1440-ltr.png": None,
        "index-readable-fallback-390-rtl-400-forced-colors.png": None,
        "index-readable-fallback-1440-ltr.png": None,
        "search-readable-fallback-390-rtl-400-forced-colors.png": None,
        "search-readable-fallback-1440-ltr.png": None,
        "archive-readable-fallback-390-rtl-400-forced-colors.png": None,
        "archive-readable-fallback-1440-ltr.png": None,
        "menu-front-recovery-390-rtl-400-forced-colors.png": None,
        "menu-front-recovery-1440-ltr.png": None,
        "taxonomy-readable-390-rtl-400-forced-colors.png": 390,
        "taxonomy-readable-1440-ltr.png": 1440,
        "taxonomy-readable-category-390-rtl-400-forced-colors.png": None,
        "media-readable-attachment-390-rtl-400-forced-colors.png": 390,
        "media-readable-attachment-1440-ltr.png": 1440,
        "media-readable-hero-390-rtl-400-forced-colors.png": 390,
        "media-invisible-image-390-rtl-400-forced-colors.png": 390,
        "media-invisible-file-url-390-rtl-400-forced-colors.png": 390,
        "media-non-http-file-url-390-rtl-400-forced-colors.png": 390,
        "media-fragment-file-url-390-rtl-400-forced-colors.png": 390,
        "card-filtered-thumbnail-390-rtl-400-forced-colors.png": 390,
        "card-interactive-thumbnail-390-rtl-400-forced-colors.png": 390,
        "card-aria-role-thumbnail-390-rtl-400-forced-colors.png": 390,
        "card-aria-composite-thumbnail-390-rtl-400-forced-colors.png": 390,
        "author-blank-identity-390-rtl-400-forced-colors.png": None,
        "author-blank-identity-1440-ltr.png": None,
        "header-bidi-390-rtl-400-forced-colors.png": 390,
        "header-bidi-1440-ltr.png": 1440,
        "header-blank-brand-390-rtl-400-forced-colors.png": 390,
        "header-blank-brand-1440-ltr.png": 1440,
    })
    return required


def audit_browser_coverage(records):
    """Reject incomplete or mislabeled screenshot evidence."""
    require(isinstance(records, dict), "browser screenshot inventory must be an object")
    required = required_browser_screenshots()
    missing = sorted(required.keys() - records.keys())
    require(not missing, "missing mandatory browser coverage: " + ", ".join(missing[:8]))
    for name, width in required.items():
        meta = records[name]
        require(isinstance(meta, dict) and isinstance(meta.get("height"), int)
                and meta["height"] > 0 and (width is None or meta.get("width") == width),
                "wrong required browser viewport: " + name)
    return len(required)


def audit_knowledge_400_metrics(directory):
    """Validate real 400% Gutenberg glyph geometry in all four directions/widths."""
    directory = Path(directory)
    require(directory.is_dir() and not directory.is_symlink(), "missing Gutenberg 400% metrics directory")

    def finite_number(value):
        return type(value) in (int, float) and math.isfinite(value)

    for width in (390, 1440):
        for direction in ("ltr", "rtl"):
            name = f"gutenberg-knowledge-400-{width}-{direction}-metrics.json"
            path = directory / name
            require(path.is_file() and not path.is_symlink(), "missing Gutenberg 400% metrics: " + name)
            try:
                metrics = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, UnicodeError, json.JSONDecodeError) as exc:
                raise ValueError("invalid Gutenberg 400% metrics: " + name) from exc
            require(isinstance(metrics, dict), "invalid Gutenberg 400% metrics: " + name)
            require(metrics.get("rootFont") == "64px" and metrics.get("direction") == direction
                    and metrics.get("viewport") == width,
                    "wrong Gutenberg 400% state: " + name)
            require(type(metrics.get("measured")) is int and metrics["measured"] > 8
                    and metrics.get("escaped") == [],
                    "clipped or unmeasured Gutenberg 400% glyphs: " + name)
            region = metrics.get("region")
            require(isinstance(region, dict) and all(finite_number(region.get(k)) for k in ("left", "right"))
                    and -2 <= region["left"] < region["right"] <= width + 2,
                    "Gutenberg 400% region outside viewport: " + name)
            baseline = metrics.get("editorShellBaseline")
            overflow = metrics.get("overflow")
            procedure = metrics.get("procedureOverflow")
            require(all(finite_number(v) for v in (baseline, overflow, procedure))
                    and baseline >= 0 and overflow >= 0 and procedure >= 0
                    and overflow <= baseline + 1 and procedure <= 1,
                    "Gutenberg 400% overflow regression: " + name)
    return 4


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--head", required=True)
    parser.add_argument("--metrics", required=True)
    args = parser.parse_args()
    require(re.fullmatch(r"[0-9a-f]{40}", args.head) is not None, "invalid HEAD SHA")
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    require(manifest.get("head_sha") == args.head, "stale screenshot inventory")
    count = audit_browser_coverage(manifest.get("screenshots"))
    metric_count = audit_knowledge_400_metrics(args.metrics)
    print(json.dumps({"head_sha": args.head, "required_states": count,
                      "total_screenshots": len(manifest["screenshots"]),
                      "verified_400_percent_states": metric_count}, sort_keys=True))
    print("Full artifact audit and manual visual inspection remain mandatory.")


if __name__ == "__main__":
    main()
