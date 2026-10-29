"""Negative tests for native Core Comments screenshot integrity."""
from pathlib import Path
import struct
import tempfile
import unittest
import zlib
from verify_core_comments_thread_evidence import CAPTURES, verify

def chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)

def png(width, height):
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    row = b"\x00" + b"\x00" * (width * 3)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(row * height)) + chunk(b"IEND", b"")

class CoreCommentsThreadEvidence(unittest.TestCase):
    def test_valid_and_invalid_png(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, (width, height) in CAPTURES.items():
                (root / name).write_bytes(png(width, height))
            verify(root)
            for name, (width, height) in CAPTURES.items():
                path = root / name
                path.unlink()
                with self.assertRaises(FileNotFoundError):
                    verify(root)
                path.write_bytes(png(width + 1, height))
                with self.assertRaisesRegex(ValueError, "wrong viewport dimensions"):
                    verify(root)
                path.write_bytes(png(width, height)[:-12])
                with self.assertRaisesRegex(ValueError, "incomplete PNG"):
                    verify(root)
                damaged = bytearray(png(width, height))
                damaged[-20] ^= 1
                path.write_bytes(damaged)
                with self.assertRaisesRegex(ValueError, "corrupt PNG chunk"):
                    verify(root)
                path.write_bytes(b"invalid")
                with self.assertRaisesRegex(ValueError, "invalid PNG signature"):
                    verify(root)
                path.write_bytes(png(width, height))
            verify(root)

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name, (width, height) in CAPTURES.items():
                (root / name).write_bytes(png(width, height))
            name = next(iter(CAPTURES))
            target = root / "target.png"
            target.write_bytes((root / name).read_bytes())
            (root / name).unlink()
            (root / name).symlink_to(target)
            with self.assertRaisesRegex(ValueError, "linked screenshot"):
                verify(root)

if __name__ == "__main__":
    unittest.main()
