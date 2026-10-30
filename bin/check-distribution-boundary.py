#!/usr/bin/env python3
"""Fail closed on personal branding, paid gates, and remote code in the release ZIP.

This is a distributable-content check, not a substitute for Theme Check,
ZIP integrity, security review, or the exact-HEAD artifact auditor.
"""
import argparse
import re
import sys
import zipfile

TEXT = ('.php', '.css', '.js', '.json', '.txt', '.svg')
LEGACY = re.compile(r'(?i)(?:time2log|time2analyze|where[-_ ]?the[-_ ]?sun[-_ ]?sets|wp[-_]branches[-_]for[-_]post|(?<![a-z0-9])t2l[-_])')
PAID = re.compile(r'(?i)(?:upgrade\s+to\s+pro|premium\s+(?:version|features)|(?:enter|activate)\s+(?:your\s+)?licen[cs]e\s+key|purchase\s+(?:a\s+)?licen[cs]e|unlock\s+(?:all\s+)?features)')
SECRET = re.compile(r'(?i)-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b|\bsk-proj-[A-Za-z0-9_-]{20,}')
REMOTE_CSS = re.compile(r'(?i)@import\b|url\(\s*[\'\"]?https?://')
REMOTE_JS = re.compile(r'(?i)\bfetch\s*\(|\bnew\s+XMLHttpRequest\s*\(')
REMOTE_PHP = re.compile(r'(?i)\b(?:wp_remote_(?:get|post|request)|curl_init)\s*\(')


def audit_release(z):
    """Inspect exactly the distributed theme, not tests or repository docs."""
    checked = 0
    for info in z.infolist():
        name = info.filename
        if info.is_dir() or not name.startswith('slateframe/'):
            continue
        suffix = '.' + name.rsplit('.', 1)[-1].lower() if '.' in name else ''
        if suffix not in TEXT:
            continue
        raw = z.read(info)
        try:
            content = raw.decode('utf-8')
        except UnicodeDecodeError as error:
            raise ValueError(f'non-UTF-8 distributable text: {name}') from error
        checks = [('legacy project identifier', LEGACY),
                  ('paid-feature gate or upsell', PAID),
                  ('credential/private key marker', SECRET)]
        if suffix == '.css':
            checks.append(('remote stylesheet or asset', REMOTE_CSS))
        if suffix == '.js':
            checks.append(('runtime network request', REMOTE_JS))
        if suffix == '.php':
            checks.append(('runtime server network request', REMOTE_PHP))
        for label, pattern in checks:
            if pattern.search(content):
                raise ValueError(f'{label} in distributable: {name}')
        checked += 1
    if not checked:
        raise ValueError('no distributable theme text files')
    return checked


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip_path')
    args = parser.parse_args()
    with zipfile.ZipFile(args.zip_path) as z:
        count = audit_release(z)
    print(f'Checked {count} distributable text files for public theme boundaries')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        print(f'::error::{error}', file=sys.stderr)
        sys.exit(1)
