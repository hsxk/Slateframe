"""Protect bounded Knowledge Steps badges and real 400% PNG evidence."""

from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from verify_knowledge_step_zoom_evidence import CAPTURES, verify

ROOT = Path(__file__).resolve().parents[1]


def chunk(kind, data):
    payload = kind + data
    return (struct.pack(">I", len(data)) + payload
            + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF))


def png(width=390, height=900):
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    scanline = b"\x00" + b"\x00" * (width * 3)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(scanline * height))
            + chunk(b"IEND", b""))


class KnowledgeStepZoomEvidence(unittest.TestCase):
    def test_core_first_bounded_css_and_editor_parity(self):
        css = (ROOT / "assets/css/content-modes.css").read_text(encoding="utf-8")
        bootstrap = (ROOT / "functions.php").read_text(encoding="utf-8")
        self.assertIn("--slateframe-step:max(var(--slateframe-control),1.3rem)", css)
        self.assertIn("min-block-size:var(--slateframe-step)", css)
        self.assertIn("padding-inline-start:calc(var(--slateframe-step) + var(--slateframe-component-gap))", css)
        self.assertIn("inline-size:var(--slateframe-step);block-size:var(--slateframe-step)", css)
        self.assertIn("inset-inline-start:0", css)
        self.assertIn("'assets/css/content-modes.css'", bootstrap)
        self.assertLessEqual(len(css.encode("utf-8")), 7000)
        self.assertNotIn("2.15rem", css.split(".is-style-slateframe-checklist", 1)[0])

    def test_browser_matrix_and_required_exact_viewport_evidence(self):
        spec = (ROOT / "tests/browser/knowledge-nested-lists.spec.js").read_text(encoding="utf-8")
        workflow = (ROOT / ".github/workflows/quality.yml").read_text(encoding="utf-8")
        for token in (
            "await setRootTextScale(page, font, dir)",
            "[320, 375, 390, 412, 768, 1440, 1920]",
            "['ltr', 'rtl']",
            "new AxeBuilder",
            "forcedColors: 'active'",
            "fullPage: false",
            "badge and text do not overlap",
            "native nested bullets",
        ):
            self.assertIn(token, spec)
        self.assertEqual(len(CAPTURES), 3)
        self.assertIn("python3 tests/verify_knowledge_step_zoom_evidence.py", workflow)
        for name in CAPTURES:
            self.assertIn(name, workflow)

    def test_missing_corrupt_truncated_wrong_dimensions_and_non_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in CAPTURES:
                (root / name).write_bytes(png())
            verify(root)
            for name in CAPTURES:
                path = root / name
                path.unlink()
                with self.assertRaises(FileNotFoundError):
                    verify(root)
                path.write_bytes(png(width=320))
                with self.assertRaisesRegex(ValueError, "390x900"):
                    verify(root)
                path.write_bytes(png()[:-12])
                with self.assertRaisesRegex(ValueError, "incomplete PNG"):
                    verify(root)
                damaged = bytearray(png())
                damaged[-20] ^= 1
                path.write_bytes(damaged)
                with self.assertRaisesRegex(ValueError, "corrupt PNG chunk"):
                    verify(root)
                path.write_bytes(b"not a png")
                with self.assertRaisesRegex(ValueError, "PNG signature"):
                    verify(root)
                path.write_bytes(png())
            verify(root)


if __name__ == "__main__":
    unittest.main()
