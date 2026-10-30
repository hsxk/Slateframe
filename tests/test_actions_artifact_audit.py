"""Regression tests for offline, exact-SHA release evidence ZIP auditing."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import struct
import tempfile
import unittest
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "slateframe_artifact_audit", ROOT / "bin" / "audit-actions-artifacts.py"
)
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)
HEAD = "a" * 40


def chunk(name, payload=b""):
    return (struct.pack(">I", len(payload)) + name + payload
            + struct.pack(">I", zlib.crc32(name + payload) & 0xffffffff))


def png(width=390, height=44):
    pixels = (b"\0" + b"\0\0\0" * width) * height
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND"))


def crafted_png(width, height, raw, *, depth=8, color=2, interlace=0, compressed=None):
    """Build a CRC-correct PNG with controllable IDAT for adversarial tests."""
    header = struct.pack(">IIBBBBB", width, height, depth, color, 0, 0, interlace)
    stream = zlib.compress(raw) if compressed is None else compressed
    return (b"\x89PNG\\r\\n\x1a\\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", stream) + chunk(b"IEND"))


def zip_bytes(entries):
    target = io.BytesIO()
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, value in entries.items():
            archive.writestr(name, value)
    return target.getvalue()


class ArtifactAudit(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.picture = png()
        self.browser_name = "home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/example.png"
        self.photo_name = "home/runner/work/Slateframe/Slateframe/test-artifacts/photography-lightbox/example.png"
        meta = {"sha256": hashlib.sha256(self.picture).hexdigest(),
                "width": 390, "height": 44, "bytes": len(self.picture)}
        self.browser = {
            self.browser_name: self.picture,
            "home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/HEAD_SHA.txt": HEAD + "\n",
            "home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/BROWSER_SCREENSHOT_INVENTORY.json": json.dumps({
                "head_sha": HEAD, "screenshots": {"example.png": meta}
            }),
        }
        self.photo = {
            self.photo_name: self.picture,
            "home/runner/work/Slateframe/Slateframe/test-artifacts/photography-lightbox/gallery-evidence-manifest.json": json.dumps({
                "commit": HEAD, "screenshots": {"example.png": meta}
            }),
        }
        self.theme = {
            "slateframe/style.css": "/*\nTheme Name: Slateframe\nText Domain: slateframe\n*/",
            "slateframe/screenshot.png": png(1200, 900),
        }
        self.distribution = {}
        self.write()

    def write(self):
        theme = zip_bytes(self.theme)
        self.distribution = {
            "slateframe.zip": theme,
            "HEAD_SHA.txt": HEAD + "\n",
            "SHA256SUMS": hashlib.sha256(theme).hexdigest() + "  slateframe.zip\n",
        }
        for name, records in (("browser", self.browser), ("photo", self.photo),
                              ("distribution", self.distribution)):
            (self.root / (name + ".zip")).write_bytes(zip_bytes(records))

    def check(self, head=HEAD):
        return AUDIT.audit(self.root / "browser.zip", self.root / "photo.zip",
                           self.root / "distribution.zip", head)

    def test_valid_archives_preserve_exact_sha(self):
        result = self.check()
        self.assertEqual((result["browser_png"], result["photography_png"],
                          result["theme_files"]), (1, 1, 2))

    def test_rejects_stale_expected_sha(self):
        with self.assertRaisesRegex(ValueError, "browser HEAD mismatch"):
            self.check("b" * 40)

    def test_rejects_stale_photography_sha(self):
        manifest = json.loads(self.photo["home/runner/work/Slateframe/Slateframe/test-artifacts/photography-lightbox/gallery-evidence-manifest.json"])
        manifest["commit"] = "b" * 40
        self.photo["home/runner/work/Slateframe/Slateframe/test-artifacts/photography-lightbox/gallery-evidence-manifest.json"] = json.dumps(manifest)
        self.write()
        with self.assertRaisesRegex(ValueError, "stale gallery"):
            self.check()

    def test_rejects_tampered_screenshot(self):
        self.browser[self.browser_name] = png(391)
        self.write()
        with self.assertRaisesRegex(ValueError, "screenshot digest mismatch"):
            self.check()

    def test_rejects_missing_screenshot(self):
        self.photo.pop(self.photo_name)
        self.write()
        with self.assertRaisesRegex(ValueError, "screenshot inventory differs"):
            self.check()

    def test_rejects_extra_distribution_content(self):
        self.write()
        with zipfile.ZipFile(self.root / "distribution.zip", "a") as archive:
            archive.writestr("private.env", "NO")
        with self.assertRaisesRegex(ValueError, "unexpected distribution"):
            self.check()

    def test_rejects_theme_zip_path_traversal(self):
        self.theme["slateframe/../private.txt"] = "NO"
        self.write()
        with self.assertRaisesRegex(ValueError, "unsafe ZIP path"):
            self.check()

    def test_rejects_theme_zip_symlink(self):
        self.write()
        data = io.BytesIO()
        with zipfile.ZipFile(data, "w") as archive:
            for name, value in self.theme.items():
                archive.writestr(name, value)
            linked = zipfile.ZipInfo("slateframe/linked")
            linked.create_system = 3
            linked.external_attr = (stat.S_IFLNK | 0o777) << 16
            archive.writestr(linked, "../../secret")
        theme = data.getvalue()
        self.distribution["slateframe.zip"] = theme
        self.distribution["SHA256SUMS"] = hashlib.sha256(theme).hexdigest() + "  slateframe.zip\n"
        (self.root / "distribution.zip").write_bytes(zip_bytes(self.distribution))
        with self.assertRaisesRegex(ValueError, "unsafe ZIP entry"):
            self.check()

    def test_rejects_bad_distribution_checksum(self):
        self.write()
        self.distribution["SHA256SUMS"] = "0" * 64 + "  slateframe.zip\n"
        (self.root / "distribution.zip").write_bytes(zip_bytes(self.distribution))
        with self.assertRaisesRegex(ValueError, "checksum mismatch"):
            self.check()

    def test_rejects_duplicate_zip_member(self):
        self.write()
        with zipfile.ZipFile(self.root / "browser.zip", "a") as archive:
            archive.writestr(self.browser_name, self.picture)
        with self.assertRaisesRegex(ValueError, "duplicate ZIP entry"):
            self.check()

    def test_rejects_invalid_png_crc(self):
        damaged = bytearray(self.picture)
        damaged[-5] ^= 1
        self.browser[self.browser_name] = bytes(damaged)
        manifest = json.loads(self.browser["home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/BROWSER_SCREENSHOT_INVENTORY.json"])
        manifest["screenshots"]["example.png"]["sha256"] = hashlib.sha256(damaged).hexdigest()
        self.browser["home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/BROWSER_SCREENSHOT_INVENTORY.json"] = json.dumps(manifest)
        self.write()
        with self.assertRaisesRegex(ValueError, "PNG CRC mismatch"):
            self.check()


    def test_rejects_extra_browser_private_file(self):
        self.browser["home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/.env"] = "SECRET"
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual artifact file"):
            self.check()

    def test_rejects_extra_photography_private_file(self):
        self.photo["home/runner/work/Slateframe/Slateframe/test-artifacts/photography-lightbox/credentials.txt"] = "SECRET"
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual artifact file"):
            self.check()

    def test_rejects_root_environment_file(self):
        self.theme["slateframe/.env"] = "SECRET"
        self.write()
        with self.assertRaisesRegex(ValueError, "hidden distribution path"):
            self.check()

    def test_rejects_nested_hidden_config(self):
        self.theme["slateframe/assets/.private/config"] = "SECRET"
        self.write()
        with self.assertRaisesRegex(ValueError, "hidden distribution path"):
            self.check()

    def test_rejects_sourcemap_in_assets(self):
        self.theme["slateframe/assets/js/theme.js.map"] = "{}"
        self.write()
        with self.assertRaisesRegex(ValueError, "non-distributable theme file"):
            self.check()

    def test_rejects_executable_inside_images(self):
        self.theme["slateframe/assets/images/unsafe.php"] = "<?php"
        self.write()
        with self.assertRaisesRegex(ValueError, "non-distributable theme file"):
            self.check()

    def test_rejects_unexpected_private_directory(self):
        self.theme["slateframe/private/secret.php"] = "<?php"
        self.write()
        with self.assertRaisesRegex(ValueError, "non-distributable theme file"):
            self.check()

    def test_rejects_unexpected_directory_entry(self):
        self.theme["slateframe/backup/"] = b""
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected distribution directory"):
            self.check()

    def test_rejects_unreviewed_root_php(self):
        self.theme["slateframe/credentials.php"] = "<?php"
        self.write()
        with self.assertRaisesRegex(ValueError, "non-distributable theme file"):
            self.check()

    def test_rejects_unreviewed_root_markdown(self):
        self.theme["slateframe/notes.md"] = "private draft"
        self.write()
        with self.assertRaisesRegex(ValueError, "non-distributable theme file"):
            self.check()

    def test_allows_normal_core_theme_assets(self):
        self.theme["slateframe/assets/css/blocks.css"] = "body {}"
        self.theme["slateframe/assets/js/theme.js"] = "/* vanilla */"
        self.theme["slateframe/assets/images/placeholder.svg"] = "<svg/>"
        self.theme["slateframe/inc/render.php"] = "<?php"
        self.theme["slateframe/patterns/example.php"] = "<?php"
        self.theme["slateframe/languages/slateframe.pot"] = ""
        self.write()
        self.assertEqual(self.check()["theme_files"], 8)


    def test_accepts_reviewed_browser_and_photo_metadata_paths(self):
        root = "home/runner/work/Slateframe/Slateframe/"
        self.browser[root + "test-artifacts/screenshots/VISUAL_EVIDENCE.json"] = "{}"
        self.browser[root + "test-artifacts/browser-review.html"] = "<html></html>"
        self.browser[root + "playwright-report/index.html"] = "<html></html>"
        self.browser["tmp/slateframe-server.log"] = "log"
        self.photo[root + "test-artifacts/photography-lightbox/playwright-results.json"] = "{}"
        self.photo[root + "test-artifacts/photography-review.html"] = "<html></html>"
        self.photo[root + "playwright-report/index.html"] = "<html></html>"
        self.photo["tmp/slateframe-photo-server.log"] = "log"
        self.write()
        self.assertEqual(self.check()["browser_png"], 1)

    def test_rejects_noncanonical_dot_segment(self):
        self.theme["slateframe/assets/./images/placeholder.svg"] = "<svg/>"
        self.write()
        with self.assertRaisesRegex(ValueError, "non-canonical ZIP path"):
            self.check()

    def test_rejects_noncanonical_double_separator(self):
        self.theme["slateframe/assets//images/placeholder.svg"] = "<svg/>"
        self.write()
        with self.assertRaisesRegex(ValueError, "non-canonical ZIP path"):
            self.check()

    def test_rejects_browser_png_outside_screenshot_directory(self):
        self.browser["tmp/example.png"] = self.browser.pop(self.browser_name)
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual screenshot path"):
            self.check()

    def test_rejects_photography_png_outside_fixture_directory(self):
        self.photo["tmp/example.png"] = self.photo.pop(self.photo_name)
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual screenshot path"):
            self.check()

    def test_rejects_nested_browser_screenshot(self):
        misplaced = self.browser_name.replace("/example.png", "/nested/example.png")
        self.browser[misplaced] = self.browser.pop(self.browser_name)
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual screenshot path"):
            self.check()

    def test_rejects_browser_manifest_outside_fixture_directory(self):
        old = "home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/BROWSER_SCREENSHOT_INVENTORY.json"
        self.browser["home/runner/private/BROWSER_SCREENSHOT_INVENTORY.json"] = self.browser.pop(old)
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual manifest location"):
            self.check()

    def test_rejects_photography_manifest_outside_fixture_directory(self):
        old = "home/runner/work/Slateframe/Slateframe/test-artifacts/photography-lightbox/gallery-evidence-manifest.json"
        self.photo["home/runner/private/gallery-evidence-manifest.json"] = self.photo.pop(old)
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual manifest location"):
            self.check()

    def test_rejects_disguised_browser_html_outside_report_directory(self):
        self.browser["home/runner/private/index.html"] = "<html>secret</html>"
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual artifact file"):
            self.check()

    def test_rejects_disguised_photo_log_outside_tmp_directory(self):
        self.photo["home/runner/private/slateframe-photo-server.log"] = "secret"
        self.write()
        with self.assertRaisesRegex(ValueError, "unexpected visual artifact file"):
            self.check()



    def replace_browser_png(self, picture):
        self.browser[self.browser_name] = picture
        key = "home/runner/work/Slateframe/Slateframe/test-artifacts/screenshots/BROWSER_SCREENSHOT_INVENTORY.json"
        manifest = json.loads(self.browser[key])
        record = manifest["screenshots"]["example.png"]
        record["sha256"] = hashlib.sha256(picture).hexdigest()
        record["width"], record["height"] = struct.unpack_from(">II", picture, 16)
        record["bytes"] = len(picture)
        self.browser[key] = json.dumps(manifest)
        self.write()

    def test_accepts_fully_inflated_rgb_png(self):
        self.replace_browser_png(crafted_png(1, 1, b"\x00\x01\x02\x03"))
        self.assertEqual(self.check()["browser_png"], 1)

    def test_accepts_adam7_single_pixel(self):
        self.replace_browser_png(crafted_png(1, 1, b"\x00\x01\x02\x03", interlace=1))
        self.assertEqual(self.check()["browser_png"], 1)

    def test_rejects_invalid_zlib_even_with_matching_sha_and_crc(self):
        self.replace_browser_png(crafted_png(1, 1, b"", compressed=b"not-zlib"))
        with self.assertRaisesRegex(ValueError, "invalid PNG zlib stream"):
            self.check()

    def test_rejects_truncated_zlib_even_with_matching_sha_and_crc(self):
        stream = zlib.compress(b"\x00\x01\x02\x03")[:-2]
        self.replace_browser_png(crafted_png(1, 1, b"", compressed=stream))
        with self.assertRaisesRegex(ValueError, "incomplete or oversized PNG scanlines"):
            self.check()

    def test_rejects_extra_inflated_bytes(self):
        self.replace_browser_png(crafted_png(1, 1, b"\x00\x01\x02\x03\x04"))
        with self.assertRaisesRegex(ValueError, "incomplete or oversized PNG scanlines"):
            self.check()

    def test_rejects_trailing_compressed_garbage(self):
        stream = zlib.compress(b"\x00\x01\x02\x03") + b"junk"
        self.replace_browser_png(crafted_png(1, 1, b"", compressed=stream))
        with self.assertRaisesRegex(ValueError, "incomplete or oversized PNG scanlines"):
            self.check()

    def test_rejects_invalid_png_filter_byte(self):
        self.replace_browser_png(crafted_png(1, 1, b"\x05\x01\x02\x03"))
        with self.assertRaisesRegex(ValueError, "invalid PNG scanline filter"):
            self.check()

    def test_rejects_invalid_png_color_type(self):
        self.replace_browser_png(crafted_png(1, 1, b"\x00\x01\x02\x03", color=5))
        with self.assertRaisesRegex(ValueError, "invalid PNG IHDR"):
            self.check()

    def test_rejects_excessive_png_inflate_size(self):
        self.replace_browser_png(crafted_png(8192, 50000, b"\x00"))
        with self.assertRaisesRegex(ValueError, "oversized PNG decoded payload"):
            self.check()

if __name__ == "__main__":
    unittest.main()
