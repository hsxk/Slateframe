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

REQUIRED = {(filename, title, f'viewport-{width}') for filename, title in SUITES.items()
            if filename != 'photography-zoom-caption.spec.js' for width in VIEWPORTS}
REQUIRED.update({
    ('photography-raster-lightbox.spec.js', 'raster photography exposes responsive candidates and stable intrinsic geometry', 'viewport-390'),
    ('photography-native-sequence.spec.js', 'Core Lightbox keyboard focus and 44px target', 'viewport-390'),
    ('photography-native-sequence.spec.js', 'Gallery WCAG A/AA axe', 'viewport-390'),
    *{('photography-native-sequence.spec.js', 'full WordPress page screenshots', f'viewport-{w}') for w in (320, 390, 768, 1920)},
    ('photography-class-only.spec.js', 'class-only Gallery loads Photography CSS without lightbox', 'viewport-390'),
    ('photography-class-only.spec.js', 'ordinary Core Gallery without class or lightbox does not load Photography CSS', 'viewport-390'),
    ('photography-class-only.spec.js', 'RTL, CJK and zoomed captions stay contained', 'viewport-390'),
    *{('photography-class-only.spec.js', 'forced colors and reduced motion do not break layout', f'viewport-{w}') for w in (390, 1440)},
    *{('photography-class-only.spec.js', 'class-only Gallery records full WordPress screenshot', f'viewport-{w}') for w in (390, 1440)},
    *{('photography-zoom-caption.spec.js', title, 'viewport-1440') for title in (
        'native caption reflows at 400% zoom in LTR/RTL',
        'class-only caption reflows at 400% zoom in LTR/RTL',
        'normal mobile keeps caption and image width parity')},
})


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
    for key in sorted(REQUIRED):
        matches = found.get(key, [])
        if len(matches) != 1:
            raise ValueError(f"Required Gallery test not executed exactly once: {key}")
        results = matches[0].get("results", [])
        if len(results) != 1 or results[0].get("status") != "passed" or matches[0].get("status") not in ("expected", None):
            raise ValueError(f"Gallery test failed, skipped or retried: {key}")
    summary = report.get("stats", {})
    if not summary or any(summary.get(k, 0) for k in ("unexpected", "flaky", "interrupted")):
        raise ValueError("Playwright report includes unexpected or flaky tests")
    print(f"Verified {len(REQUIRED)} executed Gallery viewport assertions")


if __name__ == "__main__":
    verify(json.loads(REPORT.read_text(encoding="utf-8")))
