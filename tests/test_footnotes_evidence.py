"""Protect exact-HEAD WordPress screenshot provenance and PNG structure."""
import hashlib
import json
import struct
import tempfile
import unittest
import zlib
from pathlib import Path

from verify_footnotes_screenshots import expected_images, validate_png, verify, normalized_raster_hash, write_manifest, MAX_FILE_BYTES

HEAD = "6f8e94b9407b454516efe494a753de76476e5767"


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def minimal_png(width=390, height=200, *, level=6, filter_type=0):
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    pixels = (bytes([filter_type]) + b"\x00" * (width * 4)) * height
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(pixels, level)) + chunk(b"IEND", b"")


class FootnotesEvidenceContract(unittest.TestCase):
    def test_required_matrix_is_three_profiles_and_all_surfaces(self):
        expected = expected_images()
        self.assertEqual(len(expected), 18)
        self.assertEqual(sum(name.startswith("appearance-") for name in expected), 6)
        for name in expected:
            self.assertTrue(name.endswith(".png"))

    def test_valid_png_and_viewport_mismatch(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "evidence.png"
            path.write_bytes(minimal_png())
            self.assertEqual(validate_png(path, 390), (390, 200))
            with self.assertRaisesRegex(ValueError, "wrong viewport"):
                validate_png(path, 320)

    def test_truncation_and_crc_fail_closed(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "evidence.png"
            path.write_bytes(minimal_png()[:-8])
            with self.assertRaisesRegex(ValueError, "incomplete|truncated"):
                validate_png(path, 390)
            damaged = bytearray(minimal_png())
            damaged[25] ^= 1
            path.write_bytes(damaged)
            with self.assertRaisesRegex(ValueError, "CRC"):
                validate_png(path, 390)

    def test_invalid_raster_and_filter_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "evidence.png"
            ihdr = struct.pack(">IIBBBBB", 200, 24, 8, 6, 0, 0, 0)
            for pixels in (b"bad", (b"\x05" + b"\x00" * 800) + (b"\x00" * 801) * 23):
                path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
                                 + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b""))
                with self.assertRaisesRegex(ValueError, "invalid raster|invalid PNG scanline"):
                    validate_png(path, 390)

    def test_compressed_png_metadata_cannot_fake_appearance_difference(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            for name, viewport in expected_images().items():
                level = 1 if "compact" in name else (9 if "spacious" in name else 6)
                (folder / name).write_bytes(minimal_png(viewport, 200, level=level))
            self.assertNotEqual((folder / "appearance-compact-viewport-390-footnotes.png").read_bytes(),
                                (folder / "appearance-default-viewport-390-footnotes.png").read_bytes())
            with self.assertRaisesRegex(ValueError, "identical"):
                verify(folder, HEAD)

    def test_all_png_filters_decode_nonzero_pixels_consistently(self):
        top = bytes([10, 20, 30, 40, 50, 60])
        bottom = bytes([70, 80, 90, 100, 110, 120])
        baseline = normalized_raster_hash(b"\x00" + top + b"\x00" + bottom, 2, 2, 3)

        def encode_row(row, previous, mode):
            encoded = bytearray()
            for i, value in enumerate(row):
                left = row[i - 3] if i >= 3 else 0
                above = previous[i]
                corner = previous[i - 3] if i >= 3 else 0
                predictor = (0, left, above, (left + above) // 2)[mode] if mode < 4 else 0
                if mode == 4:
                    candidate = left + above - corner
                    differences = [abs(candidate - x) for x in (left, above, corner)]
                    predictor = (left, above, corner)[differences.index(min(differences))]
                encoded.append((value - predictor) & 255)
            return bytes([mode]) + encoded

        for mode in range(5):
            with self.subTest(filter=mode):
                filtered = encode_row(top, bytes(6), mode) + encode_row(bottom, top, mode)
                self.assertEqual(normalized_raster_hash(filtered, 2, 2, 3), baseline)

    def test_png_filter_variants_cannot_disguise_identical_appearance(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            filters = {"compact": 1, "default": 2, "spacious": 4}
            for name, viewport in expected_images().items():
                filter_type = next((value for profile, value in filters.items()
                                    if name.startswith(f"appearance-{profile}-")), 0)
                (folder / name).write_bytes(minimal_png(viewport, 200, filter_type=filter_type))
            with self.assertRaisesRegex(ValueError, "identical"):
                verify(folder, HEAD)

    def test_real_400_percent_portfolio_full_page_preserves_all_pixels(self):
        # 56c4b88 WordPress/Chromium produced an actual 390x22358 RTL page.
        # It fits the existing 25M-pixel budget and must not be cropped.
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'portfolio-rtl-400.png'
            path.write_bytes(minimal_png(390, 22358))
            self.assertEqual(validate_png(path, 390), (390, 22358))

    def test_tall_evidence_still_rejects_height_above_explicit_cap(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / 'too-tall.png'
            # IHDR is rejected before any raster decompression/allocation.
            ihdr = struct.pack('>IIBBBBB', 390, 24001, 8, 6, 0, 0, 0)
            path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
                             + chunk(b'IDAT', zlib.compress(b'tiny')) + chunk(b'IEND', b''))
            with self.assertRaisesRegex(ValueError, 'wrong viewport or dimensions'):
                validate_png(path, 390)

    def test_oversized_raster_rejected_before_decompression(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "evidence.png"
            ihdr = struct.pack(">IIBBBBB", 1440, 20000, 8, 6, 0, 0, 0)
            path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
                             + chunk(b"IDAT", zlib.compress(b"tiny")) + chunk(b"IEND", b""))
            with self.assertRaisesRegex(ValueError, "wrong viewport or dimensions"):
                validate_png(path, 1440)

    def test_unknown_critical_png_chunk_is_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "evidence.png"
            source = minimal_png()
            first_chunk_end = 8 + 12 + 13
            altered = source[:first_chunk_end] + chunk(b"CRIT", b"unsafe") + source[first_chunk_end:]
            path.write_bytes(altered)
            with self.assertRaisesRegex(ValueError, "critical PNG chunk"):
                validate_png(path, 390)

    def test_symlinked_screenshot_directory_is_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            actual = Path(root) / "actual"
            actual.mkdir()
            alias = Path(root) / "alias"
            alias.symlink_to(actual, target_is_directory=True)
            (actual / "HEAD_SHA.txt").write_text(HEAD + "\n")
            with self.assertRaisesRegex(ValueError, "symlinked"):
                verify(alias, HEAD)
            (actual / "evidence.png").write_bytes(minimal_png())
            with self.assertRaisesRegex(ValueError, "linked"):
                validate_png(alias / "evidence.png", 390)

    def test_symlinks_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / "actual.png"
            target.write_bytes(minimal_png())
            link = Path(root) / "evidence.png"
            link.symlink_to(target)
            with self.assertRaisesRegex(ValueError, "linked"):
                validate_png(link, 390)

    def test_exact_head_and_missing_files_fail_closed(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            with self.assertRaisesRegex(ValueError, "missing"):
                verify(folder, HEAD)
            with self.assertRaisesRegex(ValueError, "does not match"):
                verify(folder, "0" * 40)
            with self.assertRaisesRegex(ValueError, "40-character"):
                verify(folder, "bad")

    def test_reused_appearance_screenshots_fail(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            for name, viewport in expected_images().items():
                (folder / name).write_bytes(minimal_png(viewport, 200))
            with self.assertRaisesRegex(ValueError, "identical"):
                verify(folder, HEAD)

    def test_complete_evidence_passes(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            for name, viewport in expected_images().items():
                height = 200
                if name.startswith('appearance-compact-'):
                    height = 201
                elif name.startswith('appearance-spacious-'):
                    height = 202
                (folder / name).write_bytes(minimal_png(viewport, height))
            self.assertEqual(len(verify(folder, HEAD)), 18)


    def test_oversized_png_file_rejected_before_read(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "oversized.png"
            with path.open("wb") as output:
                output.truncate(MAX_FILE_BYTES + 1)
            with self.assertRaisesRegex(ValueError, "oversized"):
                validate_png(path, 390)

    def test_png_reserved_chunk_bit_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "reserved.png"
            source = minimal_png()
            pos = 8 + 12 + 13
            path.write_bytes(source[:pos] + chunk(b"abca", b"reserved") + source[pos:])
            with self.assertRaisesRegex(ValueError, "reserved chunk"):
                validate_png(path, 390)

    def test_png_palette_must_precede_idat_and_appear_once(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "palette.png"
            source = minimal_png()
            ihdr_end = 8 + 12 + 13
            idat_end = len(source) - 12
            palette = chunk(b"PLTE", b"\x00\x00\x00")
            for modified in (
                source[:ihdr_end] + palette + palette + source[ihdr_end:],
                source[:idat_end] + palette + source[idat_end:],
                source[:ihdr_end] + chunk(b"PLTE", b"bad-length") + source[ihdr_end:],
            ):
                path.write_bytes(modified)
                with self.assertRaisesRegex(ValueError, "palette"):
                    validate_png(path, 390)
            path.write_bytes(source[:ihdr_end] + palette + source[ihdr_end:])
            self.assertEqual(validate_png(path, 390), (390, 200))

    def test_symlinked_ancestor_and_unlisted_artifact_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            real = Path(root) / "real"
            real.mkdir()
            nested = real / "screenshots"
            nested.mkdir()
            (nested / "evidence.png").write_bytes(minimal_png())
            alias = Path(root) / "alias"
            alias.symlink_to(real, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "linked"):
                validate_png(alias / "screenshots" / "evidence.png", 390)
            (nested / "HEAD_SHA.txt").write_text(HEAD + "\n")
            (nested / "unlisted.png").symlink_to(nested / "evidence.png")
            with self.assertRaisesRegex(ValueError, "symlinked artifact entry"):
                verify(nested, HEAD)

    def test_head_marker_size_is_bounded(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n" + "x" * 100)
            with self.assertRaisesRegex(ValueError, "oversized"):
                verify(folder, HEAD)

    def test_manifest_is_deterministic_and_bound_to_head_and_image_bytes(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            for name, viewport in expected_images().items():
                height = 200 + (1 if "compact" in name else 2 if "spacious" in name else 0)
                (folder / name).write_bytes(minimal_png(viewport, height))
            checked = verify(folder, HEAD)
            path = write_manifest(folder, HEAD, checked)
            before = path.read_bytes()
            payload = json.loads(before)
            self.assertEqual(payload["head_sha"], HEAD)
            self.assertEqual(payload["schema_version"], 1)
            self.assertEqual(len(payload["files"]), 18)
            self.assertEqual([item["name"] for item in payload["files"]], sorted(expected_images()))
            for entry in payload["files"]:
                self.assertEqual(entry["sha256"], hashlib.sha256((folder / entry["name"]).read_bytes()).hexdigest())
            write_manifest(folder, HEAD, checked)
            self.assertEqual(path.read_bytes(), before)

    def test_manifest_replaces_link_without_following_it(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            target = folder / "outside.txt"
            target.write_text("protected")
            linked = folder / "VISUAL_EVIDENCE.json"
            linked.symlink_to(target)
            # The manifest writer itself must not follow a stale output symlink.
            path = write_manifest(folder, HEAD, {})
            self.assertFalse(path.is_symlink())
            self.assertEqual(target.read_text(), "protected")

    def test_nonregular_png_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "fake.png"
            path.mkdir()
            with self.assertRaisesRegex(ValueError, "non-regular"):
                validate_png(path, 390)


    def test_normalized_raster_fingerprint_includes_dimensions(self):
        # The same 24 RGB bytes can represent different 2-D arrangements.
        flattened = bytes(range(24))
        a = b"\x00" + flattened[:12] + b"\x00" + flattened[12:]
        b = b"\x00" + flattened
        self.assertNotEqual(normalized_raster_hash(a, 4, 2, 3),
                            normalized_raster_hash(b, 8, 1, 3))

    def test_manifest_records_normalized_appearance_raster_hash(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            for name, viewport in expected_images().items():
                height = 200 + (1 if "compact" in name else 2 if "spacious" in name else 0)
                (folder / name).write_bytes(minimal_png(viewport, height))
            payload = json.loads(write_manifest(folder, HEAD, verify(folder, HEAD)).read_text())
            for entry in payload["files"]:
                if entry["name"].startswith("appearance-"):
                    self.assertEqual(len(entry["raster_sha256"]), 64)
                else:
                    self.assertNotIn("raster_sha256", entry)

    def test_multiple_consecutive_idat_chunks_are_valid(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "split.png"
            data = minimal_png()
            ihdr_end = 8 + 12 + 13
            length = struct.unpack_from(">I", data, ihdr_end)[0]
            compressed = data[ihdr_end + 8:ihdr_end + 8 + length]
            halfway = len(compressed) // 2
            path.write_bytes(data[:ihdr_end] + chunk(b"IDAT", compressed[:halfway])
                             + chunk(b"IDAT", compressed[halfway:]) + chunk(b"IEND", b""))
            self.assertEqual(validate_png(path, 390), (390, 200))

    def test_png_ancillary_metadata_does_not_change_raster_hash(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            plain = folder / "plain.png"
            tagged = folder / "tagged.png"
            source = minimal_png()
            pos = 8 + 12 + 13
            plain.write_bytes(source)
            tagged.write_bytes(source[:pos] + chunk(b"tEXt", b"Description\x00metadata") + source[pos:])
            self.assertEqual(validate_png(plain, 390, include_raster_hash=True),
                             validate_png(tagged, 390, include_raster_hash=True))


    def test_unexpected_artifact_file_and_nested_directory_are_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            folder = Path(root)
            (folder / "HEAD_SHA.txt").write_text(HEAD + "\n")
            stray = folder / "private.env"
            stray.write_text("should never upload")
            with self.assertRaisesRegex(ValueError, "unexpected screenshot artifact"):
                verify(folder, HEAD)
            stray.unlink()
            (folder / "nested").mkdir()
            with self.assertRaisesRegex(ValueError, "unexpected screenshot artifact"):
                verify(folder, HEAD)


if __name__ == "__main__":
    unittest.main()
