"""Keep the focused skip link readable and bounded at genuine 400% text zoom."""

from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_skip_link_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def png_header(width=390, height=900, corrupt=False):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    chunk = b"IHDR" + ihdr
    crc = zlib.crc32(chunk) & 0xFFFFFFFF
    if corrupt:
        crc ^= 1
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + chunk + struct.pack(">I", crc)


class SkipLinkZoomContract(unittest.TestCase):
    def test_logical_bounded_focus_style(self):
        css = (ROOT / "style.css").read_text()
        self.assertIn(".skip-link:focus{inset-inline-start:var(--slateframe-gutter)", css)
        self.assertIn("max-inline-size:calc(100vw - 2*var(--slateframe-gutter))", css)
        self.assertIn("white-space:normal;overflow-wrap:anywhere!important", css)
        self.assertIn("margin:.75rem;padding:.8rem 1rem;", css)
        self.assertLessEqual(len(css.encode()), 16000)

    def test_computed_zoom_and_keyboard_contract(self):
        js = (ROOT / "tests/browser/author-skip-link.spec.js").read_text()
        for needle in (
            "require('./support/root-text-scale')",
            "await setRootTextScale(page, font, dir);",
            "await setRootTextScale(page, 64, 'rtl');",
            "320, 375, 390, 412, 768, 1440, 1920",
            "['ltr', 'rtl']",
            "await skip.focus()",
            "await skip.press('Enter')",
            "expect(state.height, label + ' target height').toBeGreaterThanOrEqual(44)",
            "wordWrap: style.wordWrap",
            "expect(state.wordWrap, label + ' Core word-wrap alias').toBe('anywhere')",
            "toBeFocused()",
            "fullPage: false",
            "forcedColors: 'active'",
        ):
            with self.subTest(needle=needle):
                self.assertIn(needle, js)
        self.assertNotIn("style.fontSize", js)
        self.assertIn("skip-link-390-' + dir + '-400.png", js)
        self.assertIn(CAPTURES[-1], js)

    def test_ci_requires_all_three_viewports(self):
        workflow = (ROOT / ".github/workflows/quality.yml").read_text()
        self.assertEqual(len(CAPTURES), 3)
        self.assertIn("python3 tests/verify_skip_link_zoom_evidence.py", workflow)
        for name in CAPTURES:
            self.assertIn(name, workflow)

    def test_bad_missing_and_wrong_sized_pngs_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png_header())
            verify(root)
            target = root / CAPTURES[-1]
            target.unlink()
            with self.assertRaises(FileNotFoundError):
                verify(root)
            target.write_bytes(png_header(width=320))
            with self.assertRaisesRegex(ValueError, "390x900"):
                verify(root)
            target.write_bytes(png_header(corrupt=True))
            with self.assertRaisesRegex(ValueError, "corrupt IHDR"):
                verify(root)
            target.write_bytes(b"not a png")
            with self.assertRaisesRegex(ValueError, "PNG signature"):
                verify(root)


if __name__ == "__main__":
    unittest.main()
