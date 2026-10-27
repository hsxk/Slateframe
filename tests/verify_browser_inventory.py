#!/usr/bin/env python3
"""Exact-SHA inventory for every real WordPress/Chromium Browser screenshot."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

from verify_footnotes_screenshots import validate_png, read_bounded_regular_file, reject_linked_ancestors

ROOT = Path('test-artifacts/screenshots')
MANIFEST = 'BROWSER_SCREENSHOT_INVENTORY.json'
METADATA = frozenset(('HEAD_SHA.txt', 'VISUAL_EVIDENCE.json', MANIFEST))
# Viewport-prefixed files are full-page evidence; Gutenberg and control crops
# use distinct prefixes. The two Appearance component crops remain exempt.
FULL_PAGE = re.compile(
    r'(?:appearance-(compact|default|spacious)-viewport-(390|1440)-'
    r'(?!footnotes\.png|content-pagination\.png)[a-z0-9-]+'
    r'|viewport-(320|375|390|412|768|1440|1920)-[a-z0-9-]+)\.png\Z'
)
PORTFOLIO_FULL_PAGE = re.compile(
    r'portfolio-reflow-(?P<width>390|1440)-(?:ltr-400|rtl-400-forced-colors)-full-page\.png\Z'
    r'|portfolio-reflow-(?P<tablet>680)-ltr-full-page\.png\Z'
)
NAME = re.compile(r'[a-zA-Z0-9][a-zA-Z0-9_.-]*\.png\Z')

# A raw screenshot count cannot prove that all Appearance modes or viewport
# families were captured. Extra PNGs must never satisfy this coverage gate.
REQUIRED_APPEARANCE = frozenset(
    f'appearance-{profile}-viewport-{width}-{surface}.png'
    for profile in ('compact', 'default', 'spacious')
    for width in (390, 1440)
    for surface in (
        'portfolio', 'photography', 'knowledge', 'post',
        'home-controls', 'search-controls', 'page', 'photography-lightbox',
    )
)
REQUIRED_RESPONSIVE = frozenset(
    f'viewport-{width}-page.png'
    for width in (320, 375, 390, 412, 768, 1440, 1920)
)
# These are exact-HEAD WordPress/Chromium artifacts, not WordPress.org theme screenshots.
# The inventory must reject missing FAQ evidence even when other PNGs exist.
REQUIRED_FAQ = frozenset((
    'gutenberg-knowledge-faq-390-rtl-200-forced-colors.png',
    'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png',
    'gutenberg-knowledge-faq-1440-ltr.png',
    'knowledge-faq-axe-390-rtl-closed.png',
    'knowledge-faq-axe-390-rtl-expanded.png',
    'knowledge-faq-axe-1440-ltr-closed.png',
    'knowledge-faq-axe-1440-ltr-expanded.png',
    'knowledge-faq-axe-390-rtl-expanded-200-forced-colors.png',
    'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png',
))
REQUIRED_SCREENSHOTS = REQUIRED_APPEARANCE | REQUIRED_RESPONSIVE | REQUIRED_FAQ

# A filename alone is insufficient proof of a readable multi-line paragraph or
# keyboard focus target. These minimum crop heights deliberately stay below
# the expected Core rendering at 200% text and the 44px control contract.
FAQ_MIN_CROP_HEIGHT = {
    'gutenberg-knowledge-faq-final-paragraph-390-rtl-200-forced-colors.png': 80,
    'knowledge-faq-axe-390-rtl-200-forced-colors-keyboard-focus.png': 44,
}

# A crop may be narrower than its viewport, but it cannot be wider. Keep
# element screenshots from a desktop viewport from masquerading as 390px
# RTL evidence, without imposing a full-page screenshot dimension.
FAQ_VIEWPORT_WIDTH = {
    name: 1440 if '-1440-' in name else 390
    for name in REQUIRED_FAQ
}


def check_faq_viewport_width(name, width):
    viewport = FAQ_VIEWPORT_WIDTH.get(name)
    if viewport is not None and width > viewport:
        raise ValueError(f'FAQ crop exceeds viewport: {name} ({width}px > {viewport}px)')


def check_faq_crop_dimensions(name, height):
    minimum = FAQ_MIN_CROP_HEIGHT.get(name)
    if minimum is not None and height < minimum:
        raise ValueError(f'Incomplete FAQ visual crop: {name} ({height}px < {minimum}px)')


def check_coverage(records):
    missing = REQUIRED_SCREENSHOTS.difference(records)
    if missing:
        raise ValueError('Missing required visual coverage: ' + ', '.join(sorted(missing)))


def scan(root):
    reject_linked_ancestors(root)
    if not root.is_dir():
        raise ValueError('Missing screenshot directory')
    records = {}
    total = 0
    for path in root.iterdir():
        if path.is_symlink() or not path.is_file() or path.stat().st_nlink != 1:
            raise ValueError('Linked or nonregular artifact entry')
        if path.suffix != '.png':
            if path.name not in METADATA:
                raise ValueError('Unexpected non-screenshot artifact file')
            continue
        if not NAME.fullmatch(path.name):
            raise ValueError('Unsafe screenshot name')
        data = read_bounded_regular_file(path, 20 * 1024 * 1024)
        if len(data) < 33 or not data.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValueError('Invalid screenshot PNG')
        width = int.from_bytes(data[16:20], 'big')
        if not 200 <= width <= 1924:
            raise ValueError('Invalid screenshot width')
        actual_width, height = validate_png(path, width)
        check_faq_crop_dimensions(path.name, height)
        check_faq_viewport_width(path.name, actual_width)
        match = FULL_PAGE.fullmatch(path.name)
        if match and actual_width != int(match.group(2) or match.group(3)):
            raise ValueError('Full-page viewport width mismatch')
        portfolio_page = PORTFOLIO_FULL_PAGE.fullmatch(path.name)
        if portfolio_page and actual_width != int(portfolio_page.group('width') or portfolio_page.group('tablet')):
            raise ValueError('Portfolio full-page viewport width mismatch')
        total += len(data)
        if total > 1024 * 1024 * 1024:
            raise ValueError('Screenshot artifact too large')
        records[path.name] = dict(sha256=hashlib.sha256(data).hexdigest(),
                                  width=actual_width, height=height, bytes=len(data))
        if len(records) > 5000:
            raise ValueError('Too many screenshot files')
    if len(records) < len(REQUIRED_SCREENSHOTS):
        raise ValueError('Insufficient screenshot evidence')
    check_coverage(records)
    return dict(sorted(records.items()))


def bounded_json(path):
    if path.is_symlink() or not path.is_file() or path.stat().st_nlink != 1:
        raise ValueError('Missing or linked evidence manifest')
    return json.loads(read_bounded_regular_file(path, 1024 * 1024))


def identity(root):
    sha = os.environ.get('SLATEFRAME_EVIDENCE_SHA', '')
    if not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('Invalid expected HEAD SHA')
    if read_bounded_regular_file(root / 'HEAD_SHA.txt', 64).decode('ascii').strip() != sha:
        raise ValueError('Screenshot HEAD SHA mismatch')
    run = os.environ.get('GITHUB_RUN_ID') or None
    attempt = os.environ.get('GITHUB_RUN_ATTEMPT') or None
    if os.environ.get('GITHUB_ACTIONS') == 'true':
        if subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() != sha:
            raise ValueError('Checkout HEAD mismatch')
        if not run or not run.isdecimal() or not attempt or not attempt.isdecimal():
            raise ValueError('Missing Actions run identity')
    return sha, run, attempt


def check_legacy(root, sha, records):
    old = bounded_json(root / 'VISUAL_EVIDENCE.json')
    if old.get('head_sha') != sha or not isinstance(old.get('files'), list) or len(old['files']) < 18:
        raise ValueError('Legacy screenshot evidence missing or stale')
    seen = set()
    for item in old['files']:
        if not isinstance(item, dict) or item.get('name') in seen:
            raise ValueError('Duplicate legacy evidence entry')
        name = item['name']
        seen.add(name)
        if name not in records or any(item.get(k) != records[name][k] for k in ('sha256', 'width', 'height')):
            raise ValueError('Legacy evidence hash mismatch')


def check_faq_state_evidence(root):
    """Reject accidentally duplicated closed/expanded FAQ screenshots.

    Compare decoded pixels, not PNG byte hashes: compression and metadata can
    differ even when the browser captured the same visual state twice.
    """
    for width, direction in ((390, 'rtl'), (1440, 'ltr')):
        stem = f'knowledge-faq-axe-{width}-{direction}-'
        closed = root / f'{stem}closed.png'
        expanded = root / f'{stem}expanded.png'
        closed_size, closed_raster = validate_png(closed, width, include_raster_hash=True)
        expanded_size, expanded_raster = validate_png(expanded, width, include_raster_hash=True)
        if closed_raster == expanded_raster:
            raise ValueError(f'Identical FAQ closed and expanded evidence: {width}px {direction}')
        # Different pixels can be caused by hover, focus or anti-aliasing while
        # the disclosure remains closed. Native Core Details must reveal answer
        # content and increase the captured FAQ's height meaningfully.
        if expanded_size[1] - closed_size[1] < 24:
            raise ValueError(f'FAQ expanded evidence lacks content growth: {width}px {direction}')


def run(mode, root=ROOT):
    sha, run_id, attempt = identity(root)
    target = root / MANIFEST
    if target.is_symlink() or (target.exists() and target.stat().st_nlink != 1):
        raise ValueError('Linked inventory destination')
    if mode == 'generate':
        target.unlink(missing_ok=True)
    records = scan(root)
    check_legacy(root, sha, records)
    check_faq_state_evidence(root)
    expected = dict(schema_version=1, head_sha=sha, run_id=run_id,
                    run_attempt=attempt, screenshots=records)
    if mode == 'generate':
        temporary = None
        try:
            with tempfile.NamedTemporaryFile('w', dir=root, prefix='.inventory-', delete=False) as handle:
                temporary = Path(handle.name)
                json.dump(expected, handle, sort_keys=True, indent=2)
                handle.write('\n')
            temporary.replace(target)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
    if bounded_json(target) != expected:
        raise ValueError('Incomplete, stale or tampered screenshot inventory')
    return len(records)


if __name__ == '__main__':
    try:
        if len(sys.argv) != 2 or sys.argv[1] not in ('generate', 'verify'):
            raise ValueError('Usage: verify_browser_inventory.py generate|verify')
        print(f'Validated {run(sys.argv[1])} exact-HEAD Browser PNGs')
    except (ValueError, OSError, UnicodeError, subprocess.CalledProcessError) as error:
        sys.exit(f'Browser inventory rejected: {error}')
