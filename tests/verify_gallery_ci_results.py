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
    *{('lightbox-rtl-safe-area.spec.js', 'native Core lightbox close control follows RTL inline-end safe area and restores focus', f'viewport-{w}') for w in VIEWPORTS},
    *{('lightbox-rtl-safe-area.spec.js', 'native Core lightbox close control retains LTR right-edge placement', f'viewport-{w}') for w in VIEWPORTS},
    *{('lightbox-rtl-safe-area.spec.js', 'native Core gallery navigation respects mobile bottom safe area and desktop Core placement', f'viewport-{w}') for w in VIEWPORTS},
    ('lightbox-rtl-safe-area.spec.js', 'native Core navigation preserves its 959px/960px breakpoint', 'viewport-390'),
    *{('photography-native-sequence.spec.js', 'two-frame Gallery centers final image in LTR and RTL at every viewport', f'viewport-{w}') for w in VIEWPORTS},
    *{('photography-class-only.spec.js', 'two-frame Gallery centers final image in LTR and RTL at every viewport', f'viewport-{w}') for w in VIEWPORTS},
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
    """Validate individual executions *and* reporter totals, never only totals."""
    if not isinstance(report, dict) or not isinstance(report.get('suites'), list) or not report['suites']:
        raise ValueError('Missing Playwright suites')
    if report.get('errors'):
        raise ValueError('Playwright reporter contains top-level errors')
    found = {}
    counts = {'expected': 0, 'skipped': 0}

    def walk(suite, filename=''):
        if not isinstance(suite, dict):
            raise ValueError('Malformed Playwright suite')
        filename = Path(suite.get('file') or filename).name
        for spec in suite.get('specs', []):
            if not isinstance(spec, dict) or not isinstance(spec.get('tests'), list):
                raise ValueError('Malformed Playwright spec')
            for test in spec['tests']:
                if not isinstance(test, dict):
                    raise ValueError('Malformed Playwright test')
                key = (filename, spec.get('title'), test.get('projectName'))
                if not all(isinstance(part, str) and part for part in key):
                    raise ValueError('Missing Playwright test identity')
                if key in found:
                    raise ValueError(f'Duplicate Gallery test identity: {key}')
                found[key] = test
                status, results = test.get('status'), test.get('results')
                if status not in counts or not isinstance(results, list) or len(results) != 1:
                    raise ValueError(f'Unexpected, missing or retried Gallery test: {key}')
                result = results[0]
                if not isinstance(result, dict) or result.get('status') != ('passed' if status == 'expected' else 'skipped'):
                    raise ValueError(f'Inconsistent Gallery test outcome: {key}')
                if result.get('errors') or result.get('error'):
                    raise ValueError(f'Gallery test includes execution errors: {key}')
                counts[status] += 1
        for child in suite.get('suites', []):
            walk(child, filename)

    for suite in report['suites']:
        walk(suite)
    missing = REQUIRED - found.keys()
    if missing:
        raise ValueError(f'Required Gallery test not executed: {sorted(missing)[0]}')
    for key in REQUIRED:
        if found[key]['status'] != 'expected':
            raise ValueError(f'Required Gallery test skipped: {key}')
    stats = report.get('stats')
    if not isinstance(stats, dict):
        raise ValueError('Missing Playwright statistics')
    for key in ('expected', 'skipped', 'unexpected', 'flaky'):
        if type(stats.get(key)) is not int or stats[key] < 0:
            raise ValueError(f'Invalid Playwright statistic: {key}')
    if stats['expected'] != counts['expected'] or stats['skipped'] != counts['skipped']:
        raise ValueError('Playwright statistics disagree with executed tests')
    if stats['unexpected'] or stats['flaky'] or stats.get('interrupted', 0):
        raise ValueError('Playwright report includes unexpected, interrupted or flaky tests')
    print(f'Verified {len(REQUIRED)} required Gallery assertions; {counts["expected"]} passed, {counts["skipped"]} intentional skips')


if __name__ == '__main__':
    verify(json.loads(REPORT.read_text(encoding='utf-8')))
