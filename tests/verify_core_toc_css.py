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
    """Read one exact top-level selector, not a prefixed or conditional match.

    A substring regex could accept a nonexistent ancestor or print-only
    media rule. Only an unconditional exact selector establishes parity.
    """
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    depth = 0
    start = 0
    opening = 0
    current_selector = ''
    quote = None
    escaped = False
    rules: list[str] = []
    for index, char in enumerate(css):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in ("'", '"'):
            quote = char
            continue
        if char == '{':
            if depth == 0:
                current_selector = css[start:index].strip()
                opening = index + 1
            depth += 1
        elif char == '}':
            depth -= 1
            if depth < 0:
                raise ValueError('unbalanced Core TOC CSS braces')
            if depth == 0:
                if current_selector == selector:
                    block = css[opening:index]
                    if '{' in block or '}' in block:
                        raise ValueError('nested Core TOC link rule')
                    rules.append(block)
                start = index + 1
    if depth != 0 or quote:
        raise ValueError('unbalanced Core TOC CSS block or string')
    if len(rules) != 1:
        raise ValueError(f'expected one exact top-level Core TOC link rule, found {len(rules)}')
    if len(re.findall(re.escape(selector) + r'\s*\{', css)) != 1:
        raise ValueError('duplicate or conditional Core TOC link rule')
    values: dict[str, str] = {}
    for declaration in rules[0].split(';'):
        if not declaration.strip():
            continue
        if ':' not in declaration:
            raise ValueError('malformed Core TOC CSS declaration')
        key, value = declaration.split(':', 1)
        key, value = key.strip().lower(), re.sub(r'\s+', '', value)
        if not key or not value or key in values:
            raise ValueError('duplicate or empty Core TOC CSS declaration')
        values[key] = value
    return values

def verify(root: Path) -> None:
    root = root.resolve()
    css_dir = root / 'assets/css'
    if css_dir.is_symlink() or not css_dir.is_dir():
        raise ValueError('missing or linked CSS directory')
    reading = css_dir / 'reading.css'
    toc = css_dir / 'core-table-of-contents.css'
    files = [root / 'style.css', root / 'rtl.css', *sorted(css_dir.glob('*.css'))]
    if reading not in files or toc not in files:
        raise ValueError('missing reading.css or conditional Core TOC stylesheet')
    for path in files:
        if path.is_symlink() or not path.is_file():
            raise ValueError(f'missing or linked CSS file: {path}')
        if LEGACY.search(path.read_text(encoding='utf-8')):
            raise ValueError(f'plugin or site-specific CSS marker in {path.name}')
    css = reading.read_text(encoding='utf-8')
    if '.slateframe-prose .wp-block-table-of-contents{' not in css:
        raise ValueError('missing native Core TOC block presentation')
    if SELECTOR in css:
        raise ValueError('Core TOC link rule must remain conditional, not in shared reading.css')
    values = declarations(toc.read_text(encoding='utf-8'), SELECTOR)
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
