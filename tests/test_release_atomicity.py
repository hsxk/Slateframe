"""Preserve the last valid distributable ZIP across failed Slateframe builds.

Uses disposable Git fixtures and real rsync/ZIP creation; never contacts a site.
"""
from __future__ import annotations

import hashlib
import os
import shlex
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

BUILDER = Path(__file__).resolve().parents[1] / 'bin' / 'build-theme-zip.sh'


class AtomicReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='slateframe-atomic-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'theme'
        (self.root / 'bin').mkdir(parents=True)
        (self.root / 'bin' / 'build-theme-zip.sh').write_bytes(BUILDER.read_bytes())
        (self.root / 'bin' / 'build-theme-zip.sh').chmod(0o755)
        (self.root / '.distignore').write_text('.git/\nbin/\ndist/\n.distignore\n')
        for filename in ('style.css', 'functions.php', 'theme.json', 'readme.txt', 'LICENSE'):
            (self.root / filename).write_text(filename + '\n')
        (self.root / 'screenshot.png').write_bytes(b'fixture-png')
        (self.root / 'bin' / 'check-package-manifest.py').write_text(
            "import os,sys\n"
            "from pathlib import Path\n"
            "if os.getenv('FAIL_MANIFEST')=='1': raise SystemExit('manifest blocked')\n"
            "if os.getenv('FAIL_SECOND_MANIFEST')=='1':\n"
            " marker=Path(sys.argv[2])/'check-seen'\n"
            " if marker.exists(): raise SystemExit('second manifest blocked')\n"
            " marker.write_text('checked')\n"
        )
        (self.root / 'bin' / 'check-screenshot.py').write_text(
            "import os,sys\n"
            "from pathlib import Path\n"
            "if os.getenv('FAIL_SCREENSHOT')=='1': raise SystemExit('screenshot blocked')\n"
            "if os.getenv('INJECT_SYMLINK')=='1':\n"
            " (Path(sys.argv[1]).parent/'leak').symlink_to('/etc/hosts')\n"
        )
        subprocess.run(['git', 'init', '-q'], cwd=self.root, check=True)
        subprocess.run(['git', 'config', 'user.name', 'Slateframe QA'], cwd=self.root, check=True)
        subprocess.run(['git', 'config', 'user.email', 'qa@example.invalid'], cwd=self.root, check=True)
        subprocess.run(['git', 'add', '.'], cwd=self.root, check=True)
        subprocess.run(['git', 'commit', '-qm', 'fixture'], cwd=self.root, check=True)
        self.dist = self.root / 'dist'
        self.archive = self.dist / 'slateframe.zip'

    def build(self, env=None, output=None):
        settings = dict(os.environ)
        settings.pop('SOURCE_DATE_EPOCH', None)
        settings.update(env or {})
        cmd = ['bash', str(self.root / 'bin' / 'build-theme-zip.sh')]
        if output is not None:
            cmd.append(str(output))
        return subprocess.run(cmd, cwd=self.root, env=settings, capture_output=True, text=True, timeout=30)

    def prior_release(self):
        self.dist.mkdir(exist_ok=True)
        self.archive.write_bytes(b'last-known-good-release')
        return self.archive.read_bytes()

    def assert_preserved(self, settings=None, mutate=None, output=None):
        previous = self.prior_release()
        if mutate:
            mutate()
        result = self.build(settings, output=output)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(self.archive.read_bytes(), previous)
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))
        return result

    def test_screenshot_validation_failure_preserves_release(self):
        self.assertIn('screenshot blocked', self.assert_preserved({'FAIL_SCREENSHOT': '1'}).stderr)

    def test_manifest_failure_preserves_release(self):
        self.assertIn('manifest blocked', self.assert_preserved({'FAIL_MANIFEST': '1'}).stderr)

    def test_post_screenshot_manifest_failure_preserves_release(self):
        self.assertIn('second manifest blocked', self.assert_preserved({'FAIL_SECOND_MANIFEST': '1'}).stderr)

    def test_missing_required_theme_file_preserves_release(self):
        self.assert_preserved(mutate=lambda: (self.root / 'screenshot.png').unlink())

    def test_staged_symlink_rejection_preserves_release(self):
        self.assertIn('symbolic link', self.assert_preserved({'INJECT_SYMLINK': '1'}).stderr)

    def test_invalid_epoch_preserves_release(self):
        self.assertIn('must be an integer', self.assert_preserved({'SOURCE_DATE_EPOCH': 'invalid'}).stderr)

    def test_future_epoch_preserves_release(self):
        self.assertIn('exceeds ZIP timestamp', self.assert_preserved({'SOURCE_DATE_EPOCH': '4354819200'}).stderr)

    def test_zip_directory_is_rejected_before_staging(self):
        self.archive.parent.mkdir(exist_ok=True)
        self.archive.mkdir()
        sentinel = self.archive / 'do-not-delete'
        sentinel.write_text('keep')
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Refusing directory at theme ZIP destination', result.stderr)
        self.assertEqual(sentinel.read_text(), 'keep')

    def test_success_replaces_prior_release(self):
        old = self.prior_release()
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotEqual(self.archive.read_bytes(), old)
        with zipfile.ZipFile(self.archive) as archive:
            self.assertIn('slateframe/style.css', archive.namelist())
            self.assertEqual(archive.testzip(), None)

    def test_success_cleans_temporary_zip(self):
        self.assertEqual(self.build().returncode, 0)
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def test_repeat_build_is_byte_identical(self):
        self.assertEqual(self.build().returncode, 0)
        before = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        self.assertEqual(self.build().returncode, 0)
        self.assertEqual(hashlib.sha256(self.archive.read_bytes()).hexdigest(), before)

    def test_external_output_is_supported_and_repeatable(self):
        output = Path(self.temp.name) / 'release'
        self.assertEqual(self.build(output=output).returncode, 0)
        first = hashlib.sha256((output / 'slateframe.zip').read_bytes()).hexdigest()
        self.assertEqual(self.build(output=output).returncode, 0)
        self.assertEqual(hashlib.sha256((output / 'slateframe.zip').read_bytes()).hexdigest(), first)

    def test_external_symlinked_output_is_rejected(self):
        outside = Path(self.temp.name) / 'external'
        outside.mkdir()
        link = Path(self.temp.name) / 'alias'
        link.symlink_to(outside, target_is_directory=True)
        result = self.build(output=link)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Output directory must not traverse symbolic links', result.stderr)

    def test_output_target_symlink_to_directory_is_rejected(self):
        self.dist.mkdir()
        outside = Path(self.temp.name) / 'external-zip-dir'
        outside.mkdir()
        marker = outside / 'keep'
        marker.write_text('keep')
        self.archive.symlink_to(outside, target_is_directory=True)
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(marker.read_text(), 'keep')
        self.assertTrue(self.archive.is_symlink())

    def test_partial_zip_writer_failure_preserves_previous_archive(self):
        # The final inline Python invocation receives three path arguments.
        # Inject a partial temporary ZIP and fail before the atomic rename.
        self.prior_release()
        old = self.archive.read_bytes()
        fakebin = Path(self.temp.name) / 'fakebin'
        fakebin.mkdir()
        real_python = subprocess.check_output(['which', 'python3'], text=True).strip()
        wrapper = fakebin / 'python3'
        wrapper.write_text(
            '#!/bin/sh\n'
            'if [ "$1" = "-" ] && [ "$#" -eq 4 ]; then\n'
            '  printf partial > "$4"\n'
            '  exit 73\n'
            'fi\n'
            f'exec "{real_python}" "$@"\n'
        )
        wrapper.chmod(0o755)
        result = self.build({'PATH': str(fakebin) + os.pathsep + os.environ['PATH']})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.archive.read_bytes(), old)
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def test_atomic_rename_failure_preserves_previous_archive(self):
        self.prior_release()
        old = self.archive.read_bytes()
        fakebin = Path(self.temp.name) / 'fakebin'
        fakebin.mkdir()
        wrapper = fakebin / 'mv'
        wrapper.write_text('#!/bin/sh\nexit 74\n')
        wrapper.chmod(0o755)
        result = self.build({'PATH': str(fakebin) + os.pathsep + os.environ['PATH']})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.archive.read_bytes(), old)
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def test_fifo_is_rejected_without_hanging_or_losing_previous_zip(self):
        if not hasattr(os, 'mkfifo'):
            self.skipTest('FIFOs not supported')
        previous = self.prior_release()
        os.mkfifo(self.root / 'unsafe-pipe')
        result = self.build()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('Refusing non-regular entry in theme package', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def test_fifo_is_rejected_without_previous_release(self):
        if not hasattr(os, 'mkfifo'):
            self.skipTest('FIFOs not supported')
        os.mkfifo(self.root / 'unsafe-pipe')
        result = self.build()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('Refusing non-regular entry in theme package', result.stderr)
        self.assertFalse(self.archive.exists())
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def test_nested_fifo_is_rejected(self):
        if not hasattr(os, 'mkfifo'):
            self.skipTest('FIFOs not supported')
        previous = self.prior_release()
        (self.root / 'assets').mkdir()
        os.mkfifo(self.root / 'assets' / 'unsafe-pipe')
        result = self.build()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('assets/unsafe-pipe', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_corrupt_written_zip_preserves_previous_release(self):
        previous = self.prior_release()
        fakebin = Path(self.temp.name) / 'fakebin'
        fakebin.mkdir()
        real_python = subprocess.check_output(['which', 'python3'], text=True).strip()
        wrapper = fakebin / 'python3'
        wrapper.write_text(
            '#!/bin/sh\n'
            'if [ "$1" = "-" ] && [ "$#" -eq 3 ]; then\n'
            '  printf broken > "$2"\n'
            'fi\n'
            f'exec "{real_python}" "$@"\n'
        )
        wrapper.chmod(0o755)
        result = self.build({'PATH': str(fakebin) + os.pathsep + os.environ['PATH']})
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('Refusing invalid theme ZIP', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def test_invalid_zip_does_not_create_first_release(self):
        fakebin = Path(self.temp.name) / 'fakebin'
        fakebin.mkdir()
        real_python = subprocess.check_output(['which', 'python3'], text=True).strip()
        wrapper = fakebin / 'python3'
        wrapper.write_text(
            '#!/bin/sh\n'
            'if [ "$1" = "-" ] && [ "$#" -eq 3 ]; then\n'
            '  printf broken > "$2"\n'
            'fi\n'
            f'exec "{real_python}" "$@"\n'
        )
        wrapper.chmod(0o755)
        result = self.build({'PATH': str(fakebin) + os.pathsep + os.environ['PATH']})
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertFalse(self.archive.exists())
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def build_with_modified_temporary_zip(self, python_code):
        fakebin = Path(self.temp.name) / 'fakebin'
        fakebin.mkdir(exist_ok=True)
        real_python = subprocess.check_output(['which', 'python3'], text=True).strip()
        wrapper = fakebin / 'python3'
        wrapper.write_text(
            '#!/bin/sh\n'
            'if [ "$1" = "-" ] && [ "$#" -eq 3 ]; then\n'
            f'  {shlex.quote(real_python)} -c {shlex.quote(python_code)} "$2"\n'
            'fi\n'
            f'exec {shlex.quote(real_python)} "$@"\n'
        )
        wrapper.chmod(0o755)
        return self.build({'PATH': str(fakebin) + os.pathsep + os.environ['PATH']})

    def test_bad_member_crc_preserves_previous_release(self):
        previous = self.prior_release()
        code = (
            'import sys; p=sys.argv[1]; '
            'f=open(p,"r+b"); data=f.read(); '
            'pos=data.index(b"PK\\x01\\x02"); '
            'f.seek(pos+16); f.write(bytes([data[pos+16]^1])); f.close()'
        )
        result = self.build_with_modified_temporary_zip(code)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('CRC mismatch', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)
        self.assertFalse(list(self.dist.glob('.slateframe.zip.*')))

    def test_duplicate_archive_member_is_rejected(self):
        previous = self.prior_release()
        code = (
            'import sys,zipfile,warnings; '
            'warnings.simplefilter("ignore", UserWarning); '
            'z=zipfile.ZipFile(sys.argv[1],"a"); '
            'z.writestr("slateframe/style.css",b"duplicate"); z.close()'
        )
        result = self.build_with_modified_temporary_zip(code)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('duplicate member names', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_archive_member_outside_theme_root_is_rejected(self):
        previous = self.prior_release()
        code = (
            'import sys,zipfile; '
            'z=zipfile.ZipFile(sys.argv[1],"a"); '
            'z.writestr("../private.txt",b"not-distributable"); z.close()'
        )
        result = self.build_with_modified_temporary_zip(code)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('unsafe archive member path', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_traversal_inside_theme_root_is_rejected(self):
        previous = self.prior_release()
        code = (
            'import sys,zipfile; '
            'z=zipfile.ZipFile(sys.argv[1],"a"); '
            'z.writestr("slateframe/../private.txt",b"bad"); z.close()'
        )
        result = self.build_with_modified_temporary_zip(code)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('unsafe archive member path', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_empty_path_component_in_written_zip_is_rejected(self):
        previous = self.prior_release()
        code = (
            'import sys,zipfile; '
            'z=zipfile.ZipFile(sys.argv[1],"a"); '
            'z.writestr("slateframe//extra.txt",b"bad"); z.close()'
        )
        result = self.build_with_modified_temporary_zip(code)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('unsafe archive member path', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_missing_required_file_in_written_zip_is_rejected(self):
        previous = self.prior_release()
        code = (
            'import sys,zipfile; '
            'z=zipfile.ZipFile(sys.argv[1],"w"); '
            'z.writestr("slateframe/style.css",b"only-one-file"); z.close()'
        )
        result = self.build_with_modified_temporary_zip(code)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertIn('missing required theme files in ZIP', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_archive_has_public_read_permissions(self):
        self.assertEqual(self.build().returncode, 0)
        self.assertEqual(self.archive.stat().st_mode & 0o777, 0o644)

    def test_existing_zip_symlink_is_replaced_without_following_target(self):
        self.dist.mkdir()
        outside = Path(self.temp.name) / 'outside-archive.zip'
        outside.write_bytes(b'never-overwrite-this-target')
        self.archive.symlink_to(outside)
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.archive.is_symlink())
        self.assertEqual(outside.read_bytes(), b'never-overwrite-this-target')
        with zipfile.ZipFile(self.archive) as archive:
            self.assertIn('slateframe/style.css', archive.namelist())

    def test_theme_stage_remains_for_ci_after_success(self):
        self.assertEqual(self.build().returncode, 0)
        self.assertEqual((self.dist / 'slateframe' / 'functions.php').read_text(), 'functions.php\n')


    def rewrite_written_zip(self, mutation):
        # Run after the writer, before the verifier, in a disposable fixture.
        code = (
            'import sys,zipfile,copy; from pathlib import Path\n'
            'p=Path(sys.argv[1])\n'
            'with zipfile.ZipFile(p,"r") as archive:\n'
            '  members=[(copy.copy(info),archive.read(info)) for info in archive.infolist()]\n'
            '  original_comment=archive.comment\n'
            + mutation + '\n'
            'with zipfile.ZipFile(p,"w") as archive:\n'
            '  for info,data in members: archive.writestr(info,data)\n'
            '  archive.comment=original_comment\n'
        )
        return self.build_with_modified_temporary_zip(code)

    def test_zip_extra_in_root_is_rejected_despite_valid_crc(self):
        previous = self.prior_release()
        result = self.build_with_modified_temporary_zip(
            'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],"a"); '
            'z.writestr("slateframe/injected.php",b"<?php exit; "); z.close()'
        )
        self.assertIn('ZIP members differ from validated staged theme', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_missing_nonrequired_staged_file_is_rejected(self):
        (self.root / 'additional.txt').write_text('important\n')
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'members=[(i,d) for i,d in members if i.filename!="slateframe/additional.txt"]'
        )
        self.assertIn('ZIP members differ from validated staged theme', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_replaced_content_with_valid_crc_is_rejected(self):
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'members=[(i,b"BAD CONTENT\\n" if i.filename=="slateframe/style.css" else d) for i,d in members]'
        )
        self.assertIn('ZIP content differs from staged file', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_replaced_same_length_content_is_rejected(self):
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'members=[(i,b"X"*len(d) if i.filename=="slateframe/style.css" else d) for i,d in members]'
        )
        self.assertIn('ZIP content differs from staged file', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_symlink_metadata_is_rejected(self):
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'for i,d in members:\n  if i.filename=="slateframe/style.css": i.external_attr=0o120777<<16'
        )
        self.assertIn('unexpected ZIP member mode', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_world_writable_mode_is_rejected(self):
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'for i,d in members:\n  if i.filename=="slateframe/style.css": i.external_attr=0o100777<<16'
        )
        self.assertIn('unexpected ZIP member mode', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_nonunix_creator_is_rejected(self):
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'for i,d in members:\n  if i.filename=="slateframe/style.css": i.create_system=0'
        )
        self.assertIn('unexpected ZIP member mode', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_unexpected_compression_is_rejected(self):
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'for i,d in members:\n  if i.filename=="slateframe/style.css": i.compress_type=zipfile.ZIP_STORED'
        )
        self.assertIn('unexpected ZIP compression', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_member_comment_is_rejected(self):
        previous = self.prior_release()
        result = self.rewrite_written_zip(
            'for i,d in members:\n  if i.filename=="slateframe/style.css": i.comment=b"unexpected"'
        )
        self.assertIn('unexpected ZIP member flags/comment', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_archive_comment_is_rejected(self):
        previous = self.prior_release()
        result = self.build_with_modified_temporary_zip(
            'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],"a"); '
            'z.comment=b"unexpected"; z.close()'
        )
        self.assertIn('unexpected ZIP archive comment', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_staged_file_modified_after_writer_is_rejected(self):
        previous = self.prior_release()
        result = self.build_with_modified_temporary_zip(
            'import sys,pathlib; p=pathlib.Path(sys.argv[1]); '
            'q=p.parent/"slateframe"/"style.css"; '
            'q.write_bytes(b"X"*q.stat().st_size)'
        )
        self.assertIn('ZIP content differs from staged file', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_encryption_flag_is_rejected_before_decompression(self):
        previous = self.prior_release()
        # Central-directory general purpose flag field starts at offset +8.
        code = (
            'import sys; p=sys.argv[1]; f=open(p,"r+b"); data=f.read(); '
            'pos=data.index(b"PK\\x01\\x02"); '
            'f.seek(pos+8); f.write(bytes([data[pos+8]|1])); f.close()'
        )
        result = self.build_with_modified_temporary_zip(code)
        self.assertIn('unexpected ZIP member flags/comment', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_staged_symlink_inserted_after_writer_is_rejected(self):
        previous = self.prior_release()
        result = self.build_with_modified_temporary_zip(
            'import sys,pathlib; p=pathlib.Path(sys.argv[1]); '
            '(p.parent/"slateframe"/"injected-link").symlink_to("/etc/hosts")'
        )
        self.assertIn('unsafe staged member during ZIP verification', result.stderr)
        self.assertEqual(self.archive.read_bytes(), previous)

    def test_zip_integrity_check_has_no_effect_on_repeatable_build(self):
        self.assertEqual(self.build().returncode, 0)
        first = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        self.assertEqual(self.build().returncode, 0)
        self.assertEqual(hashlib.sha256(self.archive.read_bytes()).hexdigest(), first)
        with zipfile.ZipFile(self.archive) as archive:
            self.assertEqual(archive.testzip(), None)


if __name__ == '__main__':
    unittest.main()
