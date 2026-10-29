"""Require real, complete 390px/400% native MathML screenshots."""
from pathlib import Path
import sys
from verify_related_reading_zoom_evidence import check_complete_png

CAPTURES = (
    'inline-math-390-ltr-400-paragraph.png',
    'inline-math-390-ltr-400-heading.png',
    'inline-math-390-ltr-400-list.png',
    'inline-math-390-rtl-400-paragraph.png',
    'inline-math-390-rtl-400-heading.png',
    'inline-math-390-rtl-400-forced-colors.png',
)

def verify(root: Path) -> None:
    for name in CAPTURES:
        path = root / name
        if any(part.is_symlink() for part in (path, *path.parents)):
            raise ValueError(f'{name}: linked screenshot')
        check_complete_png(path)

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit('Usage: verify_inline_math_zoom_evidence.py SCREENSHOT_DIRECTORY')
    try:
        verify(Path(sys.argv[1]))
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
