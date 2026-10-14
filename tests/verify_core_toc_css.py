#!/usr/bin/env python3
"""Verify that native Core TOC links, not unrelated buttons, meet Slateframe's control contract."""
from __future__ import annotations

import re
import sys
from pathlib import Path

SELECTOR = ':is(.slateframe-prose,.editor-styles-wrapper) .wp-block-table-of-contents a'
REQUIRED = {
    'display': 'inline-flex',
    'align-items': 'center',
    'min-block-size': 'var(--slateframe-control)',
    'max-inline-size': '100%',
    'overflow-wrap': 'anywhere',
}
LEGACY = re.compile(r'ez-toc|yoast|jetpack|wpcode|polylang|time2log|time2analyze', re.I)


def declarations(css: str, selector: str) -> dict[str, str]:
    """Parse one exact non-nested rule; reject duplicates and malformed declarations."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    matches = re.findall(re.escape(selector) + r'\s*\{([^{}]*)\}', css, flags=re.S)
    if len(matches) != 1:
        raise ValueError(f'expected one native TOC link rule, found {len(matches)}')
    values: dict[str, str] = {}
    for item in matches[0].split(';'):
        if not item.strip():
            continue
        if ':' not in item:
            raise ValueError('malformed native TOC declaration')
        key, value = item.split(':', 1)
        key, value = key.strip().lower(), re.sub(r'\s+', '', value)
        if not key or not value or key in values:
            raise ValueError('duplicate or empty native TOC declaration')
        values[key] = value
    return values


def verify(root: Path) -> None:
    root = root.resolve()
    css_dir = root / 'assets/css'
    if css_dir.is_symlink() or not css_dir.is_dir():
        raise ValueError('missing or linked CSS directory')
    reading = css_dir / 'reading.css'
    files = [root / 'style.css', root / 'rtl.css', *sorted(css_dir.glob('*.css'))]
    if reading not in files:
        raise ValueError('missing reading.css')
    for path in files:
        if path.is_symlink() or not path.is_file():
            raise ValueError(f'missing or linked CSS file: {path}')
        if LEGACY.search(path.read_text(encoding='utf-8')):
            raise ValueError(f'plugin or site-specific CSS marker in {path.name}')
    css = reading.read_text(encoding='utf-8')
    if '.slateframe-prose .wp-block-table-of-contents{' not in css:
        raise ValueError('missing native Core TOC block presentation')
    values = declarations(css, SELECTOR)
    for key, expected in REQUIRED.items():
        if values.get(key) != expected:
            raise ValueError(f'native TOC links require {key}:{expected}')
    if values.get('white-space') == 'nowrap':
        raise ValueError('native TOC links must reflow')


if __name__ == '__main__':
    try:
        verify(Path(__file__).resolve().parents[1])
        print('Native Core TOC control contract verified')
    except (ValueError, OSError, UnicodeError) as exc:
        print(f'::error::{exc}', file=sys.stderr)
        sys.exit(1)
