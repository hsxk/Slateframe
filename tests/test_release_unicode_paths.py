"""Reject misleading Unicode filename controls without blocking CJK content."""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

CHECKER = Path(__file__).resolve().parents[1] / 'bin' / 'check-package-manifest.py'
spec = importlib.util.spec_from_file_location('slateframe_manifest', CHECKER)
manifest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manifest)


class UnicodePackagePathTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='slateframe-unicode-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / 'repo'
        self.stage = Path(self.tmp.name) / 'staged'
        self.root.mkdir()
        self.stage.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Slateframe QA')
        self.git('config', 'user.email', 'qa@example.invalid')

    def git(self, *args):
        subprocess.run(['git', *args], cwd=self.root, check=True, capture_output=True)

    def validate_name(self, name, reject):
        original = self.root / name
        original.parent.mkdir(parents=True, exist_ok=True)
        original.write_bytes(b'public fixture\n')
        self.git('add', '-A')
        self.git('commit', '-qm', 'add portable asset fixture')
        staged = self.stage / name
        staged.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(original, staged)
        if reject:
            with self.assertRaisesRegex(ValueError, 'nonportable package path'):
                manifest.validate(self.root, self.stage)
        else:
            manifest.validate(self.root, self.stage)

    def test_right_to_left_override_is_rejected(self):
        self.validate_name('image\u202egnp.php', True)

    def test_left_to_right_isolate_is_rejected(self):
        self.validate_name('image\u2066safe.php', True)

    def test_zero_width_space_is_rejected(self):
        self.validate_name('image\u200bname.php', True)

    def test_zero_width_joiner_is_rejected(self):
        self.validate_name('image\u200dname.php', True)

    def test_c1_control_is_rejected(self):
        self.validate_name('image\u0085name.php', True)

    def test_bidi_mark_in_parent_directory_is_rejected(self):
        self.validate_name('assets\u200f/photo.svg', True)

    @unittest.skipUnless(os.name == 'posix', 'requires POSIX surrogateescape filenames')
    def test_invalid_utf8_surrogate_filename_is_rejected(self):
        self.validate_name(os.fsdecode(b'invalid-\xff.css'), True)

    def test_japanese_chinese_asset_name_is_allowed(self):
        self.validate_name('写真/中文素材.svg', False)

    def test_arabic_asset_name_is_allowed(self):
        self.validate_name('صور/واجهة.svg', False)

    def test_emoji_asset_name_is_allowed(self):
        self.validate_name('assets/landscape-🌄.svg', False)

    def test_combining_accent_is_allowed_when_unique(self):
        self.validate_name('assets/cafe\u0301.svg', False)

    def test_soft_hyphen_is_rejected(self):
        self.validate_name('asset\u00adphoto.svg', True)

    def test_byte_order_mark_is_rejected(self):
        self.validate_name('asset\ufeffphoto.svg', True)

    def test_arabic_letter_mark_is_rejected(self):
        self.validate_name('asset\u061cphoto.svg', True)

    def test_left_to_right_embedding_is_rejected(self):
        self.validate_name('asset\u202aphoto.svg', True)

    def test_pop_directional_isolate_is_rejected(self):
        self.validate_name('asset\u2069photo.svg', True)

    def test_hebrew_asset_name_is_allowed(self):
        self.validate_name('תמונות/צילום.svg', False)

    def test_standard_hyphen_underscore_asset_is_allowed(self):
        self.validate_name('assets/project-cover_2.svg', False)


if __name__ == '__main__':
    unittest.main()
