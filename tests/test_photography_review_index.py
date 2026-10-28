"""Offline Photography review must reject stale, linked, or corrupt evidence."""
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

MODULE = Path(__file__).resolve().parents[1] / "bin/photography-review-index.py"
SPEC = importlib.util.spec_from_file_location("slateframe_photography_review", MODULE)
photo = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(photo)
HEAD = "b" * 40


def chunk(kind, payload):
    data = kind + payload
    return struct.pack(">I", len(payload)) + data + struct.pack(">I", zlib.crc32(data) & 0xffffffff)


def png():
    header = struct.pack(">IIBBBBB", 390, 900, 8, 2, 0, 0, 0)
    return photo.review.SIGNATURE + chunk(b"IHDR", header) + chunk(
        b"IDAT", zlib.compress((b"\0" + b"\0" * (390 * 3)) * 900)
    ) + chunk(b"IEND", b"")


class PhotographyReviewIndex(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "photography-lightbox"
        self.root.mkdir()
        self.names = ["core-sequence-390.png", "lightbox-navigation-rtl-viewport-1440.png"]
        self.write_fixture()

    def write_fixture(self):
        records = {}
        for name in self.names:
            data = png()
            (self.root / name).write_bytes(data)
            records[name] = {"width": 390, "height": 900,
                             "sha256": hashlib.sha256(data).hexdigest(),
                             "pixel_sha256": "a" * 64}
        (self.root / "gallery-evidence-manifest.json").write_text(
            json.dumps({"schema_version": 1, "commit": HEAD, "screenshots": records})
        )

    def test_exact_head_and_full_resolution_links(self):
        entries = photo.load_photography(self.root, HEAD)
        self.assertEqual(len(entries), 2)
        page = photo.review.render(HEAD, entries, 1, "photography-lightbox/")
        self.assertIn("Photography / Lightbox", page)
        self.assertIn("Browse remaining 1 verified screenshots", page)
        for name in self.names:
            self.assertIn('href="photography-lightbox/' + name + '"', page)
        self.assertNotIn("<script", page)

    def test_stale_head_and_boolean_schema_rejected(self):
        with self.assertRaisesRegex(ValueError, "exact HEAD"):
            photo.load_photography(self.root, "c" * 40)
        path = self.root / "gallery-evidence-manifest.json"
        data = json.loads(path.read_text())
        data["schema_version"] = True
        path.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, "exact HEAD"):
            photo.load_photography(self.root, HEAD)

    def test_modified_and_missing_png_rejected(self):
        target = self.root / self.names[0]
        target.write_bytes(png()[:-12])
        with self.assertRaisesRegex(ValueError, "digest mismatch"):
            photo.load_photography(self.root, HEAD)
        target.unlink()
        with self.assertRaises(OSError):
            photo.load_photography(self.root, HEAD)

    def test_unlisted_and_symlinked_files_rejected(self):
        (self.root / "unlisted.png").write_bytes(png())
        with self.assertRaisesRegex(ValueError, "unexpected"):
            photo.load_photography(self.root, HEAD)
        (self.root / "unlisted.png").unlink()
        target = self.root / self.names[0]
        target.unlink()
        target.symlink_to(self.root / self.names[1])
        with self.assertRaisesRegex(ValueError, "unexpected"):
            photo.load_photography(self.root, HEAD)

    def test_duplicate_json_keys_and_nonfinite_constants_rejected(self):
        path = self.root / "gallery-evidence-manifest.json"
        original = path.read_text()
        path.write_text(original.replace('"commit":', '"commit": "' + "c" * 40 + '", "commit":', 1))
        with self.assertRaisesRegex(ValueError, "duplicate JSON key"):
            photo.load_photography(self.root, HEAD)
        path.write_text(original[:-1] + ', "invalid": NaN}')
        with self.assertRaisesRegex(ValueError, "invalid JSON constant"):
            photo.load_photography(self.root, HEAD)

    def test_invalid_dimensions_and_pixel_digest_metadata_rejected(self):
        path = self.root / "gallery-evidence-manifest.json"
        original = json.loads(path.read_text())
        for key, value in (("width", True), ("height", 0), ("pixel_sha256", "invalid")):
            data = json.loads(json.dumps(original))
            data["screenshots"][self.names[0]][key] = value
            path.write_text(json.dumps(data))
            with self.assertRaises(ValueError):
                photo.load_photography(self.root, HEAD)

    def test_trailing_png_data_rejected_even_if_digest_updated(self):
        path = self.root / self.names[0]
        damaged = png() + b"trailing"
        path.write_bytes(damaged)
        manifest = self.root / "gallery-evidence-manifest.json"
        data = json.loads(manifest.read_text())
        data["screenshots"][self.names[0]]["sha256"] = hashlib.sha256(damaged).hexdigest()
        manifest.write_text(json.dumps(data))
        with self.assertRaises(ValueError):
            photo.load_photography(self.root, HEAD)


    def test_known_playwright_report_is_allowed_but_linked_report_is_rejected(self):
        report = self.root / "playwright-results.json"
        report.write_text("{}")
        self.assertEqual(len(photo.load_photography(self.root, HEAD)), 2)
        report.unlink()
        report.symlink_to(self.root / self.names[0])
        with self.assertRaisesRegex(ValueError, "unexpected"):
            photo.load_photography(self.root, HEAD)

    def test_hardlinked_image_rejected(self):
        alias = self.root.parent / "alias.png"
        alias.hardlink_to(self.root / self.names[0])
        with self.assertRaisesRegex(ValueError, "unsafe evidence"):
            photo.load_photography(self.root, HEAD)


if __name__ == "__main__":
    unittest.main()
