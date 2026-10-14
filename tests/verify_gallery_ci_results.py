#!/usr/bin/env python3
"""Reject missing, skipped or retried Gallery tests in the real CI JSON reporter."""
import json
from pathlib import Path

REPORT = Path("test-artifacts/photography-lightbox/playwright-results.json")
SUITES = {
    "photography-raster-lightbox.spec.js": "mixed raster gallery preserves responsive portrait and square media without cropping",
    "photography-native-sequence.spec.js": "serialized Gallery preserves responsive grid, uncropped media and sources",
    "photography-class-only.spec.js": "class-only Gallery keeps bounded grid and natural media ratio",
    "photography-zoom-caption.spec.js": "normal mobile keeps caption and image width parity",
}
VIEWPORTS = (320, 375, 390, 412, 768, 1440, 1920)


def verify(report):
    found = {}
    def walk(suite, filename=""):
        filename = suite.get("file", filename)
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                key = (Path(filename).name, spec.get("title"), test.get("projectName"))
                found.setdefault(key, []).append(test)
        for child in suite.get("suites", []):
            walk(child, filename)
    for suite in report.get("suites", []):
        walk(suite)
    for filename, title in SUITES.items():
        for width in VIEWPORTS:
            key = (filename, title, f"viewport-{width}")
            matches = found.get(key, [])
            if len(matches) != 1:
                raise ValueError(f"Required Gallery test not executed exactly once: {key}")
            results = matches[0].get("results", [])
            if len(results) != 1 or results[0].get("status") != "passed" or matches[0].get("status") not in ("expected", None):
                raise ValueError(f"Gallery test failed, skipped or retried: {key}")
    summary = report.get("stats", {})
    if not summary or any(summary.get(k, 0) for k in ("unexpected", "flaky", "interrupted")):
        raise ValueError("Playwright report includes unexpected or flaky tests")
    print(f"Verified {len(SUITES) * len(VIEWPORTS)} executed Gallery viewport assertions")


if __name__ == "__main__":
    verify(json.loads(REPORT.read_text(encoding="utf-8")))
